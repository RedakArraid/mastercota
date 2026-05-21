import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../../cotisation/providers/cotisation_provider.dart';
import '../../cotisation/models/cotisation_model.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
import '../widgets/cotisation_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotisationsAsync = ref.watch(userCotisationsProvider);
    final profileAsync = ref.watch(userProfileProvider);
    final phone = SupabaseService.currentUser?.phone ?? '';
    final formatter = NumberFormat('#,###', 'fr_FR');

    return Scaffold(
      backgroundColor: Colors.transparent, // Let background gradient show
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.primary,
          backgroundColor: AppColors.surface,
          onRefresh: () => ref.refresh(userCotisationsProvider.future),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── Header ─────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bonjour 👋',
                            style: AppTextStyles.bodyMedium.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            phone.isNotEmpty ? phone : 'Bienvenue',
                            style: AppTextStyles.headlineLarge.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                      GestureDetector(
                        onTap: () => context.push('/profile'),
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceElevated,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.person_rounded,
                              color: AppColors.primary,
                              size: 22,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ).animate().fadeIn(duration: 400.ms),
                ),
              ),

              // ── Bannière compte de versement ────────────────────────────
              SliverToBoxAdapter(
                child: profileAsync.maybeWhen(
                  data: (profile) {
                    final sub = profile?['paystack_subaccount_id'] as String?;
                    if (sub != null && sub.isNotEmpty) return const SizedBox.shrink();
                    return _PayoutWarningBanner()
                        .animate()
                        .fadeIn(delay: 100.ms)
                        .slideY(begin: -0.1, end: 0, curve: Curves.easeOut);
                  },
                  orElse: () => const SizedBox.shrink(),
                ),
              ),

              // ── Summary card ───────────────────────────────────────
              SliverToBoxAdapter(
                child: cotisationsAsync.when(
                  data: (list) => _SummaryCard(
                    list: list,
                    formatter: formatter,
                  ),
                  loading: () => _SummaryCardSkeleton(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              // ── Quick Actions ──────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                  child: Row(
                    children: [
                      Expanded(
                        child: _QuickActionButton(
                          icon: Icons.add_rounded,
                          label: 'Créer',
                          onTap: () => context.push('/cotisation/create'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _QuickActionButton(
                          icon: Icons.help_outline_rounded,
                          label: 'Comment ça marche',
                          onTap: () => _showHelpBottomSheet(context),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms),
              ),

              // ── Section title ───────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 14),
                  child: Row(
                    children: [
                      Text(
                        'Mes cotisations',
                        style: AppTextStyles.headlineMedium.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Little dot indicator
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ── List ────────────────────────────────────────
              cotisationsAsync.when(
                data: (list) {
                  if (list.isEmpty) {
                    return SliverToBoxAdapter(
                      child: _EmptyState(),
                    );
                  }
                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 120), // Large bottom padding for Floating Navigation Bar
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 18),
                          child: CotisationCard(
                            cotisation: list[i],
                            animIndex: i,
                            onTap: () => context.push('/cotisation/${list[i].id}'),
                          ),
                        ),
                        childCount: list.length,
                      ),
                    ),
                  );
                },
                loading: () => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(52),
                    child: Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(3, (i) {
                          return Container(
                            width: 6,
                            height: 6,
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                          )
                              .animate(
                                delay: Duration(milliseconds: i * 150),
                                onPlay: (c) => c.repeat(reverse: true),
                              )
                              .scaleXY(
                                begin: 0.4,
                                end: 1.2,
                                duration: 600.ms,
                                curve: Curves.easeInOut,
                              );
                        }),
                      ),
                    ),
                  ),
                ),
                error: (e, _) => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        'Erreur de chargement : $e',
                        style: AppTextStyles.bodyMedium.copyWith(color: AppColors.error),
                        textAlign: TextAlign.center,
                      ),
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

// ── Summary card ─────────────────────────────────────────────

class _SummaryCard extends StatelessWidget {
  final List<CotisationModel> list;
  final NumberFormat formatter;

  const _SummaryCard({required this.list, required this.formatter});

  @override
  Widget build(BuildContext context) {
    final total = list.fold<double>(0, (s, c) => s + c.currentAmount);
    final active = list.where((c) => c.isActive).length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
      child: GlassCard(
        padding: const EdgeInsets.all(24),
        opacity: 0.08,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Total collecté',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              '${formatter.format(total)} FCFA',
              style: AppTextStyles.displayLarge.copyWith(
                color: AppColors.primary,
                fontSize: 30,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                _Pill(
                  icon: Icons.bolt_rounded,
                  label: '$active active${active > 1 ? 's' : ''}',
                  isGold: true,
                ),
                const SizedBox(width: 10),
                _Pill(
                  icon: Icons.list_alt_rounded,
                  label: '${list.length} au total',
                  isGold: false,
                ),
              ],
            ),
          ],
        ),
      ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.1, end: 0, curve: Curves.easeOutCubic),
    );
  }
}

