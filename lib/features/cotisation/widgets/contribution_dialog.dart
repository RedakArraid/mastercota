import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/services/api_service.dart';
import '../providers/cotisation_provider.dart';

class ContributionDialog extends ConsumerStatefulWidget {
  final String cotisationId, cotisationTitle;
  const ContributionDialog(
      {super.key, required this.cotisationId, required this.cotisationTitle});
  static Future<void> show(BuildContext context,
          {required String cotisationId, required String cotisationTitle}) =>
      showDialog<void>(
          context: context,
          builder: (ctx) => ContributionDialog(
              cotisationId: cotisationId, cotisationTitle: cotisationTitle));
  @override
  ConsumerState<ContributionDialog> createState() => _ContributionDialogState();
}

class _ContributionDialogState extends ConsumerState<ContributionDialog> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController(),
      _phone = TextEditingController(),
      _amount = TextEditingController(),
      _note = TextEditingController();
  final _requestId = const Uuid().v4();
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ApiService.post(
          '/api/cotisations/${widget.cotisationId}/contributions',
          body: {
            'contributor_name': _name.text.trim(),
            'contributor_phone': _phone.text.trim(),
            'amount': int.parse(_amount.text),
            'payment_method': 'manual',
            'note': _note.text.trim(),
            'request_id': _requestId
          });
      ref.invalidate(cotisationByIdProvider(widget.cotisationId));
      ref.invalidate(contributionsProvider(widget.cotisationId));
      ref.invalidate(userCotisationsProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
          title: const Text('Ajouter une contribution reçue'),
          content: SingleChildScrollView(
              child: Form(
                  key: _form,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text(
                        'Enregistrez uniquement un montant déjà reçu. Cette action ne déclenche aucun paiement.'),
                    TextFormField(
                        controller: _name,
                        maxLength: 100,
                        decoration: const InputDecoration(labelText: 'Nom'),
                        validator: (s) =>
                            (s ?? '').trim().isEmpty ? 'Nom requis' : null),
                    TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                            labelText: 'Téléphone international',
                            hintText: '+2250700000000'),
                        validator: (s) =>
                            RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(s ?? '')
                                ? null
                                : 'Numéro international requis'),
                    TextFormField(
                        controller: _amount,
                        keyboardType: TextInputType.number,
                        decoration:
                            const InputDecoration(labelText: 'Montant en FCFA'),
                        validator: (s) {
                          final n = int.tryParse(s ?? '');
                          return n == null || n <= 0 || n > 1000000000
                              ? 'Montant invalide'
                              : null;
                        }),
                    TextFormField(
                        controller: _note,
                        maxLength: 500,
                        decoration: const InputDecoration(labelText: 'Note')),
                    if (_error != null)
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                  ]))),
          actions: [
            TextButton(
                onPressed: _busy ? null : () => Navigator.pop(context),
                child: const Text('Annuler')),
            FilledButton(
                onPressed: _busy ? null : _save,
                child:
                    Text(_busy ? 'Enregistrement…' : 'Confirmer la réception'))
          ]);
}
