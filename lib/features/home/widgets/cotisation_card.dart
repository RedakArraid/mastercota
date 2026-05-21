import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';
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
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: GlassCard(
        borderRadius: 22,
        opacity: 0.08,
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.06),
          width: 1.0,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Decorative Top Gradient Bar
            Container(
              height: 6,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: _colors,
                ),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
              ),
            ),
            
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header Row: Title & Badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          cotisation.title,
                          style: AppTextStyles.titleLarge.copyWith(
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                            color: Colors.white,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 10),
                      _DaysBadge(
                        daysLeft: daysLeft,
                        isCompleted: cotisation.isCompleted,
                      ),
                    ],
                  ),
                  
                  // Description excerpt (if present)
                  if (cotisation.description != null && cotisation.description!.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      cotisation.description!,
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textSecondary.withValues(alpha: 0.8),
                        height: 1.4,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  
                  const SizedBox(height: 22),
                  
                  // Progress metrics
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Collecté',
                            style: AppTextStyles.caption.copyWith(fontSize: 10),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${formatter.format(cotisation.currentAmount)} FCFA',
                            style: AppTextStyles.titleLarge.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'sur ${formatter.format(cotisation.targetAmount)} F',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Progress Bar with glowing/rounded styling
                  Stack(
                    children: [
                      // Base line
                      Container(
                        height: 7,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: AppColors.border,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      // Progress fill
                      FractionallySizedBox(
                        widthFactor: progress.clamp(0.0, 1.0),
                        child: Container(
                          height: 7,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: cotisation.isCompleted
                                  ? [AppColors.success, AppColors.success.withValues(alpha: 0.7)]
                                  : [AppColors.primary, AppColors.primary.withValues(alpha: 0.7)],
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ],
                  ),
                  
                  const SizedBox(height: 12),
                  
                  // Footer: Percentage & Share button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${(progress * 100).toStringAsFixed(0)}% atteint',
                        style: AppTextStyles.caption.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Colors.white60,
                        ),
                      ),
                      
                      // Shared Badge Link
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.20),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.ios_share_rounded,
                              size: 13,
                              color: AppColors.primary,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Partager',
                              style: AppTextStyles.caption.copyWith(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      )
          .animate(delay: Duration(milliseconds: 50 * animIndex))
          .fadeIn(duration: 400.ms)
          .slideY(begin: 0.12, end: 0, curve: Curves.easeOutQuad),
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
        label: '✓ Terminé',
        color: AppColors.success,
        bgColor: AppColors.success.withValues(alpha: 0.12),
      );
    }
    if (daysLeft <= 0) {
      return _Badge(
        label: 'Expiré',
        color: AppColors.error,
        bgColor: AppColors.error.withValues(alpha: 0.12),
      );
    }
    return _Badge(
      label: '⏰ $daysLeft j',
      color: Colors.white,
      bgColor: Colors.white.withValues(alpha: 0.08),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final Color bgColor;
  const _Badge({required this.label, required this.color, required this.bgColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
