import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../cotisation/models/cotisation_model.dart';

class CotisationCard extends StatelessWidget {
  final CotisationModel cotisation;
  final VoidCallback onTap;
  final int animIndex;

  const CotisationCard({
    super.key,
    required this.cotisation,
    required this.onTap,
    this.animIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat('#,###', 'fr_FR');
    final progress = cotisation.progressPercent;
    final daysLeft = cotisation.daysRemaining;
    final completed = cotisation.isCompleted;
    final isAccent = cotisation.id.hashCode.abs() % 3 == 0;

    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.paper,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isAccent ? AppColors.accentLine : AppColors.line,
          ),
        ),
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Title row + badge ──────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cotisation.title,
                        style: AppTextStyles.titleLarge.copyWith(
                          fontSize: 18,
                          letterSpacing: -0.01 * 18,
                          fontWeight: FontWeight.w500,
                          height: 1.15,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (cotisation.description != null &&
                          cotisation.description!.trim().isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          cotisation.description!,
                          style: AppTextStyles.bodySmall.copyWith(
                            color: AppColors.ink3,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                _StatusBadge(daysLeft: daysLeft, completed: completed),
              ],
            ),

            // ── Amounts ────────────────────────────────────────
            const SizedBox(height: 16),
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  formatter.format(cotisation.currentAmount),
                  style: AppTextStyles.amount.copyWith(
                    fontSize: 26,
                    letterSpacing: -0.02 * 26,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  'F',
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.ink3),
                ),
                const Spacer(),
                Text(
                  '/ ${formatter.format(cotisation.targetAmount)} F',
                  style: AppTextStyles.mono.copyWith(
                    fontSize: 11,
                    color: AppColors.ink3,
                  ),
                ),
              ],
            ),

            // ── Progress bar ───────────────────────────────────
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: SizedBox(
                height: 4,
                child: LinearProgressIndicator(
                  value: progress.clamp(0.0, 1.0),
                  backgroundColor: AppColors.paper2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    completed ? AppColors.forest : AppColors.accentBright,
                  ),
                ),
              ),
            ),

            // ── Footer ─────────────────────────────────────────
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${(progress * 100).toStringAsFixed(0)}%',
                  style: AppTextStyles.mono.copyWith(
                    fontSize: 11,
                    color: AppColors.ink,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  'Voir →',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ],
        ),
      )
          .animate(delay: Duration(milliseconds: 50 * animIndex))
          .fadeIn(duration: 350.ms)
          .slideY(begin: 0.08, end: 0, curve: Curves.easeOutQuad),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final int daysLeft;
  final bool completed;
  const _StatusBadge({required this.daysLeft, required this.completed});

  @override
  Widget build(BuildContext context) {
    if (completed) {
      return _Chip(
        label: 'Atteint',
        color: AppColors.forest,
        bg: AppColors.forestSoft,
      );
    }
    if (daysLeft <= 0) {
      return _Chip(
        label: 'Expiré',
        color: AppColors.error,
        bg: AppColors.error.withValues(alpha: 0.08),
      );
    }
    return _Chip(
      label: 'J−$daysLeft',
      color: AppColors.paper,
      bg: AppColors.ink,
      mono: true,
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  final Color color;
  final Color bg;
  final bool mono;
  const _Chip({required this.label, required this.color, required this.bg, this.mono = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: (mono ? AppTextStyles.mono : AppTextStyles.caption).copyWith(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.05 * 10,
        ),
      ),
    );
  }
}
