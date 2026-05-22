import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/mastercota_logo.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigate();
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(milliseconds: 2400));
    if (!mounted) return;
    if (SupabaseService.isAuthenticated) {
      context.go('/home');
    } else {
      context.go('/onboarding');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: Stack(
        children: [
          // ── Centered logo + tagline ─────────────────────────
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                MasterCotaLogo(size: 80, animationProgress: 1.0)
                    .animate()
                    .fadeIn(duration: 600.ms)
                    .scale(begin: const Offset(0.85, 0.85), duration: 600.ms, curve: Curves.easeOutBack),

                const SizedBox(height: 16),

                Text(
                  AppConstants.appTagline,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.ink3,
                    letterSpacing: 0.02 * 13,
                  ),
                ).animate().fadeIn(delay: 400.ms, duration: 500.ms),
              ],
            ),
          ),

          // ── Loader dots ────────────────────────────────────
          Positioned(
            bottom: 80,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(3, (i) {
                return Container(
                  width: 6,
                  height: 6,
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  decoration: BoxDecoration(
                    color: i == 1 ? AppColors.accentBright : AppColors.paper2,
                    shape: BoxShape.circle,
                  ),
                )
                    .animate(
                      delay: Duration(milliseconds: 800 + i * 180),
                      onPlay: (c) => c.repeat(reverse: true),
                    )
                    .scaleXY(begin: 0.5, end: 1.3, duration: 600.ms, curve: Curves.easeInOut)
                    .fadeIn(duration: 300.ms);
              }),
            ),
          ),
        ],
      ),
    );
  }
}
