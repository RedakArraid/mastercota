import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../providers/auth_provider.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/mastercota_logo.dart';

class PhoneScreen extends ConsumerStatefulWidget {
  const PhoneScreen({super.key});

  @override
  ConsumerState<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends ConsumerState<PhoneScreen> {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isDevLoading = false;
  bool _isInputFocused = false;

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

  // ── DEV ONLY — connexion directe sans OTP ──────────────
  Future<void> _devLogin() async {
    setState(() => _isDevLoading = true);
    try {
      try {
        await SupabaseService.client.auth.signInWithPassword(
          email: 'dev@mastercota.com',
          password: 'Mastercota2025!',
        );
      } on AuthException catch (ae) {
        final msg = ae.message.toLowerCase();
        if (msg.contains('invalid') || msg.contains('not found') || ae.statusCode == '400') {
          // L'utilisateur n'existe probablement pas, on tente de l'inscrire automatiquement
          final res = await SupabaseService.client.auth.signUp(
            email: 'dev@mastercota.com',
            password: 'Mastercota2025!',
          );
          
          if (res.user != null) {
            // S'assurer que le profil public existe dans la table public.users
            await SupabaseService.client.from('users').upsert({
              'id': res.user!.id,
              'name': 'Développeur MasterCota',
            });
            
            // Re-tenter la connexion si la session n'est pas auto-établie
            if (res.session == null) {
              await SupabaseService.client.auth.signInWithPassword(
                email: 'dev@mastercota.com',
                password: 'Mastercota2025!',
              );
            }
          } else {
            rethrow;
          }
        } else {
          rethrow;
        }
      }

      // S'assurer que la table publique public.users a bien le profil du dev
      final currentUser = SupabaseService.client.auth.currentUser;
      if (currentUser != null) {
        await SupabaseService.client.from('users').upsert({
          'id': currentUser.id,
          'name': 'Développeur MasterCota',
        });
      }

      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Dev login: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isDevLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: SizedBox(
                height: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.top - MediaQuery.of(context).padding.bottom - 20,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 40),

                    // Official Logo Vector
                    const Center(
                      child: MasterCotaLogo(
                        size: 80,
                        showText: true,
                        showTagline: false,
                      ),
                    )
                        .animate()
                        .scale(
                          duration: 600.ms,
                          curve: Curves.elasticOut,
                          begin: const Offset(0.6, 0.6),
                        )
                        .fadeIn(),

                    const SizedBox(height: 48),

                    Text('Mon numéro', style: AppTextStyles.displayMedium)
                        .animate()
                        .fadeIn(delay: 100.ms)
                        .slideX(begin: -0.05, end: 0, curve: Curves.easeOutCubic),

                    const SizedBox(height: 10),

                    Text(
                      'Nous vous envoyons un code de vérification\npar SMS pour sécuriser votre accès.',
                      style: AppTextStyles.bodyMedium.copyWith(height: 1.6),
                    ).animate().fadeIn(delay: 200.ms),

                    const SizedBox(height: 36),

                    // Phone input row with premium styling
                    FocusScope(
                      onFocusChange: (hasFocus) {
                        setState(() => _isInputFocused = hasFocus);
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceElevated,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _isInputFocused 
                                ? AppColors.primary 
                                : AppColors.border,
                            width: _isInputFocused ? 1.5 : 1.0,
                          ),
                          boxShadow: _isInputFocused
                              ? [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(alpha: 0.15),
                                    blurRadius: 12,
                                    spreadRadius: 1,
                                  ),
                                ]
                              : [],
                        ),
                        child: Row(
                          children: [
                            // Country code badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 18),
                              decoration: const BoxDecoration(
                                border: Border(
                                  right: BorderSide(color: AppColors.border),
                                ),
                              ),
                              child: Text(
                                '${AppConstants.defaultCountryFlag}  ${AppConstants.defaultCountryCode}',
                                style: AppTextStyles.titleMedium.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
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
                                style: AppTextStyles.bodyLarge.copyWith(
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 1.0,
                                ),
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
                                  if (v.trim().length != 10) {
                                    return 'Numéro invalide (doit contenir 10 chiffres)';
                                  }
                                  return null;
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1, end: 0),

                    const SizedBox(height: 12),

                    Row(
                      children: [
                        const Icon(
                          Icons.info_outline_rounded,
                          size: 13,
                          color: AppColors.textSecondary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '🇨🇮 Côte d\'Ivoire par défaut',
                          style: AppTextStyles.caption.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),

                    const Spacer(),

                    AppButton(
                      label: 'Recevoir le code SMS',
                      onPressed: _isLoading ? null : _sendOtp,
                      isLoading: _isLoading,
                    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1, end: 0),

                    const SizedBox(height: 16),

                    // ── Bouton dev (debug mode only) ────────
                    if (kDebugMode) ...[
                      GestureDetector(
                        onTap: _isDevLoading ? null : _devLogin,
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.3),
                            ),
                          ),
                          child: _isDevLoading
                              ? const Center(
                                  child: SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Text('🛠️',
                                        style: TextStyle(fontSize: 14)),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Mode Dev — Connexion rapide',
                                      style: AppTextStyles.caption.copyWith(
                                        color: AppColors.primary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                        ),
                      ).animate().fadeIn(delay: 450.ms),
                      const SizedBox(height: 16),
                    ],

                    Center(
                      child: Text(
                        'En continuant, vous acceptez nos CGU et notre\npolitique de confidentialité.',
                        style: AppTextStyles.caption.copyWith(height: 1.4),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
