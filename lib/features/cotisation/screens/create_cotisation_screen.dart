import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/cotisation_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import 'package:google_fonts/google_fonts.dart';

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

  // Toggle states
  bool _allowAnonymous = true;
  bool _showProgress = true;
  bool _showTopContributor = false;

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
        data: ThemeData.light().copyWith(
          colorScheme: const ColorScheme.light(
              primary: AppColors.ink, onPrimary: Colors.white),
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
            color: AppColors.paper,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppColors.line),
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
                      const Icon(Icons.account_balance_wallet_rounded, size: 18),
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

  // ── Toggle row ─────────────────────────────────────────────────
  Widget _toggleRow({
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool last = false,
  }) {
    return Container(
      decoration: last
          ? null
          : const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: AppColors.line, width: 1),
              ),
            ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.ink,
                fontSize: 13,
              ),
            ),
          ),
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.accent,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: Stack(
        children: [
          // ── Scrollable content ──────────────────────────────────
          SingleChildScrollView(
            padding: EdgeInsets.only(bottom: 120, top: topPadding),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Header ──────────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                    child: Row(
                      children: [
                        // Close button
                        GestureDetector(
                          onTap: () => context.canPop()
                              ? context.pop()
                              : context.go('/home'),
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
                                '✕',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.ink,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ),

                        // Center eyebrow
                        Expanded(
                          child: Center(
                            child: Text(
                              'NOUVELLE CAGNOTTE',
                              style: AppTextStyles.caption,
                            ),
                          ),
                        ),

                        // Draft button
                        GestureDetector(
                          onTap: () {},
                          child: SizedBox(
                            width: 68,
                            child: Text(
                              'Brouillon',
                              textAlign: TextAlign.end,
                              style: AppTextStyles.bodyMedium.copyWith(
                                color: AppColors.ink3,
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Title section ────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: 'Créez votre\n',
                                style: GoogleFonts.dmSans(
                                  fontSize: 30,
                                  fontWeight: FontWeight.w500,
                                  color: AppColors.ink,
                                  letterSpacing: -0.75,
                                  height: 1.05,
                                ),
                              ),
                              TextSpan(
                                text: 'cagnotte.',
                                style: AppTextStyles.serifItalic.copyWith(
                                  fontSize: 30,
                                  letterSpacing: -0.75,
                                  height: 1.05,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Quelques infos suffisent. Vous pourrez tout ajuster plus tard.',
                          style: AppTextStyles.bodyMedium.copyWith(
                            fontSize: 13,
                            color: AppColors.ink2,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ── Form fields ──────────────────────────────────
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Titre field
                        _field2(
                          label: 'Titre',
                          child: TextFormField(
                            controller: _titleController,
                            style: AppTextStyles.bodyLarge.copyWith(
                              fontSize: 16,
                              color: AppColors.ink,
                            ),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: EdgeInsets.only(top: 8, bottom: 4),
                              isDense: true,
                            ),
                            validator: (v) => v?.trim().isEmpty == true
                                ? 'Ce champ est requis'
                                : null,
                          ),
                        ),

                        const SizedBox(height: 22),

                        // Description field
                        _field2(
                          label: 'Description',
                          hint: '180 car. max',
                          child: TextFormField(
                            controller: _descriptionController,
                            maxLines: 2,
                            maxLength: 180,
                            style: AppTextStyles.bodyLarge.copyWith(
                              fontSize: 16,
                              color: AppColors.ink,
                            ),
                            decoration: const InputDecoration(
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: EdgeInsets.only(top: 8, bottom: 4),
                              isDense: true,
                              counterText: '',
                            ),
                          ),
                        ),

                        const SizedBox(height: 22),

                        // Objectif — big mono number
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'OBJECTIF',
                              style: AppTextStyles.caption,
                            ),
                            Container(
                              margin: const EdgeInsets.only(top: 10),
                              padding: const EdgeInsets.only(bottom: 12),
                              decoration: const BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                      color: AppColors.ink, width: 1),
                                ),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _amountController,
                                      keyboardType: TextInputType.number,
                                      inputFormatters: [
                                        FilteringTextInputFormatter.digitsOnly,
                                      ],
                                      style: AppTextStyles.mono.copyWith(
                                        fontSize: 36,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.ink,
                                        letterSpacing: -0.72,
                                      ),
                                      decoration: const InputDecoration(
                                        border: InputBorder.none,
                                        enabledBorder: InputBorder.none,
                                        focusedBorder: InputBorder.none,
                                        contentPadding: EdgeInsets.zero,
                                        isDense: true,
                                      ),
                                      validator: (v) {
                                        if (v?.trim().isEmpty == true) {
                                          return 'Ce champ est requis';
                                        }
                                        final n = double.tryParse(
                                            v!.trim().replaceAll(RegExp(r'\s'), ''));
                                        if (n == null || n <= 0) {
                                          return 'Montant invalide';
                                        }
                                        return null;
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'FCFA',
                                    style: AppTextStyles.mono.copyWith(
                                      fontSize: 14,
                                      color: AppColors.ink3,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Preset chips
                            SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.only(top: 12),
                              child: Row(
                                children: [
                                  for (final preset in [
                                    ('50 000', '50000'),
                                    ('100 000', '100000'),
                                    ('250 000', '250000'),
                                    ('500 000', '500000'),
                                    ('1 M', '1000000'),
                                  ]) ...[
                                    GestureDetector(
                                      onTap: () {
                                        _amountController.text = preset.$2;
                                      },
                                      child: Container(
                                        margin: const EdgeInsets.only(right: 8),
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: Colors.transparent,
                                          borderRadius: BorderRadius.circular(999),
                                          border: Border.all(color: AppColors.line),
                                        ),
                                        child: Text(
                                          '${preset.$1} F',
                                          style: AppTextStyles.mono.copyWith(
                                            fontSize: 11,
                                            color: AppColors.ink2,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 22),

                        // Échéance + Visibilité — 2-column
                        Row(
                          children: [
                            // Échéance
                            Expanded(
                              child: _field2(
                                label: 'Échéance',
                                child: GestureDetector(
                                  onTap: _pickDate,
                                  behavior: HitTestBehavior.opaque,
                                  child: Padding(
                                    padding: const EdgeInsets.only(top: 8),
                                    child: Row(
                                      children: [
                                        Text(
                                          _deadline != null
                                              ? '${_deadline!.day} ${_monthName(_deadline!.month)}'
                                              : '—',
                                          style: AppTextStyles.mono.copyWith(
                                            fontSize: 16,
                                            color: _deadline != null
                                                ? AppColors.ink
                                                : AppColors.ink3,
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
                            ),
                            const SizedBox(width: 14),
                            // Visibilité
                            Expanded(
                              child: _field2(
                                label: 'Visibilité',
                                child: Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Row(
                                    children: [
                                      Text(
                                        'Publique',
                                        style: AppTextStyles.bodyLarge.copyWith(
                                          fontSize: 16,
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
                          ],
                        ),

                        const SizedBox(height: 22),

                        // Toggle options
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.paper,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.line),
                          ),
                          clipBehavior: Clip.hardEdge,
                          child: Column(
                            children: [
                              _toggleRow(
                                label: 'Dons anonymes autorisés',
                                value: _allowAnonymous,
                                onChanged: (v) =>
                                    setState(() => _allowAnonymous = v),
                              ),
                              _toggleRow(
                                label: 'Afficher la barre de progression',
                                value: _showProgress,
                                onChanged: (v) =>
                                    setState(() => _showProgress = v),
                              ),
                              _toggleRow(
                                label: 'Mettre en avant le meilleur contributeur',
                                value: _showTopContributor,
                                onChanged: (v) =>
                                    setState(() => _showTopContributor = v),
                                last: true,
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 22),

                        // Fee note
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.accentSoft,
                            border: Border.all(color: AppColors.accentLine),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text.rich(
                            TextSpan(
                              style: AppTextStyles.bodySmall.copyWith(
                                fontSize: 12,
                                color: AppColors.accentDark,
                                height: 1.5,
                              ),
                              children: const [
                                TextSpan(
                                  text: 'Frais : 2,5 % ',
                                  style: TextStyle(fontWeight: FontWeight.w500),
                                ),
                                TextSpan(
                                  text:
                                      'par contribution. Aucun frais de création, aucun abonnement.',
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Sticky CTA bar ──────────────────────────────────────
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.ink,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Row(
                children: [
                  // Aperçu ghost button
                  SizedBox(
                    height: 50,
                    child: TextButton(
                      onPressed: () {},
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.paper,
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        'Aperçu',
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.paper,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Create button
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _create,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accent,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                'Créer la cagnotte →',
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
          ),
        ],
      ),
    );
  }

  String _monthName(int month) {
    const months = [
      'jan', 'fév', 'mar', 'avr', 'mai', 'juin',
      'juil', 'août', 'sep', 'oct', 'nov', 'déc',
    ];
    return months[month - 1];
  }
}
