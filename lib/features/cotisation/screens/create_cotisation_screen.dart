import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/cotisation_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/glass_card.dart';

class CreateCotisationScreen extends ConsumerStatefulWidget {
  const CreateCotisationScreen({super.key});

  @override
  ConsumerState<CreateCotisationScreen> createState() =>
      _CreateCotisationScreenState();
}

class _CreateCotisationScreenState
    extends ConsumerState<CreateCotisationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _amountController = TextEditingController();
  DateTime? _deadline;
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 7)),
      firstDate: now.add(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 365)),
      builder: (ctx, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: const ColorScheme.dark(primary: AppColors.primary),
        ),
        child: child!,
      ),
    );
    if (picked != null) setState(() => _deadline = picked);
  }

  Future<void> _create() async {
    if (!_formKey.currentState!.validate()) return;
    if (_deadline == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Choisissez une date limite'),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    // ── Vérification compte de versement ──
    final profile = ref.read(userProfileProvider).valueOrNull;
    final subaccountId = profile?['paystack_subaccount_id'] as String?;
    if (subaccountId == null || subaccountId.isEmpty) {
      if (!mounted) return;
      await _showNoSubaccountDialog();
      return;
    }

    setState(() => _isLoading = true);

    // Reset l'état d'erreur précédent pour permettre une nouvelle tentative
    ref.read(cotisationNotifierProvider.notifier).reset();

    final raw = _amountController.text.trim().replaceAll(RegExp(r'\s'), '');
    final result =
        await ref.read(cotisationNotifierProvider.notifier).createCotisation(
              title: _titleController.text.trim(),
              description: _descriptionController.text.trim().isEmpty
                  ? null
                  : _descriptionController.text.trim(),
              targetAmount: double.parse(raw),
              deadline: _deadline!,
            );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result.id != null) {
      // Invalider le cache de la liste pour qu'elle se rafraîchisse
      ref.invalidate(userCotisationsProvider);
      context.go('/cotisation/${result.id}');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result.error ?? 'Erreur lors de la création. Réessayez.'),
          backgroundColor: AppColors.error,
          duration: const Duration(seconds: 5),
        ),
      );
    }
  }

  Future<void> _showNoSubaccountDialog() async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 40,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                  border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.3), width: 2),
                ),
                child: const Icon(
                  Icons.account_balance_wallet_rounded,
                  color: AppColors.warning,
                  size: 40,
                ),
              ).animate().scale(duration: 400.ms, curve: Curves.elasticOut),

              const SizedBox(height: 20),

              Text(
                'Compte de versement requis',
                style: AppTextStyles.headlineMedium
                    .copyWith(fontWeight: FontWeight.w800),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                'Pour créer une cotisation et recevoir les paiements, vous devez d\'abord configurer votre compte de versement (Mobile Money ou banque).',
                textAlign: TextAlign.center,
                style: AppTextStyles.bodyMedium.copyWith(
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded,
                        color: AppColors.primary, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Les contributions reçues sont automatiquement versées sur votre compte après déduction des frais de service.',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.primary,
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.push('/profile/payout');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    elevation: 0,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.account_balance_wallet_rounded,
                          size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Configurer mon compte',
                        style: AppTextStyles.labelLarge
                            .copyWith(color: Colors.black, fontSize: 15),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: Text(
                  'Plus tard',
                  style: AppTextStyles.bodyMedium
                      .copyWith(color: AppColors.textSecondary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration:
            const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 16, 24, 0),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded,
                          size: 20),
                      onPressed: () {
                        if (context.canPop()) {
                          context.pop();
                        } else {
                          context.go('/home');
                        }
                      },
                      color: AppColors.textPrimary,
                    ),
                    Text('Nouvelle cotisation',
                        style: AppTextStyles.headlineLarge),
                  ],
                ),
              ),

              // Scrollable form
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Hero illustration
                        GlassCard(
                          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                          opacity: 0.05,
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: AppColors.primary.withValues(alpha: 0.3),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.ads_click_rounded,
                                  size: 32,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Définissez votre projet',
                                      style: AppTextStyles.titleLarge,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Créez une cagnotte transparente pour vos événements',
                                      style: AppTextStyles.bodySmall.copyWith(
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )
                            .animate()
                            .fadeIn(duration: 400.ms)
                            .slideY(
                                begin: -0.05,
                                end: 0,
                                duration: 400.ms,
                                curve: Curves.easeOut),

                        const SizedBox(height: 24),

                        // Form content wrapped in GlassCard
                        GlassCard(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              AppTextField(
                                controller: _titleController,
                                label: 'Titre de la cagnotte *',
                                hint: 'Ex: Mariage Koffi & Aminata',
                                prefixIcon: Icon(
                                  Icons.mode_edit_outline_outlined,
                                  color: AppColors.primary.withValues(alpha: 0.8),
                                  size: 20,
                                ),
                                validator: (v) => v?.trim().isEmpty == true
                                    ? 'Ce champ est requis'
                                    : null,
                              ),

                              const SizedBox(height: 20),

                              AppTextField(
                                controller: _descriptionController,
                                label: 'Description (optionnel)',
                                hint: 'Donnez plus de contexte à vos contributeurs…',
                                prefixIcon: const Icon(
                                  Icons.description_outlined,
                                  color: AppColors.textSecondary,
                                  size: 20,
                                ),
                                maxLines: 3,
                              ),

                              const SizedBox(height: 20),

                              AppTextField(
                                controller: _amountController,
                                label: 'Objectif financier *',
                                hint: '500 000',
                                suffixText: 'FCFA',
                                prefixIcon: Icon(
                                  Icons.payments_outlined,
                                  color: AppColors.primary.withValues(alpha: 0.8),
                                  size: 20,
                                ),
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                ],
                                validator: (v) {
                                  if (v?.trim().isEmpty == true) {
                                    return 'Ce champ est requis';
                                  }
                                  final n = double.tryParse(v!.trim());
                                  if (n == null || n <= 0) {
                                    return 'Montant invalide';
                                  }
                                  return null;
                                },
                              ),

                              const SizedBox(height: 20),

                              // Date picker
                              Text('Date limite *',
                                  style: AppTextStyles.labelLarge),
                              const SizedBox(height: 8),
                              GestureDetector(
                                onTap: _pickDate,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 16),
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceElevated,
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: AppColors.border),
                                  ),
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.calendar_month_rounded,
                                        color: _deadline != null
                                            ? AppColors.primary
                                            : AppColors.textSecondary,
                                        size: 20,
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        _deadline != null
                                            ? '${_deadline!.day.toString().padLeft(2, '0')}/${_deadline!.month.toString().padLeft(2, '0')}/${_deadline!.year}'
                                            : 'Choisir une date',
                                        style: _deadline != null
                                            ? AppTextStyles.bodyLarge
                                            : AppTextStyles.bodyLarge.copyWith(
                                                color: AppColors.textTertiary),
                                      ),
                                      const Spacer(),
                                      const Icon(Icons.chevron_right_rounded,
                                          color: AppColors.textTertiary),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

                        const SizedBox(height: 32),

                        AppButton(
                          label: 'Créer ma cotisation ✨',
                          onPressed: _isLoading ? null : _create,
                          isLoading: _isLoading,
                        ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                        const SizedBox(height: 40),
                      ],
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
}
