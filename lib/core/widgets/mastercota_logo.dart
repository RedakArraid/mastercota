import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class MasterCotaLogo extends StatelessWidget {
  final double size;
  final bool showText;
  final bool showTagline;
  final Color? iconColor;
  final Color? textColor;
  final double animationProgress; // From 0.0 to 1.0, to animate the rings

  const MasterCotaLogo({
    super.key,
    this.size = 100.0,
    this.showText = false,
    this.showTagline = false,
    this.iconColor,
    this.textColor,
    this.animationProgress = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    Widget logoIcon = SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _DoubleCLogoPainter(
          iconColor: iconColor ?? AppColors.accent,
          goldColor: AppColors.primary,
          progress: animationProgress,
        ),
      ),
    );

    if (!showText) return logoIcon;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        logoIcon,
        const SizedBox(height: 16),
        RichText(
          text: TextSpan(
            style: TextStyle(
              fontSize: size * 0.28,
              fontWeight: FontWeight.w800,
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: -0.5,
            ),
            children: [
              TextSpan(
                text: 'Master',
                style: TextStyle(color: textColor ?? AppColors.textPrimary),
              ),
              const TextSpan(
                text: 'Cota',
                style: TextStyle(color: AppColors.primary),
              ),
            ],
          ),
        ),
        if (showTagline) ...[
          const SizedBox(height: 6),
          Text(
            'Plus simple de cotiser.',
            style: TextStyle(
              fontSize: size * 0.11,
              fontWeight: FontWeight.w600,
              color: (textColor ?? AppColors.textPrimary).withValues(alpha: 0.6),
              fontFamily: 'Plus Jakarta Sans',
              letterSpacing: 0.2,
            ),
          ),
        ],
      ],
    );
  }
}

class _DoubleCLogoPainter extends CustomPainter {
  final Color iconColor;
  final Color goldColor;
  final double progress;

  _DoubleCLogoPainter({
    required this.iconColor,
    required this.goldColor,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width / 2;

    // Paints
    final outerPaint = Paint()
      ..color = iconColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.075
      ..strokeCap = StrokeCap.round;

    final innerPaint = Paint()
      ..color = goldColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.075
      ..strokeCap = StrokeCap.round;

    // 1. Draw Outer "C" Arc
    // Opening is on the right side. Standard arc starting from 30deg to 330deg (in radians: 0.52 to 5.76).
    // With progress, the arc grows. We animate the start and sweep angle.
    final outerRadius = baseRadius * 0.85;
    final outerStartAngle = -math.pi * 0.85 + (1 - progress) * math.pi;
    final outerSweepAngle = math.pi * 1.7 * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: outerRadius),
      outerStartAngle,
      outerSweepAngle,
      false,
      outerPaint,
    );

    // 2. Draw Inner "C" Arc
    // Opening is slightly offset (top-right). Let's start from -math.pi * 0.65 to math.pi * 1.5.
    // Animates in opposite direction
    final innerRadius = baseRadius * 0.60;
    final innerStartAngle = -math.pi * 0.3 + (progress - 1) * math.pi;
    final innerSweepAngle = math.pi * 1.5 * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: innerRadius),
      innerStartAngle,
      innerSweepAngle,
      false,
      innerPaint,
    );

    // 3. Draw Stylized 'f' currency symbol in the center
    // We only draw if progress is high enough (fade-in/draw effect)
    if (progress > 0.4) {
      final fProgress = ((progress - 0.4) / 0.6).clamp(0.0, 1.0);
      final fPath = Path();
      
      // Scale coordinates to fit inside the inner circle
      final unit = size.width / 100;
      final cX = center.dx;
      final cY = center.dy;

      // Draw the main 'f' shape: vertical curve
      // Start top-right loop, curve left, go down
      fPath.moveTo(cX + 6 * unit, cY - 14 * unit);
      fPath.quadraticBezierTo(cX - 5 * unit, cY - 14 * unit, cX - 5 * unit, cY - 4 * unit);
      fPath.lineTo(cX - 5 * unit, cY + 12 * unit);
      // Curve bottom left
      fPath.quadraticBezierTo(cX - 5 * unit, cY + 18 * unit, cX - 10 * unit, cY + 18 * unit);

      // Draw path with progress (using simple path metric-like approximation or opacity)
      final tempPaint = Paint()
        ..color = iconColor.withValues(alpha: fProgress)
        ..style = PaintingStyle.stroke
        ..strokeWidth = size.width * 0.07
        ..strokeCap = StrokeCap.round;

      canvas.drawPath(fPath, tempPaint);

      // Draw the double crossbar
      final barLength = 9 * unit * fProgress;
      // Top bar
      canvas.drawLine(
        Offset(cX - 10 * unit, cY - 3 * unit),
        Offset(cX - 10 * unit + barLength * 1.8, cY - 3 * unit),
        tempPaint,
      );
      // Bottom bar
      canvas.drawLine(
        Offset(cX - 10 * unit, cY + 3 * unit),
        Offset(cX - 10 * unit + barLength * 1.8, cY + 3 * unit),
        tempPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _DoubleCLogoPainter oldDelegate) {
    return oldDelegate.iconColor != iconColor ||
        oldDelegate.goldColor != goldColor ||
        oldDelegate.progress != progress;
  }
}
