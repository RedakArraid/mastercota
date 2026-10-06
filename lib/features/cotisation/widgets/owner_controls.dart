import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../models/cotisation_model.dart';
import '../providers/cotisation_provider.dart';
import 'settings_fields.dart';
import 'cotisation_editor.dart';

class OwnerControls extends ConsumerStatefulWidget {
  final CotisationModel cot;
  const OwnerControls({super.key, required this.cot});
  @override
  ConsumerState<OwnerControls> createState() => _OwnerControlsState();
}

class _OwnerControlsState extends ConsumerState<OwnerControls>
    with WidgetsBindingObserver {
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  void _invalidate() {
    if (!mounted) return;
    ref.invalidate(cotisationByIdProvider(widget.cot.id));
    ref.invalidate(contributionsProvider(widget.cot.id));
    ref.invalidate(userCotisationsProvider);
  }

  Future<void> _refresh() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final latest = await ApiService.get('/api/cotisations/${widget.cot.id}');
      final reference =
          (latest['cotisation']['platform_payment']?['reference'] ??
                  latest['cotisation']['platform_fee_reference'])
              as String?;
      if (reference != null) {
        final data = await ApiService.get(
          '/api/platform-payments/verify/$reference',
        );
        _paymentResult(data);
      }
    } catch (e) {
      _message(e.toString());
    } finally {
      _invalidate();
      if (mounted) setState(() => _busy = false);
    }
  }

  void _paymentResult(Map<String, dynamic> data) {
    final payment = data['payment'] as Map<String, dynamic>? ?? data;
    if (payment['application_status'] == 'review_required') {
      if (payment['review_resolved_at'] != null) {
        _message(
          'Examen terminé pour ce paiement. Le service n’a pas été appliqué. Consultez la réponse de l’assistance pour connaître la suite.',
        );
      } else {
        _message(
          'Paiement reçu, mais le service n’a pas été appliqué. Un examen est nécessaire. Ne payez pas une seconde fois.',
        );
      }
    } else if (payment['application_status'] == 'applied') {
      _message('Paiement confirmé et service appliqué.');
    }
  }

  void _message(String text) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(text.replaceFirst('Exception: ', ''))),
      );
    }
  }

  Future<void> _payment(String action) async {
    if (_busy) return;
    if (action == 'extend') {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Prolonger de 10 jours ?'),
          content: const Text(
            'Frais : 2 000 FCFA. Une seule prolongation, dans la limite totale de 60 jours.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Continuer'),
            ),
          ],
        ),
      );
      if (ok != true || !mounted) return;
    }
    setState(() => _busy = true);
    try {
      final data = await ApiService.post(
        '/api/cotisations/${widget.cot.id}/$action',
        body: {},
      );
      _invalidate();
      if (data['payment_required'] == false) {
        _paymentResult(data);
        return;
      }
      if (!await launchUrl(
        Uri.parse(data['authorization_url'] as String),
        mode: LaunchMode.externalApplication,
      )) {
        throw Exception('Ouverture impossible. Réessayez.');
      }
    } catch (e) {
      _message(e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _status(String status) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          status == 'closed'
              ? 'Clôturer la cotisation ?'
              : 'Rouvrir la cotisation ?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await ApiService.patch(
        '/api/cotisations/${widget.cot.id}',
        body: {'status': status},
      );
      _invalidate();
    } catch (e) {
      _message(e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm(ContributionModel contribution, String action) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          action == 'confirm'
              ? 'Paiement reçu dans Wave ?'
              : 'Refuser ce signalement ?',
        ),
        content: Text(
          '${contribution.contributorName} · ${contribution.amount.toStringAsFixed(0)} FCFA\n${contribution.contributorPhone}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await ApiService.post(
        '/api/contributions/${contribution.id}/$action',
        body: {},
      );
      _invalidate();
    } catch (e) {
      _message(e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cot = widget.cot;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (cot.paymentNeedsReview)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  'Paiement reçu, mais service non appliqué. Contactez l’assistance avec la référence du paiement. Ne payez pas une seconde fois.',
                ),
              ),
            ),
          if (cot.paymentReviewResolved) ...[
            const Card(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  'Examen terminé pour ce paiement. Le service n’a pas été appliqué. Consultez la réponse de l’assistance pour connaître la suite.',
                ),
              ),
            ),
            if ((cot.platformPayment?['review_resolution_note'] as String?)
                    ?.trim()
                    .isNotEmpty ==
                true)
              Text(cot.platformPayment!['review_resolution_note'] as String),
          ],
          if ((cot.paymentNeedsReview || cot.paymentReviewResolved) &&
              cot.platformPayment?['reference'] != null)
            SelectableText('Référence : ${cot.platformPayment!['reference']}'),
          if (cot.isPendingFee && !cot.paymentNeedsReview) ...[
            Text(
              'Frais en attente : ${cot.platformFee.toStringAsFixed(0)} FCFA',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const Text(
              'La page sera publiée après confirmation du paiement. Revenez dans l’application après le paiement.',
            ),
            FilledButton(
              onPressed: _busy ? null : () => _payment('pay-fee'),
              child: const Text('Payer les frais'),
            ),
          ],
          Wrap(
            spacing: 8,
            children: [
              OutlinedButton.icon(
                onPressed: _busy
                    ? null
                    : () => showDialog<void>(
                        context: context,
                        builder: (_) => CotisationEditor(cot: cot),
                      ),
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Modifier'),
              ),
              OutlinedButton.icon(
                onPressed: _busy ? null : _refresh,
                icon: const Icon(Icons.refresh),
                label: const Text('Actualiser'),
              ),
              if (cot.canExtend && !cot.paymentNeedsReview)
                OutlinedButton(
                  onPressed: _busy ? null : () => _payment('extend'),
                  child: const Text('Prolonger · 2 000 F'),
                ),
              if (cot.isActive)
                TextButton(
                  onPressed: _busy ? null : () => _status('closed'),
                  child: const Text('Clôturer'),
                ),
              if (cot.canReopen)
                TextButton(
                  onPressed: _busy ? null : () => _status('active'),
                  child: const Text('Rouvrir'),
                ),
            ],
          ),
          ref
              .watch(contributionsProvider(cot.id))
              .when(
                loading: () => const SizedBox.shrink(),
                error: (e, st) => const SizedBox.shrink(),
                data: (list) => Column(
                  children: list
                      .where((c) => c.status == 'awaiting_confirmation')
                      .map(
                        (c) => Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '${c.contributorName} · ${c.amount.toStringAsFixed(0)} F',
                                ),
                                Text(c.contributorPhone),
                                if (c.note?.isNotEmpty == true) Text(c.note!),
                                const Text('À vérifier dans Wave'),
                                Wrap(
                                  spacing: 8,
                                  children: [
                                    FilledButton(
                                      onPressed: _busy
                                          ? null
                                          : () => _confirm(c, 'confirm'),
                                      child: const Text('Reçu'),
                                    ),
                                    TextButton(
                                      onPressed: _busy
                                          ? null
                                          : () => _confirm(c, 'reject'),
                                      child: const Text('Refuser'),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
        ],
      ),
    );
  }
}

class SettingsEditor extends ConsumerStatefulWidget {
  final CotisationModel cot;
  const SettingsEditor({super.key, required this.cot});
  @override
  ConsumerState<SettingsEditor> createState() => _SettingsEditorState();
}

class _SettingsEditorState extends ConsumerState<SettingsEditor> {
  late CotisationSettings _settings;
  final _form = GlobalKey<FormState>();
  bool _busy = false;
  @override
  void initState() {
    super.initState();
    _settings = widget.cot.settings;
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(cotisationNotifierProvider.notifier)
          .updateSettings(
            widget.cot.id,
            _settings,
            editVersion: widget.cot.editVersion,
          );
      if (!mounted) return;
      ref.invalidate(cotisationByIdProvider(widget.cot.id));
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Paramètres enregistrés')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(20),
    child: Form(
      key: _form,
      child: Column(
        children: [
          SettingsFields(
            value: _settings,
            onChanged: (s) => setState(() => _settings = s),
          ),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(
              _busy ? 'Enregistrement…' : 'Enregistrer les paramètres',
            ),
          ),
        ],
      ),
    ),
  );
}
