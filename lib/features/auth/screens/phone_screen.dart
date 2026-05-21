import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';

class PhoneScreen extends ConsumerStatefulWidget {
  const PhoneScreen({super.key});

  @override
  ConsumerState<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends ConsumerState<PhoneScreen> {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  String get _fullPhone =>
      '${AppConstants.defaultCountryCode}${_phoneController.text.trim()}';

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    final ok =
        await ref.read(authNotifierProvider.notifier).sendOtp(_fullPhone);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (ok) {
      context.push('/auth/otp', extra: _fullPhone);
    } else {
      final err = ref.read(authNotifierProvider).error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: $err'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration:
            const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 48),

                  // Logo
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.45),
                          blurRadius: 24,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Center(
                      child: Text(
                        'M',
                        style: TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: Colors.black,
                        ),
                      ),
                    ),
                  ).animate().scale(
                        duration: 500.ms,
                        curve: Curves.elasticOut,
                        begin: const Offset(0.5, 0.5),
                      ),

                  const SizedBox(height: 44),

                  Text('Mon numéro', style: AppTextStyles.displayMedium)
                      .animate()
                      .fadeIn(delay: 100.ms)
                      .slideX(begin: -0.08, end: 0),

                  const SizedBox(height: 10),

                  Text(
                    'Nous vous envoyons un code de vérification\npar SMS. Aucun mot de passe à retenir.',
                    style:
                        AppTextStyles.bodyMedium.copyWith(height: 1.6),
                  ).animate().fadeIn(delay: 200.ms),

                  const SizedBox(height: 36),

                  // Phone input row
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        // Country code badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 18),
                          decoration: const BoxDecoration(
                            border: Border(
                              right: BorderSide(color: AppColors.border),
                            ),
                          ),
                          child: Text(
                            '${AppConstants.defaultCountryFlag}  ${AppConstants.defaultCountryCode}',
                            style: AppTextStyles.titleMedium,
                          ),
                        ),
                        // Number input
                        Expanded(
                          child: TextFormField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            style: AppTextStyles.bodyLarge,
                            autofocus: true,
                            decoration: const InputDecoration(
                              hintText: '07 00 00 00 00',
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              filled: false,
                              contentPadding: EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 18),
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) {
                                return 'Entrez votre numéro';
                              }
                              if (v.trim().length < 8) {
                                return 'Numéro invalide';
                              }
                              return null;
                            },
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.15),

                  const SizedBox(height: 10),

                  Text(
                    '🇨🇮  Côte d\'Ivoire — vous pouvez changer de pays plus tard',
                    style: AppTextStyles.caption,
                  ),

                  const Spacer(),

                  AppButton(
                    label: 'Recevoir le code SMS',
                    onPressed: _isLoading ? null : _sendOtp,
                    isLoading: _isLoading,
                  ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.15),

                  const SizedBox(height: 14),

                  Center(
                    child: Text(
                      'En continuant, vous acceptez nos CGU et notre\npolitique de confidentialité.',
                      style: AppTextStyles.caption,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
