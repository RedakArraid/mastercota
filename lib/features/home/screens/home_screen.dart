import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../cotisation/providers/cotisation_provider.dart';
import '../../cotisation/models/cotisation_model.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../widgets/cotisation_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotisationsAsync = ref.watch(userCotisationsProvider);
    final phone = SupabaseService.currentUser?.phone ?? '';
    final formatter = NumberFormat('#,###', 'fr_FR');

    return Scaffold(
      body: Container(
        decoration:
            const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Stack(
            children: [
              RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.surface,
                onRefresh: () => ref.refresh(userCotisationsProvider.future),
                child: CustomScrollView(
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
                                Text('Bonjour 👋',
                                    style: AppTextStyles.bodyMedium),
                                const SizedBox(height: 2),
                                Text(
                                  phone.isNotEmpty
                                      ? phone
                                      : 'Bienvenue',
                                  style: AppTextStyles.headlineLarge,
                                ),
                              ],
                            ),
                            GestureDetector(
                              onTap: () => context.push('/profile'),
                              child: Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  gradient: AppColors.primaryGradient,
                                  borderRadius: BorderRadius.circular(15),
                                  boxShadow: [
                                    BoxShadow(
                                      color:
                                          AppColors.primary.withValues(alpha: 0.3),
                                      blurRadius: 16,
                                    ),
                                  ],
                                ),
                                child: const Center(
                                  child: Icon(Icons.person_rounded,
                                      color: Colors.black, size: 22),
                                ),
                              ),
                            ),
                          ],
                        ).animate().fadeIn(duration: 400.ms),
                      ),
                    ),

                    // ── Summary card ────────────────────────────────
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

                    // ── Section title ───────────────────────────────
                    SliverToBoxAdapter(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(24, 28, 24, 14),
                        child: Text('Mes cotisations',
                            style: AppTextStyles.headlineMedium),
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
                          padding:
                              const EdgeInsets.fromLTRB(24, 0, 24, 110),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, i) => Padding(
                                padding:
                                    const EdgeInsets.only(bottom: 16),
                                child: CotisationCard(
                                  cotisation: list[i],
                                  animIndex: i,
                                  onTap: () => context
                                      .push('/cotisation/${list[i].id}'),
                                ),
                              ),
                              childCount: list.length,
                            ),
                          ),
                        );
                      },
                      loading: () => const SliverToBoxAdapter(
                        child: Center(
                          child: Padding(
                            padding: EdgeInsets.all(40),
                            child: CircularProgressIndicator(
                                color: AppColors.primary),
                          ),
                        ),
                      ),
                      error: (e, _) => SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text('Erreur : $e',
                              style: AppTextStyles.bodyMedium),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── FAB ─────────────────────────────────────────────
              Positioned(
                bottom: 28,
                right: 24,
                child: GestureDetector(
                  onTap: () => context.push('/cotisation/create'),
                  child: Container(
                    width: 62,
                    height: 62,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withValues(alpha: 0.55),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.add_rounded,
                        color: Colors.black, size: 34),
                  )
                      .animate(
                          onPlay: (c) => c.repeat(reverse: true),
                          delay: 1.seconds)
                      .scaleXY(
                          begin: 1,
                          end: 1.06,
                          duration: 1800.ms,
                          curve: Curves.easeInOut),
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
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF00D4AA), Color(0xFF0099AA)],
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.35),
              blurRadius: 36,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Total collecté',
              style: AppTextStyles.bodyMedium
                  .copyWith(color: Colors.black.withValues(alpha: 0.6)),
            ),
            const SizedBox(height: 4),
            Text(
              '${formatter.format(total)} FCFA',
              style: AppTextStyles.displayLarge.copyWith(
                color: Colors.black,
                fontSize: 30,
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                _Pill(icon: Icons.bolt_rounded, label: '$active active${active > 1 ? 's' : ''}'),
                const SizedBox(width: 10),
                _Pill(icon: Icons.list_alt_rounded, label: '${list.length} total'),
              ],
            ),
          ],
        ),
      ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.2, end: 0),
    );
  }
}

class _Pill extends StatelessWidget {
  final IconData icon;
  final String label;
  const _Pill({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.black87),
          const SizedBox(width: 5),
          Text(label,
              style: const TextStyle(
                  fontSize: 13,
                  color: Colors.black87,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SummaryCardSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
      child: Container(
        height: 130,
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(40, 20, 40, 40),
      child: Column(
        children: [
          Container(
            width: 90,
            height: 90,
            decoration: BoxDecoration(
              color: AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: AppColors.border),
            ),
            child: const Center(
                child: Text('🎯', style: TextStyle(fontSize: 42))),
          ),
          const SizedBox(height: 20),
          Text('Aucune cotisation', style: AppTextStyles.headlineMedium),
          const SizedBox(height: 8),
          Text(
            'Appuyez sur + pour créer votre\npremière cotisation et la partager.',
            style: AppTextStyles.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ).animate().fadeIn(delay: 200.ms).scale(
            begin: const Offset(0.9, 0.9),
            duration: 400.ms,
          ),
    );
  }
}
