import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../models/cotisation_model.dart';
import '../providers/cotisation_provider.dart';

class PublicContributionPage extends ConsumerStatefulWidget {
  final String slug;
  const PublicContributionPage({super.key, required this.slug});
  @override
  ConsumerState<PublicContributionPage> createState() =>
      _PublicContributionPageState();
}

class _PublicContributionPageState extends ConsumerState<PublicContributionPage>
    with WidgetsBindingObserver {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController(),
      _phone = TextEditingController(),
      _amount = TextEditingController(),
      _note = TextEditingController();
  String _requestId = const Uuid().v4();
  bool _opened = false, _signalled = false, _busy = false;
  bool _restoring = true;
  bool _submitted = false;
  String get _draftKey => 'wave_transfer_${widget.slug}';
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _restore();
  }

  Future<void> _restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_draftKey);
      if (raw != null) {
        final draft = jsonDecode(raw) as Map<String, dynamic>;
        if (!mounted) return;
        _requestId = draft['request_id'] as String;
        _name.text = draft['name'] as String;
        _phone.text = draft['phone'] as String;
        _amount.text = draft['amount'] as String;
        _note.text = draft['note'] as String? ?? '';
        _submitted = draft['submitted'] == true;
        _opened = true;
      }
    } catch (_) {
      /* An obsolete draft must not prevent opening the page. */
    }
    if (mounted) setState(() => _restoring = false);
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _draftKey,
      jsonEncode({
        'request_id': _requestId,
        'name': _name.text,
        'phone': _phone.text,
        'amount': _amount.text,
        'note': _note.text,
        'submitted': _submitted,
      }),
    );
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.invalidate(cotisationBySlugProvider(widget.slug));
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _name.dispose();
    _phone.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  String get _fullPhone {
    final value = _phone.text.replaceAll(RegExp(r'[\s()-]'), '');
    return RegExp(r'^0\d{9}$').hasMatch(value) ? '+225$value' : value;
  }

  void _message(String message) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> _open(CotisationModel cot) async {
    if (_busy ||
        !cot.isActive ||
        _submitted ||
        !_form.currentState!.validate()) {
      return;
    }
    setState(() => _busy = true);
    try {
      late final CotisationModel latest;
      try {
        final response = await ApiService.get(
          '/api/cotisations/by-slug/${widget.slug}',
        );
        latest = CotisationModel.fromJson(
          response['cotisation'] as Map<String, dynamic>,
        );
      } catch (_) {
        _message(
          'Impossible de vérifier les informations de paiement. Réessayez avant de transférer.',
        );
        return;
      }
      if (!mounted) return;
      final destinationChanged =
          latest.wavePayoutMode != cot.wavePayoutMode ||
          latest.wavePhone != cot.wavePhone ||
          latest.wavePayLink != cot.wavePayLink;
      final minimumChanged =
          int.parse(_amount.text.trim()) < latest.settings.minAmount;
      if (!latest.isActive ||
          !latest.hasWave ||
          destinationChanged ||
          minimumChanged) {
        ref.invalidate(cotisationBySlugProvider(widget.slug));
        _message(
          !latest.isActive
              ? 'La collecte est terminée. Aucun nouveau transfert ne doit être lancé.'
              : 'Les informations de paiement ont changé. Vérifiez les informations actualisées avant de réessayer.',
        );
        return;
      }
      try {
        await _persist();
      } catch (_) {
        _message('Impossible de sauvegarder ce transfert. Réessayez.');
        return;
      }
      if (!mounted) return;
      setState(() => _opened = true);
      final business =
          latest.wavePayoutMode == 'business' ||
          (latest.wavePayoutMode == null && latest.wavePayLink != null);
      try {
        if (business) {
          final uri = Uri.parse(
            latest.wavePayLink!,
          ).replace(queryParameters: {'amount': _amount.text.trim()});
          if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
            _message('Utilisez le lien Wave ci-dessous');
          }
        } else {
          await Clipboard.setData(ClipboardData(text: latest.wavePhone!));
          try {
            await launchUrl(
              Uri.parse('wave://'),
              mode: LaunchMode.externalApplication,
            );
          } catch (_) {
            /* Manual transfer instructions remain available. */
          }
          _message(
            'Numéro copié. Envoyez le montant dans Wave puis revenez ici.',
          );
        }
      } catch (_) {
        _message('Ouvrez Wave et utilisez les informations affichées');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signal(CotisationModel cot) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _submitted = true;
    });
    try {
      await _persist();
      await ApiService.post(
        '/api/cotisations/${cot.id}/contributions',
        body: {
          'contributor_name': _name.text.trim().isEmpty
              ? 'Anonyme'
              : _name.text.trim(),
          'contributor_phone': _fullPhone,
          'amount': int.parse(_amount.text.trim()),
          'note': _note.text.trim(),
          'request_id': _requestId,
        },
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftKey);
      if (mounted) setState(() => _signalled = true);
    } catch (e) {
      if (e is ApiException && e.statusCode < 500) {
        _submitted = false;
        await _persist();
      }
      _message(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.cream,
    appBar: AppBar(title: const Text('Contribuer')),
    body: _restoring
        ? const Center(child: CircularProgressIndicator())
        : ref
              .watch(cotisationBySlugProvider(widget.slug))
              .when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, st) => Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Cotisation indisponible'),
                      TextButton(
                        onPressed: () => ref.invalidate(
                          cotisationBySlugProvider(widget.slug),
                        ),
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
                ),
                data: (cot) {
                  if (cot == null) {
                    return const Center(child: Text('Cotisation introuvable'));
                  }
                  return ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      Text(
                        cot.title,
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                      if (cot.description != null) Text(cot.description!),
                      const SizedBox(height: 20),
                      if (cot.settings.showProgress) ...[
                        LinearProgressIndicator(value: cot.progressPercent),
                        const SizedBox(height: 8),
                        Text(
                          '${cot.currentAmount.toStringAsFixed(0)} FCFA collectés',
                        ),
                      ],
                      if (cot.settings.showTargetAmount)
                        Text(
                          'Objectif : ${cot.targetAmount.toStringAsFixed(0)} FCFA',
                        ),
                      const SizedBox(height: 24),
                      if (_signalled)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(20),
                            child: Column(
                              children: [
                                Icon(
                                  Icons.hourglass_top,
                                  color: AppColors.accent,
                                ),
                                SizedBox(height: 12),
                                Text('Paiement signalé'),
                                Text(
                                  'L’organisateur vérifiera la réception dans Wave avant de confirmer votre contribution.',
                                ),
                              ],
                            ),
                          ),
                        )
                      else if (!cot.isActive && !_opened)
                        const Text(
                          'Cette cotisation n’accepte plus de contributions.',
                        )
                      else if (!cot.hasWave && !_opened)
                        const Text(
                          'L’organisateur doit encore configurer Wave.',
                        )
                      else
                        Form(
                          key: _form,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                '0 % Mastercota sur votre contribution. Le paiement arrive directement chez l’organisateur.',
                              ),
                              const SizedBox(height: 16),
                              if (!cot.isActive)
                                const Text(
                                  'La collecte est terminée. Vous pouvez encore signaler le transfert déjà effectué pour que l’organisateur le vérifie.',
                                ),
                              TextFormField(
                                controller: _name,
                                enabled: !_opened && !_busy,
                                maxLength: 100,
                                decoration: InputDecoration(
                                  labelText: cot.settings.anonymousAllowed
                                      ? 'Nom (facultatif)'
                                      : 'Votre nom',
                                ),
                                validator: (s) =>
                                    !cot.settings.anonymousAllowed &&
                                        (s ?? '').trim().isEmpty
                                    ? 'Indiquez votre nom'
                                    : null,
                              ),
                              TextFormField(
                                controller: _phone,
                                enabled: !_opened && !_busy,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(
                                  labelText: 'Votre téléphone',
                                  hintText: '+2250700000000',
                                ),
                                validator: (s) =>
                                    RegExp(
                                      r'^\+[1-9]\d{7,14}$',
                                    ).hasMatch(_fullPhone)
                                    ? null
                                    : 'Numéro international invalide',
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _amount,
                                enabled: !_opened && !_busy,
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(
                                  labelText: 'Montant en FCFA',
                                ),
                                validator: (s) {
                                  final n = int.tryParse(s ?? '');
                                  return n == null || n <= 0 || n > 1000000000
                                      ? 'Montant entier positif requis'
                                      : n < cot.settings.minAmount
                                      ? 'Minimum : ${cot.settings.minAmount.toStringAsFixed(0)} FCFA'
                                      : null;
                                },
                              ),
                              if (!_opened) ...[
                                const SizedBox(height: 16),
                                Wrap(
                                  spacing: 8,
                                  children: [1000, 2000, 5000, 10000]
                                      .map(
                                        (n) => ActionChip(
                                          label: Text('$n F'),
                                          onPressed: _busy
                                              ? null
                                              : () => setState(
                                                  () => _amount.text = '$n',
                                                ),
                                        ),
                                      )
                                      .toList(),
                                ),
                                const SizedBox(height: 16),
                                FilledButton(
                                  onPressed: _busy ? null : () => _open(cot),
                                  child: const Text('Payer dans Wave'),
                                ),
                              ],
                              if (_opened) ...[
                                const SizedBox(height: 20),
                                Text(
                                  'Montant du transfert : ${_amount.text} FCFA',
                                  style: Theme.of(context).textTheme.titleLarge,
                                ),
                                if (cot.wavePhone != null)
                                  ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(cot.wavePhone!),
                                    subtitle: const Text(
                                      'Numéro de l’organisateur',
                                    ),
                                    trailing: IconButton(
                                      tooltip: 'Copier le numéro',
                                      icon: const Icon(Icons.copy),
                                      onPressed: () async {
                                        await Clipboard.setData(
                                          ClipboardData(text: cot.wavePhone!),
                                        );
                                        _message('Numéro copié');
                                      },
                                    ),
                                  ),
                                if (cot.isActive && !_submitted)
                                  OutlinedButton(
                                    onPressed: _busy ? null : () => _open(cot),
                                    child: const Text('Ouvrir Wave'),
                                  ),
                                const Text(
                                  'Après le transfert, revenez ici et signalez votre paiement.',
                                ),
                                TextFormField(
                                  controller: _note,
                                  enabled: !_submitted,
                                  maxLength: 500,
                                  decoration: const InputDecoration(
                                    labelText:
                                        'Note pour l’organisateur (facultatif)',
                                  ),
                                ),
                                FilledButton(
                                  onPressed: _busy ? null : () => _signal(cot),
                                  child: Text(_busy ? 'Envoi…' : 'J’ai payé'),
                                ),
                                if (cot.isActive && !_submitted)
                                  TextButton(
                                    onPressed: _busy
                                        ? null
                                        : () async {
                                            final prefs =
                                                await SharedPreferences.getInstance();
                                            await prefs.remove(_draftKey);
                                            if (mounted) {
                                              setState(() => _opened = false);
                                            }
                                          },
                                    child: const Text(
                                      'Modifier avant de payer',
                                    ),
                                  ),
                              ],
                            ],
                          ),
                        ),
                      if (cot.settings.showContributors ||
                          cot.settings.showBestContributor) ...[
                        const SizedBox(height: 24),
                        const Text('Contributions confirmées'),
                        ref
                            .watch(contributionsProvider(cot.id))
                            .when(
                              loading: () => const LinearProgressIndicator(),
                              error: (e, st) => const Text(
                                'Liste temporairement indisponible',
                              ),
                              data: (list) {
                                final paid = list
                                    .where((c) => c.isPaid)
                                    .toList();
                                if (paid.isEmpty) {
                                  return const Text(
                                    'Soyez le premier à contribuer.',
                                  );
                                }
                                return Column(
                                  children: paid
                                      .map(
                                        (c) => ListTile(
                                          contentPadding: EdgeInsets.zero,
                                          title: Text(c.contributorName),
                                          trailing: Text(
                                            '${c.amount.toStringAsFixed(0)} F',
                                          ),
                                        ),
                                      )
                                      .toList(),
                                );
                              },
                            ),
                      ],
                    ],
                  );
                },
              ),
  );
}
