import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../../cotisation/providers/cotisation_provider.dart';
import '../../cotisation/models/cotisation_model.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../widgets/cotisation_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  // ── French date label ─────────────────────────────────────
  static String _todayLabel() {
    final now = DateTime.now();
    const days = [
      'Lundi', 'Mardi', 'Mercredi', 'Jeudi',
      'Vendredi', 'Samedi', 'Dimanche'
    ];
    const months = [
      'jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'
    ];
    return '${days[now.weekday - 1]} ${now.day} ${months[now.month - 1]}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotisationsAsync = ref.watch(userCotisationsProvider);
    final profileAsync = ref.watch(userProfileProvider);
    final formatter = NumberFormat('#,###', 'fr_FR');

    // Derive first name from profile
    final firstName = profileAsync.maybeWhen(
      data: (profile) {
        final name = profile?['name'] as String?;
        if (name != null && name.trim().isNotEmpty) {
          return name.trim().split(' ').first;
        }
        return null;
      },
      orElse: () => null,
    );

    // Avatar initial
    final initial = firstName != null && firstName.isNotEmpty
        ? firstName[0].toUpperCase()
        : 'M';

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.accentBright,
          backgroundColor: AppColors.paper,
          onRefresh: () => ref.refresh(userCotisationsProvider.future),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── Header ──────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Logo placeholder
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: AppColors.ink,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                          const SizedBox(height: 12),
                          // Date
                          Text(
                            _todayLabel(),
                            style: AppTextStyles.bodySmall.copyWith(
                              fontSize: 13,
                              color: AppColors.ink3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          // Greeting with serif + accent italic first name
                          RichText(
                            text: TextSpan(
                              style: AppTextStyles.displayMedium.copyWith(
                                fontSize: 28,
                                height: 1.05,
                                letterSpacing: -0.02 * 28,
                              ),
                              children: [
                                const TextSpan(text: 'Bonjour, '),
                                if (firstName != null)
                                  TextSpan(
                                    text: firstName,
                                    style: AppTextStyles.serifItalic.copyWith(
                                      fontSize: 28,
                                      color: AppColors.accent,
                                    ),
                                  )
                                else
                                  const TextSpan(text: ''),
                              ],
                            ),
                          ),
                        ],
                      ),
                      // Avatar button
                      GestureDetector(
                        onTap: () {
                          HapticFeedback.lightImpact();
                          context.push('/profile');
                        },
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.ink,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.line),
                          ),
                          child: Center(
                            child: Text(
                              initial,
                              style: AppTextStyles.bodyLarge.copyWith(
                                color: AppColors.cream,
                                fontWeight: FontWeight.w600,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ).animate().fadeIn(duration: 400.ms),
                ),
              ),

              // ── Payout warning banner ────────────────────────
              SliverToBoxAdapter(
                child: profileAsync.maybeWhen(
                  data: (profile) {
                    final sub = profile?['paystack_subaccount_id'] as String?;
                    if (sub != null && sub.isNotEmpty) {
                      return const SizedBox.shrink();
                    }
                    return _PayoutWarningBanner()
                        .animate()
                        .fadeIn(delay: 100.ms)
                        .slideY(begin: -0.1, end: 0, curve: Curves.easeOut);
                  },
                  orElse: () => const SizedBox.shrink(),
                ),
              ),

              // ── Hero balance card (navy) ─────────────────────
              SliverToBoxAdapter(
                child: cotisationsAsync.when(
                  data: (list) => _HeroCard(list: list, formatter: formatter),
                  loading: () => _HeroCardSkeleton(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              // ── Quick actions ────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: _ActionButton(
                          label: '+ Nouvelle cagnotte',
                          primary: true,
                          onTap: () => context.push('/cotisation/create'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ActionButton(
                          label: 'Scanner',
                          primary: false,
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Scanner QR — bientôt disponible'),
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms),
              ),

              // ── Section title ────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        'Mes cagnottes',
                        style: AppTextStyles.headlineLarge.copyWith(
                          fontSize: 22,
                          letterSpacing: -0.01 * 22,
                        ),
                      ),
                      Text(
                        'VOIR TOUT',
                        style: AppTextStyles.caption,
                      ),
                    ],
                  ),
                ),
              ),

              // ── Cards list ───────────────────────────────────
              cotisationsAsync.when(
                data: (list) {
                  if (list.isEmpty) {
                    return SliverToBoxAdapter(child: _EmptyState());
                  }
                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: CotisationCard(
                            cotisation: list[i],
                            animIndex: i,
                            onTap: () =>
                                context.push('/cotisation/${list[i].id}'),
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
                        children: List.generate(
                          3,
                          (i) => Container(
                            width: 6,
                            height: 6,
                            margin:
                                const EdgeInsets.symmetric(horizontal: 4),
                            decoration: BoxDecoration(
                              color: i == 1
                                  ? AppColors.accentBright
                                  : AppColors.paper2,
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
                              ),
                        ),
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
                        border: Border.all(
                          color: AppColors.error.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        'Erreur : $e',
                        style: AppTextStyles.bodySmall
                            .copyWith(color: AppColors.error),
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

// ── Hero balance card ─────────────────────────────────────────

class _HeroCard extends StatelessWidget {
  final List<CotisationModel> list;
  final NumberFormat formatter;
  const _HeroCard({required this.list, required this.formatter});

  @override
  Widget build(BuildContext context) {
    final total = list.fold<double>(0, (s, c) => s + c.currentAmount);
    final active = list.where((c) => c.isActive).length;
    final contributors = list.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          // Base navy card
          Container(
            decoration: BoxDecoration(
              color: AppColors.ink,
              borderRadius: BorderRadius.circular(22),
            ),
            padding: const EdgeInsets.fromLTRB(24, 26, 24, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Eyebrow
                Text(
                  'TOTAL COLLECTÉ',
                  style: AppTextStyles.caption.copyWith(
                    color: Colors.white.withValues(alpha: 0.55),
                    fontSize: 10,
                  ),
                ),
                const SizedBox(height: 14),
                // Big amount
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      formatter.format(total),
                      style: AppTextStyles.mono.copyWith(
                        fontSize: 44,
                        color: Colors.white,
                        letterSpacing: -0.03 * 44,
                        height: 1,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'F',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: Colors.white.withValues(alpha: 0.55),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                // Stats row
                Row(
                  children: [
                    _HeroStat(
                      value: active.toString(),
                      label: 'Cagnottes actives',
                    ),
                    _HeroDivider(),
                    _HeroStat(
                      value: contributors.toString(),
                      label: 'Contributeurs',
                    ),
                    _HeroDivider(),
                    _HeroStat(
                      value: _toK(total, formatter),
                      label: 'À reverser',
                      accent: true,
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Accent corner circle overlay
          Positioned(
            top: -40,
            right: -40,
            child: Container(
              width: 140,
              height: 140,
              decoration: BoxDecoration(
                color: AppColors.accent.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ).animate()
          .fadeIn(delay: 150.ms)
          .slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic),
    );
  }

  String _toK(double amount, NumberFormat fmt) {
    if (amount >= 1000) {
      final k = (amount / 1000).round();
      return '${k} K';
    }
    return fmt.format(amount);
  }
}

class _HeroStat extends StatelessWidget {
  final String value;
  final String label;
  final bool accent;
  const _HeroStat({
    required this.value,
    required this.label,
    this.accent = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            color: Colors.white.withValues(alpha: 0.55),
            fontSize: 11,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTextStyles.mono.copyWith(
            fontSize: 18,
            color: accent ? AppColors.accent : Colors.white,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _HeroDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
        width: 1,
        height: 32,
        margin: const EdgeInsets.symmetric(horizontal: 20),
        color: Colors.white.withValues(alpha: 0.15),
      );
}

class _HeroCardSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        height: 150,
        decoration: BoxDecoration(
          color: AppColors.paper2,
          borderRadius: BorderRadius.circular(22),
        ),
      )
          .animate(onPlay: (c) => c.repeat(reverse: true))
          .shimmer(duration: 1200.ms, color: AppColors.line),
    );
  }
}

// ── Quick action button ───────────────────────────────────────

class _ActionButton extends StatelessWidget {
  final String label;
  final bool primary;
  final VoidCallback onTap;
  const _ActionButton({
    required this.label,
    required this.primary,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: primary ? AppColors.accent : AppColors.paper,
          borderRadius: BorderRadius.circular(16),
          border: primary ? null : Border.all(color: AppColors.line),
        ),
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.bodyMedium.copyWith(
              color: primary ? Colors.white : AppColors.ink,
              fontWeight: FontWeight.w500,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
      child: GestureDetector(
        onTap: () => context.push('/cotisation/create'),
        child: Center(
          child: Text(
            'Créez votre première cagnotte →',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.ink3,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ).animate().fadeIn(delay: 200.ms),
    );
  }
}

// ── Payout warning ────────────────────────────────────────────

class _PayoutWarningBanner extends StatelessWidget {
  const _PayoutWarningBanner();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/profile/payout'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 14, 20, 0),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.warn.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.warn.withValues(alpha: 0.25)),
        ),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: AppColors.warn,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text(
                  '!',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Configurez votre compte de versement pour recevoir les fonds.',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.warn,
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.arrow_forward_ios_rounded,
              color: AppColors.warn,
              size: 12,
            ),
          ],
        ),
      ),
    );
  }
}
