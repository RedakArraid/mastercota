import 'package:flutter/material.dart';
import '../models/cotisation_model.dart';

class SettingsFields extends StatelessWidget {
  final CotisationSettings value;
  final ValueChanged<CotisationSettings> onChanged;
  const SettingsFields(
      {super.key, required this.value, required this.onChanged});
  @override
  Widget build(BuildContext context) => Column(children: [
        SwitchListTile(
            title: const Text('Contributions anonymes'),
            value: value.anonymousAllowed,
            onChanged: (v) => onChanged(value.copyWith(anonymousAllowed: v))),
        SwitchListTile(
            title: const Text('Afficher la progression'),
            value: value.showProgress,
            onChanged: (v) => onChanged(value.copyWith(showProgress: v))),
        SwitchListTile(
            title: const Text('Afficher l’objectif'),
            value: value.showTargetAmount,
            onChanged: (v) => onChanged(value.copyWith(showTargetAmount: v))),
        SwitchListTile(
            title: const Text('Afficher les contributeurs'),
            value: value.showContributors,
            onChanged: (v) => onChanged(value.copyWith(showContributors: v))),
        SwitchListTile(
            title: const Text('Afficher le meilleur contributeur'),
            value: value.showBestContributor,
            onChanged: (v) =>
                onChanged(value.copyWith(showBestContributor: v))),
        TextFormField(
            initialValue:
                value.minAmount == 0 ? '' : value.minAmount.toStringAsFixed(0),
            decoration:
                const InputDecoration(labelText: 'Minimum en FCFA (0 = aucun)'),
            keyboardType: TextInputType.number,
            validator: (s) => s != null &&
                    s.isNotEmpty &&
                    (int.tryParse(s) == null || int.parse(s) < 0)
                ? 'Montant entier positif requis'
                : null,
            onChanged: (s) =>
                onChanged(value.copyWith(minAmount: double.tryParse(s) ?? 0))),
        const SizedBox(height: 12),
        TextFormField(
            initialValue: value.shareMessage,
            maxLength: 1000,
            decoration: const InputDecoration(labelText: 'Message de partage'),
            onChanged: (s) => onChanged(value.copyWith(shareMessage: s))),
      ]);
}