class _Pill extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isGold;
  const _Pill({required this.icon, required this.label, required this.isGold});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final Color labelColor;
    final Color iconColor;
    final Color bgColor;
    final Color borderColor;

    if (isGold) {
      iconColor = AppColors.primary;
      labelColor = isDark ? Colors.white : AppColors.primaryDark;
      bgColor = AppColors.primary.withValues(alpha: isDark ? 0.15 : 0.08);
      borderColor = AppColors.primary.withValues(alpha: isDark ? 0.3 : 0.25);
    } else {
      iconColor = AppColors.textSecondary;
      labelColor = AppColors.textSecondary;
      bgColor = isDark 
          ? Colors.white.withValues(alpha: 0.04) 
          : const Color(0xFFF1F5F9);
      borderColor = isDark 
          ? AppColors.border 
          : const Color(0xFFE2E8F0);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: borderColor,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconColor),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: labelColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryCardSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
      child: Container(
        height: 140,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border),
        ),
      )
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .shimmer(duration: 1200.ms, color: AppColors.borderLight),
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 120),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Onboarding card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surface : Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark ? AppColors.border : const Color(0xFFE2E8F0),
              ),
              boxShadow: isDark
                  ? null
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.02),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
            ),
            child: Column(
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text(
                      '✨',
                      style: TextStyle(fontSize: 36),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Prêt pour votre première collecte ?',
                  style: AppTextStyles.headlineMedium.copyWith(
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Créez une cotisation, partagez le lien avec votre communauté et recevez les fonds directement.',
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.push('/cotisation/create'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 52),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.add_rounded, size: 22, color: Colors.white),
                      const SizedBox(width: 8),
                      Text(
                        'Créer une cotisation',
                        style: AppTextStyles.bodyLarge.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 200.ms).scale(
                begin: const Offset(0.96, 0.96),
                duration: 400.ms,
                curve: Curves.easeOutBack,
              ),
          
          const SizedBox(height: 32),
          
          // Guide title
          Row(
            children: [
              Text(
                'Guide de démarrage',
                style: AppTextStyles.headlineMedium.copyWith(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ).animate().fadeIn(delay: 300.ms),
          
          const SizedBox(height: 16),
          
          // Onboarding Steps
          _OnboardingStep(
            number: '1',
            title: 'Configurez la cagnotte',
            subtitle: 'Donnez un nom, un but, et choisissez un objectif financier.',
            icon: Icons.edit_note_rounded,
            delayMs: 350,
          ),
          const SizedBox(height: 12),
          _OnboardingStep(
            number: '2',
            title: 'Partagez sur WhatsApp',
            subtitle: 'Les participants cliquent sur le lien pour payer par Mobile Money.',
            icon: Icons.share_rounded,
            delayMs: 400,
          ),
          const SizedBox(height: 12),
          _OnboardingStep(
            number: '3',
            title: 'Suivez le statut de chacun',
            subtitle: 'Consultez la liste et relancez les personnes qui ont oublié.',
            icon: Icons.insights_rounded,
            delayMs: 450,
          ),
        ],
      ),
    );
  }
}

class _OnboardingStep extends StatelessWidget {
  final String number;
  final String title;
  final String subtitle;
  final IconData icon;
  final int delayMs;

  const _OnboardingStep({
    required this.number,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.delayMs,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevated : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.border : const Color(0xFFF1F5F9),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$number. $title',
                  style: AppTextStyles.bodyMedium.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: delayMs.ms).slideX(begin: 0.05, end: 0, curve: Curves.easeOutCubic);
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceElevated : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? AppColors.border : const Color(0xFFE2E8F0),
          ),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 20,
              color: AppColors.primary,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: AppTextStyles.bodyMedium.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void _showHelpBottomSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (context) {
      final theme = Theme.of(context);
      final isDark = theme.brightness == Brightness.dark;

      return Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF0C1424) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          border: Border(
            top: BorderSide(
              color: isDark ? AppColors.border : const Color(0xFFE2E8F0),
            ),
          ),
        ),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? Colors.white24 : Colors.black12,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Comment fonctionne MasterCota ? 💡',
              style: AppTextStyles.headlineMedium.copyWith(
                fontWeight: FontWeight.w800,
                fontSize: 20,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Simplifiez la gestion et la collecte de vos fonds communautaires en 3 étapes simples.',
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            _buildHelpStep(
              number: '1',
              title: 'Créez votre cotisation',
              description:
                  'Définissez le titre, la description et l\'objectif financier (ex: Cadeau Mariage, Tontine).',
              icon: Icons.add_task_rounded,
            ),
            const SizedBox(height: 18),
            _buildHelpStep(
              number: '2',
              title: 'Partagez le lien de paiement',
              description:
                  'Partagez le lien sécurisé généré automatiquement par SMS, e-mail ou directement sur WhatsApp.',
              icon: Icons.share_rounded,
            ),
            const SizedBox(height: 18),
            _buildHelpStep(
              number: '3',
              title: 'Suivez et relancez',
              description:
                  'Visualisez les contributeurs en temps réel et envoyez des rappels personnalisés aux retardataires.',
              icon: Icons.analytics_rounded,
            ),
          ],
        ),
      );
    },
  );
}

Widget _buildHelpStep({
  required String number,
  required String title,
  required String description,
  required IconData icon,
}) {
  return Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Text(
            number,
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w800,
              fontSize: 16,
            ),
          ),
        ),
      ),
      const SizedBox(width: 16),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: AppTextStyles.bodyLarge.copyWith(
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              description,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.textSecondary,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

// ── Payout warning banner ──────────────────────────────────

class _PayoutWarningBanner extends StatelessWidget {
  const _PayoutWarningBanner();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/profile/payout'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(24, 16, 24, 0),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.warning.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: AppColors.warning.withValues(alpha: 0.3),
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.account_balance_wallet_rounded,
                color: AppColors.warning,
                size: 22,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Compte de versement requis',
                    style: AppTextStyles.bodySmall.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppColors.warning,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Configurez votre compte pour recevoir les fonds de vos cotisations.',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.warning.withValues(alpha: 0.8),
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(
              Icons.arrow_forward_ios_rounded,
              color: AppColors.warning,
              size: 14,
            ),
          ],
        ),
      ),
    );
  }
}
