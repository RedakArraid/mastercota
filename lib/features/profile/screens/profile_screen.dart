import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phone = SupabaseService.currentUser?.phone ?? '';

    return Scaffold(
      body: Container(
        decoration:
            const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 16, 24, 0),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded,
                          size: 20),
                      onPressed: () => context.pop(),
                      color: AppColors.textPrimary,
                    ),
                    Text('Profil', style: AppTextStyles.headlineMedium),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      // Avatar
                      Container(
                        width: 94,
                        height: 94,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 32,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Text('👤',
                              style: TextStyle(fontSize: 42)),
                        ),
                      )
                          .animate()
                          .scale(
                              duration: 500.ms,
                              curve: Curves.elasticOut,
                              begin: const Offset(0.7, 0.7))
                          .fadeIn(),

                      const SizedBox(height: 16),

                      Text(phone, style: AppTextStyles.headlineLarge)
                          .animate()
                          .fadeIn(delay: 150.ms),

                      const SizedBox(height: 4),

                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Text('Membre Mastercota',
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.primary)),
                      ).animate().fadeIn(delay: 200.ms),

                      const SizedBox(height: 36),

                      // Options
                      ...[
                        (Icons.notifications_outlined, 'Notifications',
                            () {}),
                        (Icons.help_outline_rounded, 'Aide & Support',
                            () {}),
                        (Icons.privacy_tip_outlined, 'Confidentialité',
                            () {}),
                        (Icons.info_outline_rounded, 'À propos', () {}),
                      ].asMap().entries.map(
                            (e) => _Tile(
                              icon: e.value.$1,
                              label: e.value.$2,
                              onTap: e.value.$3,
                              animIndex: e.key,
                            ),
                          ),

                      const SizedBox(height: 20),

                      // Logout
                      GestureDetector(
                        onTap: () async {
                          await ref
                              .read(authNotifierProvider.notifier)
                              .signOut();
                          if (context.mounted) {
                            context.go('/auth/phone');
                          }
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: AppColors.error.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.logout_rounded,
                                  color: AppColors.error, size: 20),
                              const SizedBox(width: 10),
                              Text('Se déconnecter',
                                  style: AppTextStyles.titleMedium
                                      .copyWith(color: AppColors.error)),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(delay: 400.ms),

                      const SizedBox(height: 16),

                      Text('Mastercota v1.0.0',
                          style: AppTextStyles.caption),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final int animIndex;

  const _Tile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.animIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.textSecondary, size: 22),
            const SizedBox(width: 14),
            Expanded(
                child: Text(label, style: AppTextStyles.bodyLarge)),
            const Icon(Icons.chevron_right_rounded,
                color: AppColors.textTertiary, size: 20),
          ],
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: 80 * animIndex + 200))
        .fadeIn(duration: 350.ms)
        .slideX(begin: 0.08, end: 0, curve: Curves.easeOut);
  }
}
