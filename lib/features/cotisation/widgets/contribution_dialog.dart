import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/services/api_service.dart';
import '../providers/cotisation_provider.dart';

class ContributionDialog extends ConsumerStatefulWidget {
  final String cotisationId, cotisationTitle;
  const ContributionDialog({
    super.key,
    required this.cotisationId,
    required this.cotisationTitle,
  });
  static Future<void> show(
    BuildContext context, {
    required String cotisationId,
    required String cotisationTitle,
  }) => showDialog<void>(
    context: context,
    builder: (ctx) => ContributionDialog(
      cotisationId: cotisationId,
      cotisationTitle: cotisationTitle,
    ),
  );
  @override
  ConsumerState<ContributionDialog> createState() => _ContributionDialogState();
}

class _ContributionDialogState extends ConsumerState<ContributionDialog> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController(),
      _phone = TextEditingController(),
      _amount = TextEditingController(),
      _note = TextEditingController();
  String _requestId = const Uuid().v4();
  bool _busy = false;
  bool _restoring = true, _submitted = false;
  String? _error;
  String get _draftKey => 'manual_contribution_${widget.cotisationId}';
  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_draftKey);
      if (raw != null && mounted) {
        final draft = jsonDecode(raw) as Map<String, dynamic>;
        _requestId = draft['request_id'] as String;
        _name.text = draft['name'] as String;
        _phone.text = draft['phone'] as String;
        _amount.text = draft['amount'] as String;
        _note.text = draft['note'] as String;
        _submitted = draft['submitted'] == true;
      }
    } catch (_) {
      /* Ignore obsolete drafts. */
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
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || _restoring || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _submitted = true;
    });
    try {
      await _persist();
      await ApiService.post(
        '/api/cotisations/${widget.cotisationId}/contributions',
        body: {
          'contributor_name': _name.text.trim(),
          'contributor_phone': _phone.text.trim(),
          'amount': int.parse(_amount.text),
          'payment_method': 'manual',
          'note': _note.text.trim(),
          'request_id': _requestId,
        },
      );
      await (await SharedPreferences.getInstance()).remove(_draftKey);
      if (!mounted) return;
      ref.invalidate(cotisationByIdProvider(widget.cotisationId));
      ref.invalidate(contributionsProvider(widget.cotisationId));
      ref.invalidate(userCotisationsProvider);
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (e is ApiException && e.statusCode < 500) {
        _submitted = false;
        await _persist();
      }
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
    content: _restoring
        ? const SizedBox(
            height: 40,
            child: Center(child: CircularProgressIndicator()),
          )
        : SingleChildScrollView(
            child: Form(
              key: _form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Enregistrez uniquement un montant déjà reçu. Cette action ne déclenche aucun paiement.',
                  ),
                  if (_submitted)
                    const Text(
                      'Cette réception est en attente de confirmation. Réessayez pour retrouver son enregistrement sans le dupliquer.',
                    ),
                  TextFormField(
                    controller: _name,
                    enabled: !_submitted,
                    maxLength: 100,
                    decoration: const InputDecoration(labelText: 'Nom'),
                    validator: (s) =>
                        (s ?? '').trim().isEmpty ? 'Nom requis' : null,
                  ),
                  TextFormField(
                    controller: _phone,
                    enabled: !_submitted,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Téléphone international',
                      hintText: '+2250700000000',
                    ),
                    validator: (s) =>
                        RegExp(r'^\+[1-9]\d{7,14}$').hasMatch(s ?? '')
                        ? null
                        : 'Numéro international requis',
                  ),
                  TextFormField(
                    controller: _amount,
                    enabled: !_submitted,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Montant en FCFA',
                    ),
                    validator: (s) {
                      final n = int.tryParse(s ?? '');
                      return n == null || n <= 0 || n > 1000000000
                          ? 'Montant invalide'
                          : null;
                    },
                  ),
                  TextFormField(
                    controller: _note,
                    enabled: !_submitted,
                    maxLength: 500,
                    decoration: const InputDecoration(labelText: 'Note'),
                  ),
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ),
    actions: [
      TextButton(
        onPressed: _busy ? null : () => Navigator.pop(context),
        child: const Text('Annuler'),
      ),
      FilledButton(
        onPressed: _busy || _restoring ? null : _save,
        child: Text(_busy ? 'Enregistrement…' : 'Confirmer la réception'),
      ),
    ],
  );
}
