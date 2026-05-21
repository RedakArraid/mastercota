import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../providers/cotisation_provider.dart';
import '../models/cotisation_model.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';

class CotisationDetailScreen extends ConsumerWidget {
  final String cotisationId;
  const CotisationDetailScreen({super.key, required this.cotisationId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotAsync = ref.watch(cotisationStreamProvider(cotisationId));
    final contrAsync =
        ref.watch(contributionsStreamProvider(cotisationId));
    final formatter = NumberFormat('#,###', 'fr_FR');

    return Scaffold(
      body: Container(
        decoration:
            const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: cotAsync.when(
          data: (cot) {
            if (cot == null) {
              return const Center(
                child: Text('Cotisation introuvable',
                    style: TextStyle(color: Colors.white)),
              );
            }

            final isOwner =
                cot.ownerId == SupabaseService.currentUser?.id;
            final progress = cot.progressPercent;
            final colors = AppColors.cardGradients[
                cot.id.hashCode.abs() % AppColors.cardGradients.length];

            void share() {
              HapticFeedback.lightImpact();
              Share.share(
                'Contribuez à "${cot.title}" sur Mastercota 🙏\nhttps://mastercota.app/c/${cot.slug}',
              );
            }

            return Column(
              children: [
                Expanded(
                  child: CustomScrollView(
                    slivers: [
                      // ── Hero AppBar ─────────────────────────────
                      SliverAppBar(
                        expandedHeight: 230,
                        pinned: true,
                        backgroundColor: AppColors.background,
                        leading: GestureDetector(
                          onTap: () => context.pop(),
                          child: Container(
                            margin: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.45),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(
                                Icons.arrow_back_ios_new_rounded,
                                color: Colors.white,
                                size: 18),
                          ),
                        ),
                        actions: [
                          GestureDetector(
                            onTap: share,
                            child: Container(
                              margin: const EdgeInsets.fromLTRB(0, 10, 12, 10),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 0),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.ios_share_rounded,
                                      size: 15, color: Colors.black),
                                  const SizedBox(width: 5),
                                  Text('Partager',
                                      style: AppTextStyles.caption.copyWith(
                                        color: Colors.black,
                                        fontWeight: FontWeight.w700,
                                      )),
                                ],
                              ),
                            ),
                          ),
                        ],
                        flexibleSpace: FlexibleSpaceBar(
                          background: Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: colors,
                              ),
                            ),
                            child: SafeArea(
                              child: Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(24, 56, 24, 24),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    Text(
                                      cot.title,
                                      style: AppTextStyles.displayMedium
                                          .copyWith(color: Colors.white),
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (cot.description != null) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        cot.description!,
                                        style: AppTextStyles.bodyMedium
                                            .copyWith(
                                                color: Colors.white
                                                    .withValues(alpha: 0.8)),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),

                      // ── Content ─────────────────────────────────
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Progress card
                              _ProgressCard(
                                cot: cot,
                                progress: progress,
                                formatter: formatter,
                              ).animate().fadeIn(delay: 100.ms).slideY(
                                  begin: 0.2, end: 0),

                              const SizedBox(height: 20),

                              // Share link
                              _ShareLinkCard(cot: cot)
                                  .animate()
                                  .fadeIn(delay: 200.ms),

                              const SizedBox(height: 24),

                              // Owner actions
                              if (isOwner && cot.isActive) ...[
                                AppButton(
                                  label: 'Fermer la cotisation',
                                  isSecondary: true,
                                  onPressed: () async {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (ctx) => AlertDialog(
                                        backgroundColor: AppColors.surface,
                                        title: Text('Fermer la cotisation',
                                            style:
                                                AppTextStyles.headlineMedium),
                                        content: Text(
                                          'Plus aucune contribution ne sera acceptée.',
                                          style: AppTextStyles.bodyMedium,
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.pop(ctx, false),
                                            child: const Text('Annuler'),
                                          ),
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.pop(ctx, true),
                                            child: Text('Fermer',
                                                style: TextStyle(
                                                    color: AppColors.error)),
                                          ),
                                        ],
                                      ),
                                    );
                                    if (confirm == true) {
                                      await ref
                                          .read(cotisationNotifierProvider
                                              .notifier)
                                          .closeCotisation(cot.id);
                                    }
                                  },
                                ),
                                const SizedBox(height: 20),
                              ],

                              // Contributions
                              _ContributionsList(
                                contrAsync: contrAsync,
                                formatter: formatter,
                              ),

                              const SizedBox(height: 100),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── WhatsApp share bar ─────────────────────────
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                    child: AppButton(
                      label: '📲  Partager sur WhatsApp',
                      onPressed: share,
                    ),
                  ),
                ),
              ],
            );
          },
          loading: () => const Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
          error: (e, _) => Center(
            child: Text('Erreur : $e',
                style: const TextStyle(color: Colors.white)),
          ),
        ),
      ),
    );
  }
}

// ── Progress card ─────────────────────────────────────────

class _ProgressCard extends StatelessWidget {
  final CotisationModel cot;
  final double progress;
  final NumberFormat formatter;
  const _ProgressCard(
      {required this.cot,
      required this.progress,
      required this.formatter});

