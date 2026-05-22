import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../providers/cotisation_provider.dart';
import '../models/cotisation_model.dart';
import '../widgets/contribution_dialog.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/glass_card.dart';

class CotisationDetailScreen extends ConsumerWidget {
  final String cotisationId;
  const CotisationDetailScreen({super.key, required this.cotisationId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotAsync = ref.watch(cotisationStreamProvider(cotisationId));
    final contrAsync = ref.watch(contributionsStreamProvider(cotisationId));
    final formatter = NumberFormat('#,###', 'fr_FR');

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: cotAsync.when(
          data: (cot) {
            if (cot == null) {
              return const Center(
                child: Text(
                  'Cotisation introuvable',
                  style: TextStyle(color: AppColors.textPrimary),
                ),
              );
            }

            final isOwner = cot.ownerId == SupabaseService.currentUser?.id;
            final progress = cot.progressPercent;
            final colors = AppColors.cardGradients[
                cot.id.hashCode.abs() % AppColors.cardGradients.length];

            void share() {
              HapticFeedback.mediumImpact();
              final url = 'https://mastercota.com/c/${cot.slug}';
              final msg = cot.settings.shareMessage?.isNotEmpty == true
                  ? '${cot.settings.shareMessage}\n$url'
                  : 'Contribuez à "${cot.title}" sur Mastercota !\n$url';
              Share.share(msg);
            }

            return Column(
              children: [
                Expanded(
                  child: CustomScrollView(
                    slivers: [
                      // ── Editorial header ─────────────────────────────
                      SliverToBoxAdapter(
                        child: SafeArea(
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Top bar
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    GestureDetector(
                                      onTap: () {
                                        HapticFeedback.lightImpact();
                                        if (context.canPop()) context.pop();
                                        else context.go('/home');
                                      },
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
                                    Text('DÉTAIL', style: AppTextStyles.caption.copyWith(color: AppColors.ink3)),
                                    GestureDetector(
                                      onTap: share,
                                      child: Container(
                                        width: 38, height: 38,
                                        decoration: BoxDecoration(
                                          color: AppColors.paper,
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: AppColors.line),
                                        ),
                                        child: const Center(child: Text('↗', style: TextStyle(fontSize: 16))),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 20),
                                // Status eyebrow
                                Text(
                                  cot.isActive
                                      ? 'En cours · J−${cot.daysRemaining}'
                                      : cot.isCompleted ? 'Objectif atteint' : 'Terminé',
                                  style: AppTextStyles.caption.copyWith(color: AppColors.ink3),
                                ),
                                const SizedBox(height: 10),
                                // Title
                                Text(
                                  cot.title,
                                  style: AppTextStyles.headlineLarge.copyWith(
                                    fontSize: 36, letterSpacing: -0.02 * 36, height: 1.02,
                                  ),
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (cot.description != null && cot.description!.isNotEmpty) ...[
                                  const SizedBox(height: 12),
                                  Text(
                                    cot.description!,
                                    style: AppTextStyles.bodyMedium.copyWith(
                                      height: 1.5, color: AppColors.ink2,
                                    ),
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                                const SizedBox(height: 20),
                              ],
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
                              // Progress card in glassmorphism
                              _ProgressCard(
                                cot: cot,
                                progress: progress,
                                formatter: formatter,
                              ).animate().fadeIn(delay: 100.ms).slideY(
                                  begin: 0.1, end: 0, curve: Curves.easeOutCubic),

                              const SizedBox(height: 20),

                              // Share link
                              _ShareLinkCard(cot: cot)
                                  .animate()
                                  .fadeIn(delay: 200.ms),

                              const SizedBox(height: 24),

                              // Owner actions
                              if (isOwner && cot.isActive) ...[
                                // Settings button
                                _SettingsButton(
                                  cot: cot,
                                  onTap: () => _showSettingsSheet(context, ref, cot),
                                ).animate().fadeIn(delay: 250.ms),
                                const SizedBox(height: 12),
                                // Manual contribution button
                                AppButton(
                                  label: 'Ajouter une contribution manuelle',
                                  icon: Icons.add_circle_outline_rounded,
                                  isSecondary: true,
                                  onPressed: () => _showManualContributionSheet(
                                      context, ref, cot.id),
                                ).animate().fadeIn(delay: 300.ms),
                                const SizedBox(height: 12),
                                AppButton(
                                  label: 'Fermer la cotisation',
                                  icon: Icons.lock_outline_rounded,
                                  isSecondary: true,
                                  onPressed: () async {
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (ctx) => AlertDialog(
                                        backgroundColor: AppColors.surface,
                                        title: Text(
                                          'Fermer la cotisation',
                                          style: AppTextStyles.headlineMedium.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
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
                                            child: const Text(
                                              'Fermer',
                                              style: TextStyle(color: AppColors.error),
                                            ),
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

                // ── Action bottom bar ─────────────────────────
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                    child: cot.isActive
                        ? Row(
                            children: [
                              Expanded(
                                flex: 2,
                                child: AppButton(
                                  label: 'Contribuer',
                                  icon: Icons.volunteer_activism_rounded,
                                  onPressed: () {
                                    ContributionDialog.show(
                                      context,
                                      cotisationId: cot.id,
                                      cotisationTitle: cot.title,
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                flex: 1,
                                child: AppButton(
                                  label: 'Partager',
                                  icon: Icons.ios_share_rounded,
                                  isSecondary: true,
                                  onPressed: share,
                                ),
                              ),
                            ],
                          )
                        : AppButton(
                            label: 'Partager sur WhatsApp',
                            icon: Icons.share_rounded,
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
            child: Text(
              'Erreur : $e',
              style: const TextStyle(color: AppColors.textPrimary),
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
  const _ProgressCard({
    required this.cot,
    required this.progress,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    final daysLeft = cot.daysRemaining.clamp(0, 9999);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.line),
      ),
      padding: const EdgeInsets.fromLTRB(22, 22, 22, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Amounts row
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Collecté', style: AppTextStyles.caption),
              Text('Objectif', style: AppTextStyles.caption),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${formatter.format(cot.currentAmount)} F',
                style: AppTextStyles.amount.copyWith(fontSize: 38, letterSpacing: -0.03 * 38),
              ),
              Text(
                '${formatter.format(cot.targetAmount)} F',
                style: AppTextStyles.mono.copyWith(fontSize: 14, color: AppColors.ink3),
              ),
            ],
          ),
          const SizedBox(height: 18),
          // Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOutCubic,
              builder: (_, v, __) => SizedBox(
                height: 4,
                child: LinearProgressIndicator(
                  value: v,
                  backgroundColor: AppColors.paper2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    cot.isCompleted ? AppColors.forest : AppColors.accentBright,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text.rich(TextSpan(
                style: AppTextStyles.bodySmall.copyWith(color: AppColors.ink2),
                children: [
                  TextSpan(
                    text: '${(progress * 100).toStringAsFixed(0)}%',
                    style: AppTextStyles.mono.copyWith(color: AppColors.ink, fontSize: 11, fontWeight: FontWeight.w500),
                  ),
                  const TextSpan(text: ' atteint'),
                ],
              )),
              Text(
                '$daysLeft j restants',
                style: AppTextStyles.mono.copyWith(fontSize: 11, color: AppColors.ink3),
              ),
            ],
          ),
          // Mini stats
          const SizedBox(height: 18),
          Container(
            padding: const EdgeInsets.only(top: 16),
            decoration: const BoxDecoration(
              border: Border(top: BorderSide(color: AppColors.line)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _StatMini(value: '${(cot.progressPercent * 100).toStringAsFixed(0)}%', label: 'Atteint'),
                Container(width: 1, height: 28, color: AppColors.line),
                _StatMini(
                  value: formatter.format(cot.targetAmount - cot.currentAmount),
                  label: 'Restant F',
                ),
                Container(width: 1, height: 28, color: AppColors.line),
                _StatMini(value: '$daysLeft', label: 'Jours restants'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatMini extends StatelessWidget {
  final String value;
  final String label;
  const _StatMini({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: AppTextStyles.mono.copyWith(fontSize: 16, letterSpacing: -0.01 * 16)),
        const SizedBox(height: 2),
        Text(label, style: AppTextStyles.caption.copyWith(fontSize: 10, letterSpacing: 0)),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final String unit;
  final Color color;
  const _Metric({
    required this.icon,
    required this.label,
    required this.value,
    required this.unit,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 16, color: color.withValues(alpha: 0.7)),
        const SizedBox(height: 6),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(fontSize: 10),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTextStyles.headlineLarge.copyWith(
            color: color,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          unit,
          style: AppTextStyles.caption.copyWith(fontSize: 9),
        ),
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
    final link = 'mastercota.com/c/${cot.slug}';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: Border.all(color: AppColors.line, style: BorderStyle.solid),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              link,
              style: AppTextStyles.mono.copyWith(fontSize: 11, color: AppColors.ink3),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: 'https://$link'));
              HapticFeedback.lightImpact();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Lien copié')),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.ink,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(color: AppColors.ink),
              ),
              child: Text(
                'WhatsApp',
                style: AppTextStyles.caption.copyWith(
                  color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0,
                ),
              ),
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
  const _ContributionsList({
    required this.contrAsync,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    return contrAsync.when(
      data: (list) {
        if (list.isEmpty) {
          return GlassCard(
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
            opacity: 0.04,
            child: Center(
              child: Column(
                children: [
                  const Text('🤝', style: TextStyle(fontSize: 40)),
                  const SizedBox(height: 14),
                  Text(
                    'Aucune contribution pour l\'instant',
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Partagez le lien avec votre famille ou vos amis\npour recevoir vos premiers fonds.',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.textSecondary,
                      height: 1.4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Contributions',
                  style: AppTextStyles.headlineMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 10),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Text(
                    '${list.length}',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
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
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    // Avatar initial
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: AppColors.ink,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          initials,
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            c.contributorName,
                            style: AppTextStyles.titleMedium.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            c.contributorPhone,
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${formatter.format(c.amount)} FCFA',
                          style: AppTextStyles.titleMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        _StatusBadge(status: c.status),
                      ],
                    ),
                  ],
                ),
              )
                  .animate(delay: Duration(milliseconds: 50 * e.key))
                  .fadeIn(duration: 300.ms)
                  .slideX(begin: 0.08, end: 0, curve: Curves.easeOutQuad);
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
      error: (e, _) => Text(
        'Erreur : $e',
        style: AppTextStyles.bodyMedium,
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (label, color, bgColor) = switch (status) {
      'paid' => ('Payé', AppColors.success, AppColors.success.withValues(alpha: 0.12)),
      'pending' => ('Attente', AppColors.warning, AppColors.warning.withValues(alpha: 0.12)),
      _ => ('Échoué', AppColors.error, AppColors.error.withValues(alpha: 0.12)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption.copyWith(
          color: color,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

// ── Settings button ───────────────────────────────────────

class _SettingsButton extends StatelessWidget {
  final CotisationModel cot;
  final VoidCallback onTap;
  const _SettingsButton({required this.cot, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.tune_rounded,
                  color: AppColors.primary, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Paramètres de la page publique',
                    style: AppTextStyles.bodyMedium.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    'Contrôlez ce que voient vos contributeurs',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.textSecondary, size: 20),
          ],
        ),
      ),
    );
  }
}

// ── Settings sheet function ───────────────────────────────

void _showSettingsSheet(
    BuildContext context, WidgetRef ref, CotisationModel cot) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useRootNavigator: true,
    backgroundColor: Colors.transparent,
    constraints: const BoxConstraints(maxWidth: 550),
    builder: (ctx) => _SettingsSheet(cot: cot, ref: ref),
  );
}

class _SettingsSheet extends StatefulWidget {
  final CotisationModel cot;
  final WidgetRef ref;
  const _SettingsSheet({required this.cot, required this.ref});

  @override
  State<_SettingsSheet> createState() => _SettingsSheetState();
}

class _SettingsSheetState extends State<_SettingsSheet> {
  late CotisationSettings _settings;
  bool _saving = false;
  late TextEditingController _minAmountCtrl;
  late TextEditingController _shareMessageCtrl;

  @override
  void initState() {
    super.initState();
    _settings = widget.cot.settings;
    _minAmountCtrl = TextEditingController(
      text: _settings.minAmount > 0
          ? _settings.minAmount.toInt().toString()
          : '',
    );
    _shareMessageCtrl = TextEditingController(
      text: _settings.shareMessage ?? '',
    );
  }

  @override
  void dispose() {
    _minAmountCtrl.dispose();
    _shareMessageCtrl.dispose();
    super.dispose();
  }

  Future<void> _toggle(CotisationSettings updated) async {
    setState(() {
      _settings = updated;
      _saving = true;
    });
    try {
      await widget.ref
          .read(cotisationNotifierProvider.notifier)
          .updateSettings(widget.cot.id, updated);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveTextFields() async {
    final minAmt = double.tryParse(_minAmountCtrl.text.trim()) ?? 0;
    final msg = _shareMessageCtrl.text.trim();
    await _toggle(_settings.copyWith(
      minAmount: minAmt,
      shareMessage: msg.isEmpty ? null : msg,
      clearShareMessage: msg.isEmpty,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: EdgeInsets.fromLTRB(
          24, 16, 24, 24 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                const Icon(Icons.tune_rounded,
                    color: AppColors.primary, size: 22),
                const SizedBox(width: 10),
                Text(
                  'Paramètres de la page publique',
                  style: AppTextStyles.headlineMedium
                      .copyWith(fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                if (_saving)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Contrôlez ce qui est visible par vos contributeurs sur la page publique.',
              style: AppTextStyles.bodySmall
                  .copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 24),

            // ── Toggles ──
            _SettingsTile(
              icon: Icons.emoji_events_rounded,
              iconColor: const Color(0xFFFFB830),
              title: 'Meilleur contributeur',
              subtitle: 'Affiche le top contributeur avec son montant',
              value: _settings.showBestContributor,
              onChanged: (v) =>
                  _toggle(_settings.copyWith(showBestContributor: v)),
            ),
            _SettingsTile(
              icon: Icons.people_alt_rounded,
              iconColor: AppColors.primary,
              title: 'Liste des contributeurs',
              subtitle: 'Affiche les noms et montants des contributeurs',
              value: _settings.showContributors,
              onChanged: (v) =>
                  _toggle(_settings.copyWith(showContributors: v)),
            ),
            _SettingsTile(
              icon: Icons.bar_chart_rounded,
              iconColor: AppColors.accent,
              title: 'Barre de progression',
              subtitle: 'Affiche le montant collecté et la progression',
              value: _settings.showProgress,
              onChanged: (v) => _toggle(_settings.copyWith(showProgress: v)),
            ),
            _SettingsTile(
              icon: Icons.flag_rounded,
              iconColor: AppColors.success,
              title: 'Montant cible',
              subtitle: 'Affiche l\'objectif financier de la cotisation',
              value: _settings.showTargetAmount,
              onChanged: (v) =>
                  _toggle(_settings.copyWith(showTargetAmount: v)),
            ),
            _SettingsTile(
              icon: Icons.person_off_rounded,
              iconColor: AppColors.textSecondary,
              title: 'Contributions anonymes',
              subtitle: 'Permet aux contributeurs de ne pas saisir leur nom',
              value: _settings.anonymousAllowed,
              onChanged: (v) =>
                  _toggle(_settings.copyWith(anonymousAllowed: v)),
            ),

            const SizedBox(height: 20),
            const Divider(color: AppColors.borderLight),
            const SizedBox(height: 16),

            // ── Champs texte ──
            Text(
              'Personnalisation',
              style: AppTextStyles.titleMedium.copyWith(
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 16),

            // Minimum amount
            _SettingsInputField(
              controller: _minAmountCtrl,
              icon: Icons.south_rounded,
              iconColor: AppColors.warning,
              label: 'Montant minimum de contribution',
              hint: 'Ex: 1000 (laisser vide = pas de minimum)',
              suffix: 'FCFA',
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onEditingComplete: _saveTextFields,
            ),
            const SizedBox(height: 14),

            // Share message
            _SettingsInputField(
              controller: _shareMessageCtrl,
              icon: Icons.chat_bubble_outline_rounded,
              iconColor: AppColors.primary,
              label: 'Message personnalisé du lien partagé',
              hint:
                  'Ex: Rejoignez notre cotisation pour le mariage de Mohamed !',
              maxLines: 3,
              onEditingComplete: _saveTextFields,
            ),

            const SizedBox(height: 20),
            AppButton(
              label: 'Enregistrer',
              icon: Icons.check_rounded,
              onPressed: _saveTextFields,
              isLoading: _saving,
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconColor, size: 18),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.bodyMedium
                      .copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  subtitle,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: AppColors.primary,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }
}

// ── Settings input field ────────────────────────────────────

class _SettingsInputField extends StatelessWidget {
  final TextEditingController controller;
  final IconData icon;
  final Color iconColor;
  final String label;
  final String hint;
  final String? suffix;
  final TextInputType keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final VoidCallback onEditingComplete;
  final int maxLines;

  const _SettingsInputField({
    required this.controller,
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.hint,
    this.suffix,
    this.keyboardType = TextInputType.text,
    this.inputFormatters,
    required this.onEditingComplete,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 30,
              height: 30,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 15),
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: AppTextStyles.bodyMedium
                  .copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          maxLines: maxLines,
          onEditingComplete: onEditingComplete,
          style: AppTextStyles.bodyMedium,
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTextStyles.bodyMedium
                .copyWith(color: AppColors.textTertiary),
            suffixText: suffix,
            suffixStyle: AppTextStyles.bodySmall
                .copyWith(color: AppColors.textSecondary),
            filled: true,
            fillColor: AppColors.surfaceElevated,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide:
                  const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}

// ── Manual contribution sheet ─────────────────────────────────

void _showManualContributionSheet(
    BuildContext context, WidgetRef ref, String cotisationId) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    useRootNavigator: true,
    backgroundColor: Colors.transparent,
    constraints: const BoxConstraints(maxWidth: 550),
    builder: (ctx) =>
        _ManualContributionSheet(cotisationId: cotisationId, ref: ref),
  );
}

class _ManualContributionSheet extends StatefulWidget {
  final String cotisationId;
  final WidgetRef ref;
  const _ManualContributionSheet(
      {required this.cotisationId, required this.ref});

  @override
  State<_ManualContributionSheet> createState() =>
      _ManualContributionSheetState();
}

class _ManualContributionSheetState
    extends State<_ManualContributionSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _amountCtrl = TextEditingController();
  bool _isLoading = false;
  bool _success = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    final result = await widget.ref
        .read(cotisationNotifierProvider.notifier)
        .addManualContribution(
          cotisationId: widget.cotisationId,
          contributorName: _nameCtrl.text.trim(),
          contributorPhone: _phoneCtrl.text.trim(),
          amount: double.parse(_amountCtrl.text.trim()),
        );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content: Text(result.error!),
            backgroundColor: AppColors.error),
      );
    } else {
      HapticFeedback.heavyImpact();
      setState(() => _success = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: EdgeInsets.fromLTRB(24, 16, 24, 24 + bottomInset),
      child: SingleChildScrollView(
        child: _success ? _SuccessState(onClose: () => Navigator.pop(context)) : Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),

            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.add_circle_outline_rounded,
                      color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Contribution manuelle',
                        style: AppTextStyles.headlineMedium
                            .copyWith(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        'Espèces, virement, ou autre paiement hors-ligne',
                        style: AppTextStyles.caption
                            .copyWith(color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            Form(
              key: _formKey,
              child: Column(
                children: [
                  AppTextField(
                    controller: _nameCtrl,
                    label: 'Nom du contributeur',
                    hint: 'Ex: Mamadou Diallo',
                    textCapitalization: TextCapitalization.words,
                    prefixIcon: const Icon(Icons.person_outline_rounded,
                        color: AppColors.textSecondary, size: 20),
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Nom requis'
                        : null,
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _phoneCtrl,
                    label: 'Numéro de téléphone',
                    hint: 'Ex: +2250707070707',
                    keyboardType: TextInputType.phone,
                    prefixIcon: const Icon(Icons.phone_outlined,
                        color: AppColors.textSecondary, size: 20),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Téléphone requis';
                      }
                      final digits = v.replaceAll(RegExp(r'\D'), '');
                      if (digits.length != 10 && digits.length != 13) {
                        return 'Numéro invalide (doit contenir 10 chiffres)';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _amountCtrl,
                    label: 'Montant reçu',
                    hint: 'Ex: 10000',
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    suffixText: 'FCFA',
                    prefixIcon: const Icon(Icons.payments_outlined,
                        color: AppColors.textSecondary, size: 20),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Montant requis';
                      }
                      final amt = double.tryParse(v.trim());
                      if (amt == null || amt <= 0) return 'Montant invalide';
                      return null;
                    },
                  ),
                  const SizedBox(height: 8),
                  // Info banner
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                          color: AppColors.warning.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline_rounded,
                            color: AppColors.warning, size: 16),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'La contribution sera marquée comme payée immédiatement et mettra à jour le montant collecté.',
                            style: AppTextStyles.caption.copyWith(
                              color: AppColors.warning,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  AppButton(
                    label: 'Enregistrer la contribution',
                    icon: Icons.check_circle_outline_rounded,
                    isLoading: _isLoading,
                    onPressed: _submit,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SuccessState extends StatelessWidget {
  final VoidCallback onClose;
  const _SuccessState({required this.onClose});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(
                  color: AppColors.success.withValues(alpha: 0.3), width: 2),
            ),
            child: const Icon(Icons.check_rounded,
                color: AppColors.success, size: 44),
          ).animate().scale(duration: 400.ms, curve: Curves.elasticOut),
          const SizedBox(height: 20),
          Text(
            'Contribution enregistrée !',
            style: AppTextStyles.headlineMedium
                .copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          Text(
            'Le montant collecté a été mis à jour automatiquement.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium
                .copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 28),
          AppButton(
            label: 'Fermer',
            icon: Icons.close_rounded,
            isSecondary: true,
            onPressed: onClose,
          ),
        ],
      ),
    );
  }
}
