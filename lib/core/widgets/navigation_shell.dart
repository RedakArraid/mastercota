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
    if (loc.startsWith('/cotisation/create')) return 1;
    if (loc.startsWith('/profile')) return 2;
    return 0;
  }

  void _onItemTapped(BuildContext context, int index) {
    HapticFeedback.lightImpact();
    switch (index) {
      case 0:
        context.go('/home');
        break;
      case 1:
        context.push('/cotisation/create');
        break;
      case 2:
        context.go('/profile');
        break;
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
          Positioned(
            left: 14,
            right: 14,
            bottom: 16,
            child: SafeArea(
              top: false,
              minimum: EdgeInsets.zero,
              child: Container(
                height: 68,
                decoration: BoxDecoration(
                  color: AppColors.ink,
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.08),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.ink.withValues(alpha: 0.28),
                      blurRadius: 30,
                      spreadRadius: -6,
                      offset: const Offset(0, 14),
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(7),
                child: Row(
                  children: [
                    Expanded(
                      child: _NavItem(
                        icon: Icons.home_rounded,
                        label: 'Accueil',
                        isSelected: selected == 0,
                        onTap: () => _onItemTapped(context, 0),
                      ),
                    ),
                    Expanded(
                      child: _NavItem(
                        icon: Icons.add_rounded,
                        label: 'Créer',
                        isSelected: selected == 1,
                        onTap: () => _onItemTapped(context, 1),
                      ),
                    ),
                    Expanded(
                      child: _NavItem(
                        icon: Icons.person_rounded,
                        label: 'Profil',
                        isSelected: selected == 2,
                        onTap: () => _onItemTapped(context, 2),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      selected: isSelected,
      button: true,
      label: label,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          height: 54,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.accentBright : Colors.transparent,
            borderRadius: BorderRadius.circular(100),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 19,
                color: isSelected
                    ? AppColors.ink
                    : Colors.white.withValues(alpha: 0.58),
              ),
              if (isSelected) ...[
                const SizedBox(width: 7),
                Text(
                  label,
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w700,
                    fontSize: 12.5,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