  @override
  Widget build(BuildContext context) {
    final daysLeft = cot.daysRemaining.clamp(0, 9999);
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          // 3 metrics
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _Metric(
                label: 'Collecté',
                value: formatter.format(cot.currentAmount),
                unit: 'FCFA',
                color: AppColors.primary,
              ),
              Container(
                  width: 1, height: 52, color: AppColors.border),
              _Metric(
                label: 'Objectif',
                value: formatter.format(cot.targetAmount),
                unit: 'FCFA',
                color: AppColors.textSecondary,
              ),
              Container(
                  width: 1, height: 52, color: AppColors.border),
              _Metric(
                label: 'Jours restants',
                value: '$daysLeft',
                unit: 'jours',
                color: daysLeft <= 3
                    ? AppColors.warning
                    : AppColors.textPrimary,
              ),
            ],
          ),
          const SizedBox(height: 22),
          // Progress
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${(progress * 100).toStringAsFixed(1)}% atteint',
                style: AppTextStyles.titleMedium,
              ),
              Text(
                cot.isCompleted ? '✅ Objectif atteint !' : 'En cours…',
                style: AppTextStyles.bodySmall.copyWith(
                    color: cot.isCompleted
                        ? AppColors.success
                        : AppColors.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOut,
              builder: (_, v, __) => LinearProgressIndicator(
                value: v,
                backgroundColor: AppColors.border,
                valueColor: AlwaysStoppedAnimation<Color>(
                  cot.isCompleted
                      ? AppColors.success
                      : AppColors.primary,
                ),
                minHeight: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label;
  final String value;
  final String unit;
  final Color color;
  const _Metric(
      {required this.label,
      required this.value,
      required this.unit,
      required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: AppTextStyles.bodySmall),
        const SizedBox(height: 4),
        Text(value,
            style:
                AppTextStyles.headlineLarge.copyWith(color: color)),
        Text(unit, style: AppTextStyles.caption),
      ],
    );
  }
}

// ── Share link card ───────────────────────────────────────

class _ShareLinkCard extends StatelessWidget {
  final CotisationModel cot;
  const _ShareLinkCard({required this.cot});

  @override
  Widget build(BuildContext context) {
    final link = 'mastercota.app/c/${cot.slug}';
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Lien de partage',
                    style: AppTextStyles.labelLarge),
                const SizedBox(height: 4),
                Text(
                  link,
                  style: AppTextStyles.bodySmall
                      .copyWith(color: AppColors.primary),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () {
              Clipboard.setData(
                  ClipboardData(text: 'https://$link'));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Lien copié ! 📋'),
                  backgroundColor: AppColors.success,
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.copy_all_rounded,
                  color: AppColors.primary, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Contributions list ────────────────────────────────────

class _ContributionsList extends StatelessWidget {
  final AsyncValue<List<ContributionModel>> contrAsync;
  final NumberFormat formatter;
  const _ContributionsList(
      {required this.contrAsync, required this.formatter});

  @override
  Widget build(BuildContext context) {
    return contrAsync.when(
      data: (list) {
        if (list.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              children: [
                const Text('🤝',
                    style: TextStyle(fontSize: 40)),
                const SizedBox(height: 12),
                Text('Aucune contribution pour l\'instant',
                    style: AppTextStyles.bodyMedium),
                const SizedBox(height: 4),
                Text(
                  'Partagez le lien pour recevoir les\npremières contributions.',
                  style: AppTextStyles.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Contributions',
                    style: AppTextStyles.headlineMedium),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text('${list.length}',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.primary)),
                ),
              ],
            ),
            const SizedBox(height: 14),
            ...list.asMap().entries.map((e) {
              final c = e.value;
              final initials = c.contributorName.isNotEmpty
                  ? c.contributorName[0].toUpperCase()
                  : '?';
              final gradIdx = c.contributorName.hashCode.abs() %
                  AppColors.cardGradients.length;
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    // Avatar
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors:
                              AppColors.cardGradients[gradIdx],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(
                        child: Text(initials,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                            )),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          Text(c.contributorName,
                              style: AppTextStyles.titleMedium),
                          Text(c.contributorPhone,
                              style: AppTextStyles.bodySmall),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${formatter.format(c.amount)} FCFA',
                          style: AppTextStyles.titleMedium
                              .copyWith(color: AppColors.primary),
                        ),
                        _StatusBadge(status: c.status),
                      ],
                    ),
                  ],
                ),
              )
                  .animate(
                      delay: Duration(milliseconds: 50 * e.key))
                  .fadeIn(duration: 300.ms)
                  .slideX(
                      begin: 0.1, end: 0, curve: Curves.easeOut);
            }),
          ],
        );
      },
      loading: () => const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      ),
      error: (e, _) => Text('Erreur : $e',
          style: AppTextStyles.bodyMedium),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (status) {
      'paid' => ('✓ Payé', AppColors.success),
      'pending' => ('⏳ Attente', AppColors.warning),
      _ => ('✗ Échoué', AppColors.error),
    };
    return Text(label,
        style: AppTextStyles.caption.copyWith(color: color));
  }
}
