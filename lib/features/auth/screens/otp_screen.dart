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
      width: 48,
      height: 56,
      textStyle: AppTextStyles.mono.copyWith(
        fontSize: 28,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      ),
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.line),
      ),
    );

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 20),

              GestureDetector(
                onTap: () => context.pop(),
                child: Container(
                  width: 38, height: 38,
                  decoration: BoxDecoration(
                    color: AppColors.paper,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.line),
                  ),
                  child: const Center(child: Text('←', style: TextStyle(fontSize: 16))),
                ),
              ),

              const SizedBox(height: 24),

              Text('CONNEXION · 02', style: AppTextStyles.caption.copyWith(color: AppColors.ink3))
                  .animate().fadeIn(delay: 50.ms),

              const SizedBox(height: 12),

              RichText(
                text: TextSpan(
                  style: AppTextStyles.displayMedium.copyWith(
                    fontSize: 36, letterSpacing: -0.025 * 36, height: 1.02,
                  ),
                  children: [
                    const TextSpan(text: 'Code reçu ?\n'),
                    TextSpan(
                      text: 'Saisissez-le.',
                      style: AppTextStyles.serifItalic.copyWith(
                        fontSize: 36, letterSpacing: -0.025 * 36,
                      ),
                    ),
                  ],
                ),
              ).animate().fadeIn(delay: 100.ms).slideX(begin: -0.06),

              const SizedBox(height: 12),

              Text.rich(
                TextSpan(
                  style: AppTextStyles.bodyMedium.copyWith(height: 1.55, color: AppColors.ink2),
                  children: [
                    const TextSpan(text: 'Un SMS à 6 chiffres a été envoyé au '),
                    TextSpan(
                      text: widget.phone,
                      style: AppTextStyles.mono.copyWith(color: AppColors.ink, fontSize: 14),
                    ),
                    const TextSpan(text: '.'),
                  ],
                ),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 36),

              Center(
                child: Pinput(
                  controller: _otpController,
                  length: 6,
                  defaultPinTheme: defaultTheme,
                  focusedPinTheme: defaultTheme.copyWith(
                    decoration: defaultTheme.decoration!.copyWith(
                      border: Border.all(color: AppColors.ink, width: 1.5),
                    ),
                  ),
                  submittedPinTheme: defaultTheme.copyWith(
                    decoration: defaultTheme.decoration!.copyWith(
                      color: AppColors.paper,
                      border: Border.all(color: AppColors.line),
                    ),
                  ),
                  keyboardType: TextInputType.number,
                  animationCurve: Curves.easeInOut,
                  animationDuration: const Duration(milliseconds: 150),
                  onCompleted: (_) => _verify(),
                ),
              ).animate().fadeIn(delay: 300.ms).scale(begin: const Offset(0.95, 0.95), duration: 400.ms),

              const SizedBox(height: 22),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _canResend
                        ? 'Prêt à renvoyer'
                        : 'Renvoyer dans ${_resendSeconds.toString().padLeft(2, '0')}s',
                    style: AppTextStyles.bodySmall.copyWith(color: AppColors.ink3),
                  ),
                  GestureDetector(
                    onTap: _canResend ? _resend : null,
                    child: Text(
                      'Changer de numéro',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: _canResend ? AppColors.ink : AppColors.ink4,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ).animate().fadeIn(delay: 400.ms),

              const Spacer(),

              GestureDetector(
                onTap: _isLoading ? null : _verify,
                child: Container(
                  width: double.infinity,
                  height: 54,
                  decoration: BoxDecoration(
                    color: AppColors.accentBright,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: _isLoading
                        ? const SizedBox(width: 18, height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text('Vérifier →',
                            style: AppTextStyles.bodyLarge.copyWith(
                              color: Colors.white, fontWeight: FontWeight.w500)),
                  ),
                ),
              ).animate().fadeIn(delay: 450.ms),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
