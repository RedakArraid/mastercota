import 'package:flutter/material.dart';
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

  List<Color> get _colors {
    final i = cotisation.id.hashCode.abs() % AppColors.cardGradients.length;
    return AppColors.cardGradients[i];
  }

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat('#,###', 'fr_FR');
    final progress = cotisation.progressPercent;
    final daysLeft = cotisation.daysRemaining;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gradient header
            Container(
              height: 88,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: _colors,
                ),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      cotisation.title,
                      style: AppTextStyles.titleLarge
                          .copyWith(color: Colors.white),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _DaysBadge(
                      daysLeft: daysLeft,
                      isCompleted: cotisation.isCompleted),
                ],
              ),
            ),

            // Content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${formatter.format(cotisation.currentAmount)} FCFA',
                        style: AppTextStyles.titleLarge
                            .copyWith(color: AppColors.primary),
                      ),
                      Text(
                        'sur ${formatter.format(cotisation.targetAmount)}',
                        style: AppTextStyles.bodySmall,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(5),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        cotisation.isCompleted
                            ? AppColors.success
                            : AppColors.primary,
                      ),
                      minHeight: 6,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${(progress * 100).toStringAsFixed(0)}% atteint',
                        style: AppTextStyles.caption,
                      ),
                      Row(
                        children: [
                          const Icon(Icons.ios_share_rounded,
                              size: 13, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Text(
                            'Partager',
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.primary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      )
          .animate(delay: Duration(milliseconds: 60 * animIndex))
          .fadeIn(duration: 400.ms)
          .slideY(begin: 0.2, end: 0, curve: Curves.easeOut),
    );
  }
}

class _DaysBadge extends StatelessWidget {
  final int daysLeft;
  final bool isCompleted;
  const _DaysBadge({required this.daysLeft, required this.isCompleted});

  @override
  Widget build(BuildContext context) {
    if (isCompleted) {
      return _Badge(
          label: '✅ Terminé',
          color: AppColors.success,
          bgColor: Colors.white.withValues(alpha: 0.2));
    }
    if (daysLeft <= 0) {
      return _Badge(
          label: 'Expiré',
          color: AppColors.error,
          bgColor: Colors.white.withValues(alpha: 0.2));
    }
    return _Badge(
        label: '⏰ $daysLeft j',
        color: Colors.white,
        bgColor: Colors.white.withValues(alpha: 0.2));
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final Color bgColor;
  const _Badge(
      {required this.label, required this.color, required this.bgColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 11, color: color, fontWeight: FontWeight.w700)),
    );
  }
}
