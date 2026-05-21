import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../auth/providers/auth_provider.dart';

class PayoutSettingsScreen extends ConsumerStatefulWidget {
  const PayoutSettingsScreen({super.key});

  @override
  ConsumerState<PayoutSettingsScreen> createState() => _PayoutSettingsScreenState();
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
    if (_isVerified) setState(() { _isVerified = false; _verifiedName = null; });
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

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(userProfileProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Custom Header
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 16, 24, 0),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                      onPressed: () => context.pop(),
                      color: AppColors.textPrimary,
                    ),
                    Expanded(
                      child: Text(
                        'Compte de versement',
                        style: AppTextStyles.headlineLarge.copyWith(fontSize: 22),
                      ),
                    ),
                  ],
                ),
              ),

              Expanded(
                child: profileAsync.when(
                  data: (profile) {
                    final subaccountId = profile?['paystack_subaccount_id'] as String?;
                    final hasSubaccount = subaccountId != null && subaccountId.isNotEmpty;

                    // Prefill name if empty
                    if (_nameController.text.isEmpty && profile != null) {
                      _nameController.text = profile['name'] ?? '';
                    }

                    if (hasSubaccount && !_isEditing) {
                      return _buildConnectedState(subaccountId);
                    }

                    return _buildFormState();
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
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConnectedState(String subaccountId) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          // Success Glow Widget
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.success.withValues(alpha: 0.25), width: 2),
            ),
            child: const Icon(
              Icons.check_circle_outline_rounded,
              color: AppColors.success,
              size: 72,
            ),
          ).animate().scale(duration: 500.ms, curve: Curves.elasticOut),

          const SizedBox(height: 24),
          Text(
            'Versement Configuré',
            style: AppTextStyles.headlineLarge.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Text(
            'Vos fonds collectés seront transférés automatiquement sur ce compte de versement sous 2 jours ouvrés.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary, height: 1.5),
          ),

          const SizedBox(height: 36),

          // Paystack Card Mockup
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.border, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
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
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                    const Icon(Icons.payment_rounded, color: Colors.white, size: 24),
                  ],
                ),
                const SizedBox(height: 32),
                Text(
                  subaccountId,
                  style: AppTextStyles.displayMedium.copyWith(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 28),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Paystack Subaccount',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'Actif',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1, end: 0, curve: Curves.easeOut),

          const SizedBox(height: 48),

          AppButton(
            label: 'Modifier le compte',
            isSecondary: true,
            onPressed: () {
              setState(() {
                _isEditing = true;
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFormState() {
    final activeColorHex = _selectedProvider['color']!;
    final cardColor = Color(int.parse(activeColorHex));

    return Form(
      key: _formKey,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Enregistrez vos coordonnées pour recevoir automatiquement les fonds collectés sur vos cotisations.',
              style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary, height: 1.5),
            ),
            const SizedBox(height: 28),

            // Card Mockup dynamic styling
            Container(
              width: double.infinity,
              height: 160,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    cardColor.withValues(alpha: 0.85),
                    cardColor.darken(0.3),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withValues(alpha: 0.15), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: cardColor.withValues(alpha: 0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _selectedProvider['type'] == 'MM' ? 'MOBILE MONEY' : 'COMPTE BANCAIRE',
                        style: AppTextStyles.caption.copyWith(
                          color: Colors.white70,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        _selectedProvider['name']!,
                        style: AppTextStyles.titleMedium.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    _accountController.text.isNotEmpty
                        ? _accountController.text
                        : '•••• •••• •••• ••••',
                    style: AppTextStyles.headlineLarge.copyWith(
                      color: Colors.white,
                      letterSpacing: 2,
                      fontSize: 20,
                    ),
                  ),
                  Text(
                    _nameController.text.isNotEmpty
                        ? _nameController.text.toUpperCase()
                        : 'NOM DU BÉNÉFICIAIRE',
                    style: AppTextStyles.caption.copyWith(color: Colors.white70),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Name Input
            AppTextField(
              controller: _nameController,
              label: 'Nom du bénéficiaire (personne ou entreprise)',
              hint: 'Ex: Kader Sylla',
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Veuillez saisir le nom';
                }
                return null;
              },
            ),

            const SizedBox(height: 20),

            // Provider Dropdown
            Text('Opérateur / Banque', style: AppTextStyles.labelLarge),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedProviderCode,
                  isExpanded: true,
                  dropdownColor: AppColors.surface,
                  items: _providers.map((provider) {
                    return DropdownMenuItem<String>(
                      value: provider['code'],
                      child: Text(
                        provider['name']!,
                        style: AppTextStyles.bodyLarge,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedProviderCode = val;
                      });
                    }
                  },
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Account number input
            AppTextField(
              controller: _accountController,
              label: _selectedProvider['type'] == 'MM'
                  ? 'Numéro de Mobile Money'
                  : 'Numéro de compte (RIB / IBAN)',
              hint: _selectedProvider['type'] == 'MM' ? 'Ex: 0707080910' : 'Saisissez votre RIB complet',
              keyboardType: _selectedProvider['type'] == 'MM'
                  ? TextInputType.phone
                  : TextInputType.text,
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Veuillez saisir votre numéro de compte';
                }
                return null;
              },
            ),

            // Badge vérifié
            if (_isVerified && _verifiedName != null) ...[  
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded,
                        color: AppColors.success, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Compte vérifié : $_verifiedName',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.success,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 32),

            // Bouton de vérification
            if (!_isVerified)
              AppButton(
                label: _isVerifying ? 'Vérification...' : 'Vérifier le compte',
                icon: Icons.verified_outlined,
                isSecondary: true,
                isLoading: _isVerifying,
                onPressed: _verify,
              ),

            const SizedBox(height: 12),

            AppButton(
              label: 'Enregistrer le compte',
              icon: Icons.save_rounded,
              isLoading: _isLoading,
              onPressed: _isVerified ? _submit : null,
            ),

            if (!_isVerified) ...[  
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.info_outline_rounded,
                      size: 12, color: AppColors.textTertiary),
                  const SizedBox(width: 4),
                  Text(
                    'Vérifiez d\'abord le numéro pour pouvoir enregistrer',
                    style: AppTextStyles.caption.copyWith(
                        color: AppColors.textTertiary, fontSize: 10),
                  ),
                ],
              ),
            ],

            if (_isEditing) ...[
              const SizedBox(height: 12),
              AppButton(
                label: 'Annuler',
                isSecondary: true,
                onPressed: () {
                  setState(() {
                    _isEditing = false;
                  });
                },
              ),
            ],
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
