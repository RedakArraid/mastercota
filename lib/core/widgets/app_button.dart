import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

/// Bouton primaire/secondaire — densité & rayon alignés shadcn (frontend).
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isSecondary;
  final IconData? icon;

  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.isLoading = false,
    this.isSecondary = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final labelWidget = Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon,
              size: 18,
              color: isSecondary ? AppColors.ink : AppColors.ink),
          const SizedBox(width: 8),
        ],
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.ink,
          ),
        ),
      ],
    );

    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppColors.radius),
    );

    return SizedBox(
      width: double.infinity,
      height: 40,
      child: isSecondary
          ? OutlinedButton(
              onPressed: isLoading ? null : onPressed,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.ink,
                backgroundColor: AppColors.paper2,
                side: BorderSide.none,
                shape: shape,
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(AppColors.ink),
                      ),
                    )
                  : labelWidget,
            )
          : ElevatedButton(
              onPressed: isLoading
                  ? null
                  : () {
                      HapticFeedback.lightImpact();
                      onPressed?.call();
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.accent,
                disabledBackgroundColor:
                    AppColors.accentDark.withValues(alpha: 0.5),
                foregroundColor: AppColors.ink,
                shape: shape,
                elevation: 0,
                padding: EdgeInsets.zero,
              ),
              child: isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(AppColors.ink),
                      ),
                    )
                  : labelWidget,
            ),
    );
  }
}
