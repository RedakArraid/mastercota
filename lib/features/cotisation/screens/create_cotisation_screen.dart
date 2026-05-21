import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/cotisation_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';

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

    setState(() => _isLoading = true);

    final raw = _amountController.text.trim().replaceAll(RegExp(r'\s'), '');
    final id =
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

    if (id != null) {
      context.go('/cotisation/$id');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Erreur lors de la création. Réessayez.'),
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
                      onPressed: () => context.pop(),
                      color: AppColors.textPrimary,
                    ),
                    Text('Nouvelle cotisation',
                        style: AppTextStyles.headlineMedium),
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
                        Container(
                          width: double.infinity,
                          height: 118,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                Color(0xFF667EEA),
                                Color(0xFF764BA2)
                              ],
                            ),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Center(
                            child: Text('🎯',
                                style: TextStyle(fontSize: 60)),
                          ),
                        )
                            .animate()
                            .fadeIn(duration: 400.ms)
                            .scale(
                                begin: const Offset(0.95, 0.95),
                                duration: 400.ms,
                                curve: Curves.easeOut),

                        const SizedBox(height: 28),

                        AppTextField(
                          controller: _titleController,
                          label: 'Titre *',
                          hint: 'Ex: Mariage Koffi & Aminata',
                          validator: (v) => v?.trim().isEmpty == true
                              ? 'Ce champ est requis'
                              : null,
                        ),

                        const SizedBox(height: 20),

                        AppTextField(
                          controller: _descriptionController,
                          label: 'Description (optionnel)',
                          hint: 'Donnez plus de contexte à vos contributeurs…',
                          maxLines: 3,
                        ),

                        const SizedBox(height: 20),

                        AppTextField(
                          controller: _amountController,
                          label: 'Objectif financier *',
                          hint: '500 000',
                          suffixText: 'FCFA',
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
                                horizontal: 16, vertical: 18),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceElevated,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.calendar_month_rounded,
                                    color: AppColors.textSecondary,
                                    size: 20),
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

                        const SizedBox(height: 16),

                        // Commission note
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: AppColors.primary.withValues(alpha: 0.2)),
                          ),
                          child: Row(
                            children: [
                              const Text('💡',
                                  style: TextStyle(fontSize: 16)),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  '1% de commission est prélevé automatiquement sur chaque contribution. Transparent pour tous.',
                                  style: AppTextStyles.bodySmall
                                      .copyWith(color: AppColors.primary),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 32),

                        AppButton(
                          label: 'Publier la cotisation 🚀',
                          onPressed: _isLoading ? null : _create,
                          isLoading: _isLoading,
                        ),

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
