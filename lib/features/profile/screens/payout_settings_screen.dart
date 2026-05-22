import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../auth/providers/auth_provider.dart';

class PayoutSettingsScreen extends ConsumerStatefulWidget {
  const PayoutSettingsScreen({super.key});

  @override
  ConsumerState<PayoutSettingsScreen> createState() =>
      _PayoutSettingsScreenState();
}

class _PayoutSettingsScreenState extends ConsumerState<PayoutSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _accountController = TextEditingController();

  String _selectedProviderCode = 'WAVE_CI';
  bool _isLoading = false;
  bool _isEditing = false;
  bool _isVerified = false;
  bool _isVerifying = false;
  String? _verifiedName;

  final List<Map<String, String>> _providers = [
    {'name': 'Wave Côte d\'Ivoire', 'code': 'WAVE_CI', 'type': 'MM', 'color': '0xFF1E88E5'},
    {'name': 'MTN Côte d\'Ivoire', 'code': 'MTN_CI', 'type': 'MM', 'color': '0xFFFFB300'},
    {'name': 'Orange Côte d\'Ivoire', 'code': 'ORANGE_CI', 'type': 'MM', 'color': '0xFFF4511E'},
    {'name': 'Djamo', 'code': 'CI202', 'type': 'Bank', 'color': '0xFF3949AB'},
    {'name': 'Ecobank CI', 'code': 'CI059', 'type': 'Bank', 'color': '0xFF00897B'},
    {'name': 'Société Générale CI', 'code': 'CI008', 'type': 'Bank', 'color': '0xFFE53935'},
  ];

  @override
  void initState() {
    super.initState();
    _accountController.addListener(_onAccountChanged);
  }

  @override
  void dispose() {
    _accountController.removeListener(_onAccountChanged);
    _nameController.dispose();
    _accountController.dispose();
    super.dispose();
  }

  Map<String, String> get _selectedProvider {
    return _providers.firstWhere((p) => p['code'] == _selectedProviderCode);
  }

  // Réinitialise la vérification si l'utilisateur change le numéro ou l'opérateur
  void _onAccountChanged() {
    if (_isVerified) setState(() {
      _isVerified = false;
      _verifiedName = null;
    });
  }

  // Vérifie le numéro de compte via l'API Paystack
  Future<void> _verify() async {
    final account = _accountController.text.trim();
    if (account.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Saisissez d\'abord le numéro de compte')),
      );
      return;
    }
    setState(() => _isVerifying = true);
    HapticFeedback.selectionClick();
    try {
      final response = await SupabaseService.client.functions.invoke(
        'paystack-verify-account',
        body: {
          'account_number': account,
          'bank_code': _selectedProviderCode,
        },
      );
      if (response.status != 200) {
        throw Exception(response.data['error'] ?? 'Numéro invalide ou introuvable');
      }
      final name = response.data['account_name'] as String? ?? '';
      setState(() {
        _isVerified = true;
        _verifiedName = name;
        // Pré-remplir le nom si vide
        if (_nameController.text.trim().isEmpty) {
          _nameController.text = name;
        }
      });
      HapticFeedback.mediumImpact();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    try {
      final response = await SupabaseService.client.functions.invoke(
        'paystack-subaccount',
        body: {
          'business_name': _nameController.text.trim(),
          'settlement_bank': _selectedProviderCode,
          'account_number': _accountController.text.trim(),
        },
      );

      if (response.status != 200) {
        throw Exception(response.data['error'] ?? 'Erreur lors de la configuration');
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Compte de versement configuré avec succès !'),
            backgroundColor: AppColors.success,
          ),
        );
        setState(() {
          _isEditing = false;
          _isLoading = false;
          _isVerified = false;
          _verifiedName = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur : ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: AppColors.error,
          ),
        );
        setState(() => _isLoading = false);
      }
    }
  }

  // ── Field2 underline wrapper ──────────────────────────────────
  Widget _field2({
    required String label,
    String? hint,
    required Widget child,
  }) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.line, width: 1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label.toUpperCase(),
                style: AppTextStyles.caption,
              ),
              if (hint != null)
                Text(
                  hint,
                  style: AppTextStyles.caption.copyWith(fontSize: 10),
                ),
            ],
          ),
          child,
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(userProfileProvider);
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: profileAsync.when(
        data: (profile) {
          final subaccountId = profile?['paystack_subaccount_id'] as String?;
          final hasSubaccount = subaccountId != null && subaccountId.isNotEmpty;

          // Prefill name if empty
          if (_nameController.text.isEmpty && profile != null) {
            _nameController.text = profile['name'] ?? '';
          }

          if (hasSubaccount && !_isEditing) {
            return _buildConnectedState(subaccountId, topPadding);
          }

          return _buildFormState(hasSubaccount, topPadding);
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => Center(
          child: Text(
            'Erreur de chargement du profil',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.error),
          ),
        ),
      ),
    );
  }

  // ── Connected state (already has subaccount) ─────────────────
  Widget _buildConnectedState(String subaccountId, double topPadding) {
    return Stack(
      children: [
        SingleChildScrollView(
          padding: EdgeInsets.only(bottom: 100, top: topPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: () => context.canPop()
                          ? context.pop()
                          : context.go('/profile'),
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: const Center(
                          child: Text(
                            '←',
                            style: TextStyle(
                              fontSize: 16,
                              color: AppColors.ink,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Center(
                        child: Text(
                          'COMPTE DE VERSEMENT',
                          style: AppTextStyles.caption,
                        ),
                      ),
                    ),
                    const SizedBox(width: 38),
                  ],
                ),
              ),

              // Title
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: 'Où recevoir\n',
                            style: GoogleFonts.dmSans(
                              fontSize: 28,
                              fontWeight: FontWeight.w500,
                              color: AppColors.ink,
                              letterSpacing: -0.7,
                              height: 1.05,
                            ),
                          ),
                          TextSpan(
                            text: 'vos fonds ?',
                            style: AppTextStyles.serifItalic.copyWith(
                              fontSize: 28,
                              letterSpacing: -0.7,
                              height: 1.05,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),

              // Connected card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.paper,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'COMPTE DE VERSEMENT',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.ink3,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.forestSoft,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              'Actif',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.forest,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        subaccountId,
                        style: AppTextStyles.mono.copyWith(
                          fontSize: 13,
                          color: AppColors.ink2,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Paystack Subaccount',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.ink4,
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 100.ms).slideY(
                      begin: 0.05,
                      end: 0,
                      curve: Curves.easeOut,
                    ),
              ),
            ],
          ),
        ),

        // Sticky CTA — "Modifier"
        Positioned(
          bottom: 24,
          left: 16,
          right: 16,
          child: SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: () => setState(() => _isEditing = true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.paper,
                foregroundColor: AppColors.ink,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: AppColors.line),
                ),
              ),
              child: Text(
                'Modifier',
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.ink,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ── Form state (setup or editing) ────────────────────────────
  Widget _buildFormState(bool hasSubaccount, double topPadding) {
    final isMM = _selectedProvider['type'] == 'MM';

    return Form(
      key: _formKey,
      child: Stack(
        children: [
          SingleChildScrollView(
            padding: EdgeInsets.only(bottom: 100, top: topPadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => context.canPop()
                            ? context.pop()
                            : context.go('/profile'),
                        child: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: AppColors.paper,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.line),
                          ),
                          child: const Center(
                            child: Text(
                              '←',
                              style: TextStyle(
                                fontSize: 16,
                                color: AppColors.ink,
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Center(
                          child: Text(
                            'COMPTE DE VERSEMENT',
                            style: AppTextStyles.caption,
                          ),
                        ),
                      ),
                      const SizedBox(width: 38),
                    ],
                  ),
                ),

                // Title section
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: 'Où recevoir\n',
                              style: GoogleFonts.dmSans(
                                fontSize: 28,
                                fontWeight: FontWeight.w500,
                                color: AppColors.ink,
                                letterSpacing: -0.7,
                                height: 1.05,
                              ),
                            ),
                            TextSpan(
                              text: 'vos fonds ?',
                              style: AppTextStyles.serifItalic.copyWith(
                                fontSize: 28,
                                letterSpacing: -0.7,
                                height: 1.05,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Les contributions sont versées automatiquement sur ce compte sous 48 h ouvrées.',
                        style: AppTextStyles.bodyMedium.copyWith(
                          fontSize: 13,
                          color: AppColors.ink2,
                          height: 1.5,
                        ),
                      ),

                      // Warning box — only if no subaccount yet
                      if (!hasSubaccount && !_isEditing) ...[
                        const SizedBox(height: 22),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: const Color(0x14B8731A),
                            border: Border.all(
                              color: const Color(0x40B8731A),
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 18,
                                height: 18,
                                decoration: const BoxDecoration(
                                  color: AppColors.warn,
                                  shape: BoxShape.circle,
                                ),
                                child: const Center(
                                  child: Text(
                                    '!',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      height: 1,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text.rich(
                                  TextSpan(
                                    style: AppTextStyles.bodySmall.copyWith(
                                      fontSize: 12,
                                      color: AppColors.warn,
                                      height: 1.5,
                                    ),
                                    children: const [
                                      TextSpan(
                                        text: 'Configuration requise. ',
                                        style: TextStyle(
                                            fontWeight: FontWeight.w600),
                                      ),
                                      TextSpan(
                                        text:
                                            'Sans compte de versement, vous ne pourrez pas recevoir les fonds.',
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // Method selector
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('MÉTHODE', style: AppTextStyles.caption),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: _MethodCard(
                              name: 'Mobile Money',
                              sub: 'Wave · Orange · MTN · Moov',
                              active: _selectedProvider['type'] == 'MM',
                              onTap: () {
                                // Switch to first MM provider
                                final mmProvider = _providers.firstWhere(
                                  (p) => p['type'] == 'MM',
                                  orElse: () => _providers.first,
                                );
                                setState(() {
                                  _selectedProviderCode = mmProvider['code']!;
                                  _isVerified = false;
                                  _verifiedName = null;
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _MethodCard(
                              name: 'Compte bancaire',
                              sub: 'UBA · Ecobank · SGBCI · …',
                              active: _selectedProvider['type'] == 'Bank',
                              onTap: () {
                                // Switch to first Bank provider
                                final bankProvider = _providers.firstWhere(
                                  (p) => p['type'] == 'Bank',
                                  orElse: () => _providers.first,
                                );
                                setState(() {
                                  _selectedProviderCode =
                                      bankProvider['code']!;
                                  _isVerified = false;
                                  _verifiedName = null;
                                });
                              },
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Form fields — underline style
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
                  child: Column(
                    children: [
                      // Opérateur field
                      _field2(
                        label: 'Opérateur',
                        child: GestureDetector(
                          onTap: _showProviderPicker,
                          behavior: HitTestBehavior.opaque,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Row(
                              children: [
                                Container(
                                  width: 20,
                                  height: 20,
                                  decoration: BoxDecoration(
                                    color: Color(int.parse(
                                        _selectedProvider['color']!)),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _selectedProvider['name']!,
                                  style: AppTextStyles.bodyLarge.copyWith(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.ink,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  '▼',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: AppColors.ink3,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Account number field
                      _field2(
                        label: isMM ? 'Numéro Wave' : 'Numéro de compte',
                        hint: isMM ? 'Doit être à votre nom' : null,
                        child: TextFormField(
                          controller: _accountController,
                          keyboardType: isMM
                              ? TextInputType.phone
                              : TextInputType.text,
                          style: AppTextStyles.mono.copyWith(
                            fontSize: 16,
                            color: AppColors.ink,
                            letterSpacing: 0.01 * 16,
                          ),
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding:
                                EdgeInsets.only(top: 8, bottom: 4),
                            isDense: true,
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Veuillez saisir votre numéro de compte';
                            }
                            return null;
                          },
                        ),
                      ),

                      // Verified badge
                      if (_isVerified && _verifiedName != null) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.forestSoft,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                                color: AppColors.forest.withValues(alpha: 0.25)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_rounded,
                                  color: AppColors.forest, size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Compte vérifié : $_verifiedName',
                                  style: AppTextStyles.caption.copyWith(
                                    color: AppColors.forest,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      const SizedBox(height: 18),

                      // Beneficiary name field
                      _field2(
                        label: 'Nom du titulaire',
                        child: TextFormField(
                          controller: _nameController,
                          style: AppTextStyles.bodyLarge.copyWith(
                            fontSize: 16,
                            color: AppColors.ink,
                          ),
                          decoration: const InputDecoration(
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            contentPadding:
                                EdgeInsets.only(top: 8, bottom: 4),
                            isDense: true,
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) {
                              return 'Veuillez saisir le nom';
                            }
                            return null;
                          },
                        ),
                      ),

                      // Verify hint
                      if (!_isVerified) ...[
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.info_outline_rounded,
                                size: 12, color: AppColors.ink4),
                            const SizedBox(width: 4),
                            Text(
                              'Vérifiez d\'abord le numéro pour pouvoir enregistrer',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.ink4,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Sticky CTA bar
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Row(
              children: [
                // "Plus tard" button
                SizedBox(
                  height: 52,
                  child: OutlinedButton(
                    onPressed: () => context.canPop()
                        ? context.pop()
                        : context.go('/profile'),
                    style: OutlinedButton.styleFrom(
                      backgroundColor: AppColors.paper,
                      foregroundColor: AppColors.ink,
                      side: const BorderSide(color: AppColors.line),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding:
                          const EdgeInsets.symmetric(horizontal: 22),
                    ),
                    child: Text(
                      'Plus tard',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.ink,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // "Vérifier et enregistrer" button
                Expanded(
                  child: SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _isLoading
                          ? null
                          : (_isVerified ? _submit : _verify),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: _isLoading || _isVerifying
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : Text(
                              _isVerified
                                  ? 'Vérifier et enregistrer'
                                  : 'Vérifier le compte',
                              style: AppTextStyles.bodyMedium.copyWith(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showProviderPicker() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.paper,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'CHOISIR L\'OPÉRATEUR',
                  style: AppTextStyles.caption,
                ),
              ),
              const SizedBox(height: 8),
              for (final provider in _providers)
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 4),
                  leading: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Color(int.parse(provider['color']!)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  title: Text(
                    provider['name']!,
                    style: AppTextStyles.bodyLarge.copyWith(fontSize: 15),
                  ),
                  subtitle: Text(
                    provider['type'] == 'MM' ? 'Mobile Money' : 'Banque',
                    style: AppTextStyles.caption.copyWith(fontSize: 10),
                  ),
                  trailing: _selectedProviderCode == provider['code']
                      ? const Icon(Icons.check_circle_rounded,
                          color: AppColors.accent, size: 20)
                      : null,
                  onTap: () {
                    setState(() {
                      _selectedProviderCode = provider['code']!;
                      _isVerified = false;
                      _verifiedName = null;
                    });
                    Navigator.pop(ctx);
                  },
                ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}

// ── Method card widget ───────────────────────────────────────────
class _MethodCard extends StatelessWidget {
  final String name;
  final String sub;
  final bool active;
  final VoidCallback onTap;

  const _MethodCard({
    required this.name,
    required this.sub,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: active ? AppColors.ink : AppColors.paper,
          border: Border.all(
            color: active ? AppColors.ink : AppColors.line,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    name,
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: active ? AppColors.paper : AppColors.ink,
                    ),
                  ),
                ),
                Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: active
                          ? AppColors.accent
                          : AppColors.ink3,
                    ),
                    color: active ? AppColors.accent : Colors.transparent,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              sub,
              style: AppTextStyles.caption.copyWith(
                fontSize: 11,
                color: active
                    ? Colors.white.withValues(alpha: 0.55)
                    : AppColors.ink3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Simple color extension to darken colors
extension ColorUtils on Color {
  Color darken([double amount = .1]) {
    assert(amount >= 0 && amount <= 1);
    final hsv = HSVColor.fromColor(this);
    final hsvDark = hsv.withValue((hsv.value - amount).clamp(0.0, 1.0));
    return hsvDark.toColor();
  }
}
