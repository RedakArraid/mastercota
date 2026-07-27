import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../../core/constants/countries.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

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
  CountryDial _country = PaystackCountries.defaultCountry;

  String get _fullPhone => _country.e164(_phoneController.text.trim());

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

  Future<void> _devLogin() async {
    setState(() => _isDevLoading = true);
    try {
      final phone = _phoneController.text.trim().isEmpty
          ? PaystackCountries.defaultCountry.e164('0700000000')
          : _fullPhone;
      await ref.read(authNotifierProvider.notifier).sendOtp(phone);
      final ok = await ref
          .read(authNotifierProvider.notifier)
          .verifyOtp(phone, '123456');
      if (!mounted) return;
      if (ok) {
        context.go('/home');
      } else {
        throw Exception(
            ref.read(authNotifierProvider).error ?? 'Dev login échoué');
      }
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

  Future<void> _pickCountry() async {
    final selected = await showModalBottomSheet<CountryDial>(
      context: context,
      backgroundColor: AppColors.paper,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Text('Pays / indicatif', style: AppTextStyles.titleMedium),
              const SizedBox(height: 8),
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: PaystackCountries.all.length,
                  itemBuilder: (_, i) {
                    final c = PaystackCountries.all[i];
                    final active = c.iso == _country.iso;
                    return ListTile(
                      leading:
                          Text(c.flag, style: const TextStyle(fontSize: 22)),
                      title: Text(c.name),
                      subtitle: Text(c.dial),
                      trailing: active
                          ? const Icon(Icons.check_rounded,
                              color: AppColors.primary)
                          : null,
                      onTap: () => Navigator.pop(ctx, c),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
    if (selected != null && mounted) {
      setState(() {
        _country = selected;
        _phoneController.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Form(
            key: _formKey,
            child: SizedBox(
              height: MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top -
                  MediaQuery.of(context).padding.bottom -
                  20,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: AppColors.paper,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: const Center(
                          child: Text('←', style: TextStyle(fontSize: 16))),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'CONNEXION · 01',
                    style:
                        AppTextStyles.caption.copyWith(color: AppColors.ink3),
                  ).animate().fadeIn(delay: 50.ms),
                  const SizedBox(height: 12),
                  RichText(
                    text: TextSpan(
                      style: AppTextStyles.displayMedium.copyWith(
                        fontSize: 36,
                        letterSpacing: -0.025 * 36,
                        height: 1.02,
                      ),
                      children: [
                        const TextSpan(text: 'Votre numéro\n'),
                        TextSpan(
                          text: 'de téléphone.',
                          style: AppTextStyles.serifItalic.copyWith(
                            fontSize: 36,
                            letterSpacing: -0.025 * 36,
                          ),
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: 100.ms).slideX(
                      begin: -0.05, end: 0, curve: Curves.easeOutCubic),
                  const SizedBox(height: 12),
                  Text(
                    'Choisissez votre pays (défaut Côte d\'Ivoire), puis votre numéro. Un code WhatsApp vous sera envoyé.',
                    style: AppTextStyles.bodyMedium
                        .copyWith(height: 1.55, color: AppColors.ink2),
                  ).animate().fadeIn(delay: 200.ms),
                  const SizedBox(height: 40),
                  Text('NUMÉRO', style: AppTextStyles.caption),
                  const SizedBox(height: 10),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      GestureDetector(
                        onTap: _pickCountry,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.paper,
                            border: Border.all(color: AppColors.line),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(_country.flag,
                                  style: const TextStyle(fontSize: 18)),
                              const SizedBox(width: 6),
                              Text(_country.dial,
                                  style: AppTextStyles.mono
                                      .copyWith(fontSize: 14)),
                              const SizedBox(width: 4),
                              const Text('▼',
                                  style: TextStyle(
                                      fontSize: 9, color: AppColors.ink3)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(
                                _country.nationalLength),
                          ],
                          style: AppTextStyles.mono.copyWith(
                              fontSize: 22, fontWeight: FontWeight.w500),
                          autofocus: true,
                          decoration: InputDecoration(
                            hintText: _country.placeholder,
                            hintStyle: AppTextStyles.mono
                                .copyWith(fontSize: 22, color: AppColors.ink4),
                            border: const UnderlineInputBorder(
                              borderSide: BorderSide(color: AppColors.ink),
                            ),
                            enabledBorder: const UnderlineInputBorder(
                              borderSide: BorderSide(color: AppColors.ink),
                            ),
                            focusedBorder: const UnderlineInputBorder(
                              borderSide:
                                  BorderSide(color: AppColors.ink, width: 1.5),
                            ),
                            filled: false,
                            contentPadding:
                                const EdgeInsets.symmetric(vertical: 8),
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) {
                              return 'Entrez votre numéro';
                            }
                            if (!_country.isValidNational(v)) {
                              return 'Numéro invalide (${_country.nationalLength} chiffres)';
                            }
                            return null;
                          },
                        ),
                      ),
                    ],
                  ).animate().fadeIn(delay: 300.ms).slideY(begin: 0.1, end: 0),
                  const SizedBox(height: 8),
                  Text(
                    '${_country.flag} ${_country.name}',
                    style:
                        AppTextStyles.caption.copyWith(color: AppColors.ink3),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'En continuant, vous acceptez nos CGU et notre politique de confidentialité.',
                    style:
                        AppTextStyles.caption.copyWith(color: AppColors.ink3),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: _isLoading ? null : _sendOtp,
                    child: Container(
                      width: double.infinity,
                      height: 54,
                      decoration: BoxDecoration(
                        color: AppColors.accentBright,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Center(
                        child: _isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : Text('Recevoir le code →',
                                style: AppTextStyles.bodyLarge.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w500)),
                      ),
                    ),
                  ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1, end: 0),
                  const SizedBox(height: 16),
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
                  const SizedBox(height: 10),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
