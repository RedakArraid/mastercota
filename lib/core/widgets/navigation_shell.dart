import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';

class NavigationShell extends StatelessWidget {
  final Widget child;
  final GoRouterState state;

  const NavigationShell({
    super.key,
    required this.child,
    required this.state,
  });

  int _getSelectedIndex() {
    final loc = state.matchedLocation;
    if (loc.startsWith('/profile')) return 2;
    return 0;
  }

  void _onItemTapped(BuildContext context, int index) {
    HapticFeedback.lightImpact();
    switch (index) {
      case 0: context.go('/home'); break;
      case 1: context.push('/cotisation/create'); break;
      case 2: context.go('/profile'); break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final selected = _getSelectedIndex();

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: Stack(
        children: [
          Positioned.fill(child: child),

          // ── Pill nav bar (navy, gold active) ──────────────────
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: Container(
              height: 60,
              decoration: BoxDecoration(
                color: AppColors.ink,
                borderRadius: BorderRadius.circular(100),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.ink.withValues(alpha: 0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _NavItem(
                    label: 'Accueil',
                    isSelected: selected == 0,
                    onTap: () => _onItemTapped(context, 0),
                  ),
                  _NavItem(
                    label: '＋ Créer',
                    isSelected: selected == 1,
                    onTap: () => _onItemTapped(context, 1),
                  ),
                  _NavItem(
                    label: 'Profil',
                    isSelected: selected == 2,
                    onTap: () => _onItemTapped(context, 2),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 0),
        height: 48,
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentBright : Colors.transparent,
          borderRadius: BorderRadius.circular(100),
        ),
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.bodySmall.copyWith(
              color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.6),
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }
}
