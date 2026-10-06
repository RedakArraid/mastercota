import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:uuid/uuid.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/fees.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/cotisation_model.dart';
import '../providers/cotisation_provider.dart';
import '../widgets/settings_fields.dart';

class CreateCotisationScreen extends ConsumerStatefulWidget {
  const CreateCotisationScreen({super.key});
  @override
  ConsumerState<CreateCotisationScreen> createState() =>
      _CreateCotisationScreenState();
}

class _CreateCotisationScreenState
    extends ConsumerState<CreateCotisationScreen> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _amount = TextEditingController();
  CotisationSettings _settings = const CotisationSettings();
  bool _busy = false, _ready = false, _free = false, _eligible = false;
  int _days = 35;
  String? _error, _draftKey;
  String _requestId = const Uuid().v4();
  bool _submitted = false;
  int get _fee => _free ? 0 : PlatformPricing.feeForDuration(_days) ?? 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final billing = await ApiService.get('/api/cotisations/billing-info');
      final profile = await ref.read(userProfileProvider.future);
      _draftKey = 'cotisation_draft_${profile?['id']}';
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_draftKey!);
      if (!mounted) return;
      setState(() {
        _eligible = billing['freeEligible'] == true;
        _free = _eligible;
        if (raw != null) {
          try {
            final draft = jsonDecode(raw) as Map<String, dynamic>;
            _requestId = draft['request_id'] as String? ?? _requestId;
            _submitted = draft['submitted'] == true;
            _title.text = draft['title'] ?? '';
            _description.text = draft['description'] ?? '';
            _amount.text = draft['amount'] ?? '';
            _days = (draft['days'] as int?) ?? 35;
            _free = (_eligible || _submitted) && draft['free'] == true;
            _settings = CotisationSettings.fromJson(
              draft['settings'] as Map<String, dynamic>?,
            );
          } catch (_) {
            /* Ignore obsolete local draft formats. */
          }
        }
        _ready = true;
        _error = null;
      });
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _amount.dispose();
    super.dispose();
  }

  void _message(String message) {
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    }
  }

  Future<void> _saveDraft({bool notify = true}) async {
    if (_draftKey == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _draftKey!,
      jsonEncode({
        'title': _title.text,
        'description': _description.text,
        'amount': _amount.text,
        'days': _days,
        'free': _free,
        'settings': _settings.toJson(),
        'request_id': _requestId,
        'submitted': _submitted,
      }),
    );
    if (notify) _message('Brouillon enregistré sur cet appareil');
  }

  Future<void> _create() async {
    if (!_form.currentState!.validate() || !_ready || _busy) return;
    setState(() {
      _busy = true;
      _submitted = true;
    });
    try {
      // Store the same request and payload before sending, including across app restarts.
      await _saveDraft(notify: false);
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _submitted = false;
        });
      }
      _message(
        'Impossible de sauvegarder la demande sur cet appareil. Réessayez.',
      );
      return;
    }
    final result = await ref
        .read(cotisationNotifierProvider.notifier)
        .createCotisation(
          requestId: _requestId,
          title: _title.text.trim(),
          description: _description.text.trim(),
          targetAmount: double.parse(_amount.text.trim()),
          durationDays: _free ? 35 : _days,
          useFree: _free,
          settings: _settings,
        );
    if (!mounted) return;
    setState(() => _busy = false);
    if (result.id == null) {
      if (!result.retryRequired) {
        setState(() => _submitted = false);
        await _saveDraft(notify: false);
      }
      _message(result.error ?? 'Création impossible');
      return;
    }
    final prefs = await SharedPreferences.getInstance();
    if (_draftKey != null) await prefs.remove(_draftKey!);
    ref.invalidate(userCotisationsProvider);
    if (!mounted) return;
    context.go('/cotisation/${result.id}');
    if (result.authorizationUrl != null) {
      try {
        await launchUrl(
          Uri.parse(result.authorizationUrl!),
          mode: LaunchMode.externalApplication,
        );
      } catch (_) {
        _message('Reprenez le paiement depuis la cotisation');
      }
    }
  }

  void _preview() {
    if (!_form.currentState!.validate()) return;
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(_title.text),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_description.text),
              const SizedBox(height: 16),
              Text('Objectif : ${_amount.text} FCFA'),
              Text('Durée : ${_free ? 35 : _days} jours'),
              Text('Frais organisateur : $_fee FCFA'),
              const Text(
                'Les contributions arrivent sur votre Wave. Vous confirmez leur réception.',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.cream,
    appBar: AppBar(
      title: const Text('Créer une cotisation'),
      actions: [
        IconButton(
          tooltip: 'Enregistrer le brouillon',
          onPressed: _ready && !_busy ? _saveDraft : null,
          icon: const Icon(Icons.save_outlined),
        ),
      ],
    ),
    body: !_ready
        ? Center(
            child: _error == null
                ? const CircularProgressIndicator()
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
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
                  'Un projet, un lien, vos proches.',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                if (_submitted)
                  const Text(
                    'Une demande est en attente de confirmation. Réessayez avec les mêmes informations pour retrouver la cotisation sans en créer une seconde.',
                  ),
                const Text(
                  'Configurez votre réception Wave avant de publier. Aucun pourcentage Mastercota sur les contributions.',
                ),
                TextButton(
                  onPressed: () => context.push('/profile/payout'),
                  child: const Text('Configurer Wave'),
                ),
                TextFormField(
                  controller: _title,
                  enabled: !_submitted,
                  maxLength: 160,
                  decoration: const InputDecoration(labelText: 'Titre'),
                  validator: (s) => s == null || s.trim().isEmpty
                      ? 'Indiquez un titre'
                      : null,
                ),
                TextFormField(
                  controller: _description,
                  enabled: !_submitted,
                  maxLength: 5000,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description'),
                ),
                TextFormField(
                  controller: _amount,
                  enabled: !_submitted,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Objectif en FCFA',
                  ),
                  validator: (s) {
                    final n = int.tryParse(s?.trim() ?? '');
                    return n == null || n <= 0 || n > 1000000000
                        ? 'Montant entier entre 1 et 1 000 000 000'
                        : null;
                  },
                ),
                const SizedBox(height: 24),
                if (_eligible)
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Première cotisation gratuite'),
                    subtitle: const Text('35 jours, une fois par numéro'),
                    value: _free,
                    onChanged: _submitted
                        ? null
                        : (v) => setState(() {
                            _free = v;
                            if (v) _days = 35;
                          }),
                  ),
                if (!_free)
                  DropdownButtonFormField<int>(
                    initialValue: _days,
                    decoration: const InputDecoration(labelText: 'Durée'),
                    items: const [
                      DropdownMenuItem(
                        value: 15,
                        child: Text('15 jours · 2 000 FCFA'),
                      ),
                      DropdownMenuItem(
                        value: 35,
                        child: Text('35 jours · 4 000 FCFA'),
                      ),
                      DropdownMenuItem(
                        value: 60,
                        child: Text('60 jours · 10 000 FCFA'),
                      ),
                    ],
                    onChanged: _submitted
                        ? null
                        : (v) => setState(() => _days = v ?? 35),
                  ),
                const SizedBox(height: 16),
                Text(
                  'Frais à payer : $_fee FCFA',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 16),
                ExpansionTile(
                  title: const Text('Affichage public'),
                  children: [
                    AbsorbPointer(
                      absorbing: _submitted,
                      child: SettingsFields(
                        value: _settings,
                        onChanged: (s) => setState(() => _settings = s),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                OutlinedButton(
                  onPressed: _busy ? null : _preview,
                  child: const Text('Aperçu'),
                ),
                FilledButton(
                  onPressed: _busy ? null : _create,
                  child: Text(
                    _busy
                        ? 'Création…'
                        : _submitted
                        ? 'Retrouver la cotisation'
                        : _free
                        ? 'Créer gratuitement'
                        : 'Créer et payer les frais',
                  ),
                ),
              ],
            ),
          ),
  );
}
