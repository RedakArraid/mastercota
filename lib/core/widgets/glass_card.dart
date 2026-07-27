import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Carte surface style shadcn — bordure légère, fond card, sans blur glass.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final double blur;
  final Border? border;
  final List<Color>? gradientColors;
  final double opacity;

  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = AppColors.radiusLg,
    this.blur = 0,
    this.border,
    this.gradientColors,
    this.opacity = 1,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cream,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border ?? Border.all(color: AppColors.line, width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }
}
