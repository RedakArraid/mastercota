import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';
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

class _PublicContributionPageState
    extends ConsumerState<PublicContributionPage> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController(),
      _phone = TextEditingController(),
      _amount = TextEditingController(),
      _note = TextEditingController();
  final _requestId = const Uuid().v4();
  bool _opened = false, _signalled = false, _busy = false;
  @override
  void dispose() {
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
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> _open(CotisationModel cot) async {
    if (!_form.currentState!.validate()) return;
    setState(() => _opened = true);
    final business = cot.wavePayoutMode == 'business' ||
        (cot.wavePayoutMode == null && cot.wavePayLink != null);
    try {
      if (business) {
        final uri = Uri.parse(cot.wavePayLink!)
            .replace(queryParameters: {'amount': _amount.text.trim()});
        if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
          _message('Utilisez le lien Wave ci-dessous');
        }
      } else {
        await Clipboard.setData(ClipboardData(text: cot.wavePhone!));
        try {
          await launchUrl(Uri.parse('wave://'),
              mode: LaunchMode.externalApplication);
        } catch (_) {/* Manual transfer instructions remain available. */}
        _message(
            'Numéro copié. Envoyez le montant dans Wave puis revenez ici.');
      }
    } catch (_) {
      _message('Ouvrez Wave et utilisez les informations affichées');
    }
  }

  Future<void> _signal(CotisationModel cot) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ApiService.post('/api/cotisations/${cot.id}/contributions', body: {
        'contributor_name':
            _name.text.trim().isEmpty ? 'Anonyme' : _name.text.trim(),
        'contributor_phone': _fullPhone,
        'amount': int.parse(_amount.text.trim()),
        'note': _note.text.trim(),
        'request_id': _requestId
      });
      if (mounted) setState(() => _signalled = true);
    } catch (e) {
      _message(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(title: const Text('Contribuer')),
      body: ref.watch(cotisationBySlugProvider(widget.slug)).when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, st) => Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                const Text('Cotisation indisponible'),
                TextButton(
                    onPressed: () =>
                        ref.invalidate(cotisationBySlugProvider(widget.slug)),
                    child: const Text('Réessayer'))
              ])),
          data: (cot) {
            if (cot == null) {
              return const Center(child: Text('Cotisation introuvable'));
            }
            return ListView(padding: const EdgeInsets.all(20), children: [
              Text(cot.title,
                  style: Theme.of(context).textTheme.headlineMedium),
              if (cot.description != null) Text(cot.description!),
              const SizedBox(height: 20),
              if (cot.settings.showProgress) ...[
                LinearProgressIndicator(value: cot.progressPercent),
                const SizedBox(height: 8),
                Text('${cot.currentAmount.toStringAsFixed(0)} FCFA collectés')
              ],
              if (cot.settings.showTargetAmount)
                Text('Objectif : ${cot.targetAmount.toStringAsFixed(0)} FCFA'),
              const SizedBox(height: 24),
              if (_signalled)
                const Card(
                    child: Padding(
                        padding: EdgeInsets.all(20),
                        child: Column(children: [
                          Icon(Icons.hourglass_top, color: AppColors.accent),
                          SizedBox(height: 12),
                          Text('Paiement signalé'),
                          Text(
                              'L’organisateur vérifiera la réception dans Wave avant de confirmer votre contribution.')
                        ])))
              else if (!cot.isActive)
                const Text('Cette cotisation n’accepte plus de contributions.')
              else if (!cot.hasWave)
                const Text('L’organisateur doit encore configurer Wave.')
              else
                Form(
                    key: _form,
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text(
                              '0 % Mastercota sur votre contribution. Le paiement arrive directement chez l’organisateur.'),
                          const SizedBox(height: 16),
                          TextFormField(
                              controller: _name,
                              enabled: !_opened,
                              maxLength: 100,
                              decoration: InputDecoration(
                                  labelText: cot.settings.anonymousAllowed
                                      ? 'Nom (facultatif)'
                                      : 'Votre nom'),
                              validator: (s) =>
                                  !cot.settings.anonymousAllowed &&
                                          (s ?? '').trim().isEmpty
                                      ? 'Indiquez votre nom'
                                      : null),
                          TextFormField(
                              controller: _phone,
                              enabled: !_opened,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                  labelText: 'Votre téléphone',
                                  hintText: '+2250700000000'),
                              validator: (s) => RegExp(r'^\+[1-9]\d{7,14}$')
                                      .hasMatch(_fullPhone)
                                  ? null
                                  : 'Numéro international invalide'),
                          const SizedBox(height: 12),
                          TextFormField(
                              controller: _amount,
                              enabled: !_opened,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                  labelText: 'Montant en FCFA'),
                              validator: (s) {
                                final n = int.tryParse(s ?? '');
                                return n == null || n <= 0 || n > 1000000000
                                    ? 'Montant entier positif requis'
                                    : n < cot.settings.minAmount
                                        ? 'Minimum : ${cot.settings.minAmount.toStringAsFixed(0)} FCFA'
                                        : null;
                              }),
                          if (!_opened) ...[
                            const SizedBox(height: 16),
                            Wrap(
                                spacing: 8,
                                children: [1000, 2000, 5000, 10000]
                                    .map((n) => ActionChip(
                                        label: Text('$n F'),
                                        onPressed: () => setState(
                                            () => _amount.text = '$n')))
                                    .toList()),
                            const SizedBox(height: 16),
                            FilledButton(
                                onPressed: () => _open(cot),
                                child: const Text('Payer dans Wave'))
                          ],
                          if (_opened) ...[
                            const SizedBox(height: 20),
                            Text('À envoyer : ${_amount.text} FCFA',
                                style: Theme.of(context).textTheme.titleLarge),
                            if (cot.wavePhone != null)
                              ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  title: Text(cot.wavePhone!),
                                  subtitle:
                                      const Text('Numéro de l’organisateur'),
                                  trailing: IconButton(
                                      tooltip: 'Copier le numéro',
                                      icon: const Icon(Icons.copy),
                                      onPressed: () async {
                                        await Clipboard.setData(ClipboardData(
                                            text: cot.wavePhone!));
                                        _message('Numéro copié');
                                      })),
                            OutlinedButton(
                                onPressed: () => _open(cot),
                                child: const Text('Ouvrir Wave')),
                            const Text(
                                'Après le transfert, revenez ici et signalez votre paiement.'),
                            TextFormField(
                                controller: _note,
                                maxLength: 500,
                                decoration: const InputDecoration(
                                    labelText:
                                        'Note pour l’organisateur (facultatif)')),
                            FilledButton(
                                onPressed: _busy ? null : () => _signal(cot),
                                child: Text(_busy ? 'Envoi…' : 'J’ai payé')),
                            TextButton(
                                onPressed: _busy
                                    ? null
                                    : () => setState(() => _opened = false),
                                child: const Text('Modifier avant de payer')),
                          ],
                        ])),
              if (cot.settings.showContributors ||
                  cot.settings.showBestContributor) ...[
                const SizedBox(height: 24),
                const Text('Contributions confirmées'),
                ref.watch(contributionsProvider(cot.id)).when(
                    loading: () => const LinearProgressIndicator(),
                    error: (e, st) =>
                        const Text('Liste temporairement indisponible'),
                    data: (list) {
                      final paid = list.where((c) => c.isPaid).toList();
                      if (paid.isEmpty) {
                        return const Text('Soyez le premier à contribuer.');
                      }
                      return Column(
                          children: paid
                              .map((c) => ListTile(
                                  contentPadding: EdgeInsets.zero,
                                  title: Text(c.contributorName),
                                  trailing:
                                      Text('${c.amount.toStringAsFixed(0)} F')))
                              .toList());
                    }),
              ],
            ]);
          }));
}
