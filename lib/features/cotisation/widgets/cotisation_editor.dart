import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/api_service.dart';
import '../models/cotisation_model.dart';
import '../providers/cotisation_provider.dart';

class CotisationEditor extends ConsumerStatefulWidget {
  final CotisationModel cot;
  const CotisationEditor({super.key, required this.cot});

  @override
  ConsumerState<CotisationEditor> createState() => _CotisationEditorState();
}

class _CotisationEditorState extends ConsumerState<CotisationEditor> {
  final _form = GlobalKey<FormState>();
  late final _title = TextEditingController(text: widget.cot.title);
  late final _description = TextEditingController(text: widget.cot.description);
  late final _amount = TextEditingController(
    text: widget.cot.targetAmount.toStringAsFixed(0),
  );
  bool _busy = false;
  bool _conflict = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ApiService.patch(
        '/api/cotisations/${widget.cot.id}',
        body: {
          'title': _title.text.trim(),
          'description': _description.text.trim(),
          'target_amount': int.parse(_amount.text.trim()),
          'expected_edit_version': widget.cot.editVersion,
        },
      );
      if (!mounted) return;
      ref.invalidate(cotisationByIdProvider(widget.cot.id));
      ref.invalidate(userCotisationsProvider);
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      if (e is ApiException && e.statusCode == 409) {
        ref.invalidate(cotisationByIdProvider(widget.cot.id));
        ref.invalidate(userCotisationsProvider);
        setState(() {
          _conflict = true;
          _error =
              'La cotisation a été modifiée ailleurs. Fermez ce formulaire et rouvrez-le pour partir de la dernière version.';
        });
      } else {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Modifier la cotisation'),
    content: SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _title,
              enabled: !_busy && !_conflict,
              maxLength: 160,
              decoration: const InputDecoration(labelText: 'Titre'),
              validator: (v) =>
                  (v ?? '').trim().isEmpty ? 'Titre requis' : null,
            ),
            TextFormField(
              controller: _description,
              enabled: !_busy && !_conflict,
              maxLength: 5000,
              maxLines: 3,
              decoration: const InputDecoration(labelText: 'Description'),
            ),
            TextFormField(
              controller: _amount,
              enabled: !_busy && !_conflict,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Objectif en FCFA'),
              validator: (v) {
                final amount = int.tryParse((v ?? '').trim());
                return amount == null || amount <= 0 || amount > 1000000000
                    ? 'Montant entier entre 1 et 1 000 000 000'
                    : null;
              },
            ),
            if (widget.cot.isCompleted)
              const Text(
                'Un objectif supérieur au total reçu permet de reprendre la collecte si la date limite est encore valide.',
              ),
            if (_error != null)
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: _busy ? null : () => Navigator.pop(context),
        child: const Text('Fermer'),
      ),
      FilledButton(
        onPressed: _busy || _conflict ? null : _save,
        child: Text(_busy ? 'Enregistrement…' : 'Enregistrer'),
      ),
    ],
  );
}
