import 'dart:ui';
import 'package:flutter/material.dart';

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
    this.borderRadius = 24.0,
    this.blur = 15.0,
    this.border,
    this.gradientColors,
    this.opacity = 0.08,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Adjust opacity for light mode to ensure the glass effect is visible on a light background.
    // We map low opacities to a higher range so that the cards don't look completely transparent/washed out.
    final double effectiveOpacity;
    if (isDark) {
      effectiveOpacity = opacity;
    } else {
      if (opacity <= 0.15) {
        effectiveOpacity = 0.55 + (opacity * 2.0); // e.g. 0.08 -> 0.71, 0.05 -> 0.65, 0.03 -> 0.61
      } else {
        effectiveOpacity = opacity;
      }
    }

    final effectiveGradientColors = gradientColors ?? [
      Colors.white.withValues(alpha: effectiveOpacity),
      Colors.white.withValues(alpha: effectiveOpacity * 0.4),
    ];

    final List<BoxShadow>? shadows = isDark
        ? null
        : [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 24,
              spreadRadius: -4,
              offset: const Offset(0, 10),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 8,
              spreadRadius: -2,
              offset: const Offset(0, 2),
            ),
          ];

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: shadows,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(borderRadius),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: effectiveGradientColors,
              ),
              border: border ?? Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.07)
                    : const Color(0xFFE2E8F0).withValues(alpha: 0.8),
                width: 1.0,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
