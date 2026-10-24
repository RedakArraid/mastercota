import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_constants.dart';
import '../../auth/providers/auth_provider.dart';

class PayoutSettingsScreen extends ConsumerStatefulWidget {
  const PayoutSettingsScreen({super.key});
  @override
  ConsumerState<PayoutSettingsScreen> createState() =>
      _PayoutSettingsScreenState();
}

class _PayoutSettingsScreenState extends ConsumerState<PayoutSettingsScreen> {
  final _form = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _link = TextEditingController();
  String _mode = 'phone';
  bool _ready = false, _saving = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/api/profile');
      final user = data['user'] as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _mode =
            user['wave_payout_mode'] as String? ??
            (user['wave_pay_link'] != null ? 'business' : 'phone');
        _phone.text =
            user['wave_phone'] as String? ?? user['phone'] as String? ?? '';
        _link.text = user['wave_pay_link'] as String? ?? '';
        _ready = true;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  void dispose() {
    _phone.dispose();
    _link.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ApiService.patch(
        '/api/profile',
        body: {
          'wave_payout_mode': _mode,
          'wave_phone': _mode == 'phone' ? _phone.text.trim() : null,
          'wave_pay_link': _mode == 'business' ? _link.text.trim() : null,
        },
      );
      ref.invalidate(userProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Réception Wave enregistrée')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.cream,
    appBar: AppBar(title: const Text('Recevoir les contributions')),
    body: !_ready
        ? Center(
            child: _error == null
                ? const CircularProgressIndicator()
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!),
                      TextButton(
                        onPressed: _load,
                        child: const Text('Réessayer'),
                      ),
                    ],
                  ),
          )
        : Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  'Les fonds restent chez vous.',                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Mastercota ne conserve pas l’argent de la cotisation. Aujourd’hui, les contributions sont reçues via Wave : vérifiez chaque transfert avant de le confirmer dans Mastercota.',
                ),
                const SizedBox(height: 24),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'phone', label: Text('Numéro Wave')),
                    ButtonSegment(
                      value: 'business',
                      label: Text('Wave Business'),
                    ),
                  ],
                  selected: {_mode},
                  onSelectionChanged: _saving
                      ? null
                      : (s) => setState(() => _mode = s.first),
                ),
                const SizedBox(height: 24),
                if (_mode == 'phone')
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Numéro Wave',
                      hintText: '+2250700000000',
                    ),
                    validator: (s) =>
                        RegExp(
                          r'^\+[1-9]\d{7,14}$',
                        ).hasMatch((s ?? '').replaceAll(' ', ''))
                        ? null
                        : 'Numéro international avec + et indicatif',
                  ),
                if (_mode == 'business') ...[
                  TextFormField(
                    controller: _link,
                    keyboardType: TextInputType.url,
                    decoration: const InputDecoration(
                      labelText: 'Lien Wave Business',
                      hintText: 'https://pay.wave.com/m/M_…/c/ci/',
                    ),
                    validator: (s) {
                      final u = Uri.tryParse(s?.trim() ?? '');
                      return u?.scheme == 'https' &&
                              u?.host == 'pay.wave.com' &&
                              RegExp(
                                r'^/m/M_[A-Za-z0-9_-]+(?:/c/[a-z]{2})?/?$',
                              ).hasMatch(u!.path)
                          ? null
                          : 'Collez votre lien de paiement Wave Business';
                    },
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Dans Wave Business, copiez votre lien de paiement marchand. Le montant sera prérempli pour vos contributeurs.',
                  ),
                  TextButton(
                    onPressed: () => launchUrl(
                      Uri.parse('${AppConstants.appBaseUrl}/comment-ca-marche'),
                      mode: LaunchMode.externalApplication,
                    ),
                    child: const Text('Comment ça marche'),
                  ),
                ],
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Enregistrement…' : 'Enregistrer'),
                ),
              ],
            ),
          ),
  );
}
