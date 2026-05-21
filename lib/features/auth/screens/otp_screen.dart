import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';
import '../providers/auth_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';

class OtpScreen extends ConsumerStatefulWidget {
  final String phone;
  const OtpScreen({super.key, required this.phone});

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final _otpController = TextEditingController();
  bool _isLoading = false;
  int _resendSeconds = 60;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _otpController.dispose();
    super.dispose();
  }

  void _startCountdown() {
    setState(() {
      _resendSeconds = 60;
      _canResend = false;
    });
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return false;
      setState(() {
        if (_resendSeconds > 0) _resendSeconds--;
        if (_resendSeconds == 0) _canResend = true;
      });
      return _resendSeconds > 0;
    });
  }

  Future<void> _verify() async {
    final otp = _otpController.text.trim();
    if (otp.length != 6) return;

    setState(() => _isLoading = true);
    final ok = await ref
        .read(authNotifierProvider.notifier)
        .verifyOtp(widget.phone, otp);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (ok) {
      context.go('/home');
    } else {
      _otpController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Code incorrect. Réessayez.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _resend() async {
    if (!_canResend) return;
    await ref.read(authNotifierProvider.notifier).sendOtp(widget.phone);
    _startCountdown();
  }

  @override
  Widget build(BuildContext context) {
    final defaultTheme = PinTheme(
      width: 50,
      height: 58,
      textStyle: AppTextStyles.headlineLarge.copyWith(
        fontWeight: FontWeight.bold,
        color: Colors.white,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
    );

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 20),

                IconButton(
                  icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                  onPressed: () => context.pop(),
                  color: AppColors.textPrimary,
                  padding: EdgeInsets.zero,
                ),

                const SizedBox(height: 32),

                Text('Code de vérification', style: AppTextStyles.displayMedium)
                    .animate()
                    .fadeIn(delay: 100.ms)
                    .slideX(begin: -0.06),

                const SizedBox(height: 12),

                RichText(
                  text: TextSpan(
                    style: AppTextStyles.bodyMedium.copyWith(height: 1.6),
                    children: [
                      const TextSpan(text: 'Code envoyé au '),
                      TextSpan(
                        text: widget.phone,
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms),

                const SizedBox(height: 48),

                Center(
                  child: Pinput(
                    controller: _otpController,
                    length: 6,
                    defaultPinTheme: defaultTheme,
                    focusedPinTheme: defaultTheme.copyWith(
                      decoration: defaultTheme.decoration!.copyWith(
                        border: Border.all(color: AppColors.primary, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            blurRadius: 12,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                    ),
                    submittedPinTheme: defaultTheme.copyWith(
                      decoration: defaultTheme.decoration!.copyWith(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        border: Border.all(color: AppColors.primary),
                      ),
                    ),
                    keyboardType: TextInputType.number,
                    animationCurve: Curves.easeInOut,
                    animationDuration: const Duration(milliseconds: 150),
                    onCompleted: (_) => _verify(),
                  ),
                ).animate().fadeIn(delay: 300.ms).scale(
                      begin: const Offset(0.95, 0.95),
                      duration: 400.ms,
                      curve: Curves.easeOut,
                    ),

                const SizedBox(height: 36),

                Center(
                  child: _canResend
                      ? TextButton(
                          onPressed: _resend,
                          child: Text(
                            'Renvoyer le code',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        )
                      : Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.03),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'Renvoyer dans $_resendSeconds s',
                            style: AppTextStyles.bodyMedium.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                ).animate().fadeIn(delay: 400.ms),

                const Spacer(),

                AppButton(
                  label: 'Vérifier',
                  onPressed: _isLoading ? null : _verify,
                  isLoading: _isLoading,
                ).animate().fadeIn(delay: 450.ms),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
