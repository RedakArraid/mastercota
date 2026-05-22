import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/mastercota_logo.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pageController = PageController();
  int _current = 0;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _next() {
    if (_current < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOutCubic,
      );
    } else {
      context.go('/auth/phone');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: Column(
          children: [
            // ── Top bar ──────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 16, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  MasterCotaLogo(size: 28, animationProgress: 1.0),
                  TextButton(
                    onPressed: () => context.go('/auth/phone'),
                    child: Text(
                      'Passer',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.ink3,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Pages ────────────────────────────────────────
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: (i) => setState(() => _current = i),
                children: [
                  _Slide(
                    eyebrow: '01 sur 03',
                    title: 'Créez en',
                    titleAccent: '30 secondes.',
                    body: 'Titre, objectif, date — votre cagnotte est immédiatement prête à partager.',
                    illustration: _Illus1(),
                  ),
                  _Slide(
                    eyebrow: '02 sur 03',
                    title: 'Partagez un lien,',
                    titleAccent: 'la cagnotte démarre.',
                    body: 'Vos proches paient via Wave, Orange Money ou MTN — sans s\'inscrire.',
                    illustration: _Illus2(),
                  ),
                  _Slide(
                    eyebrow: '03 sur 03',
                    title: 'Suivez,',
                    titleAccent: 'relancez.',
                    body: 'Chaque paiement en temps réel. Rappels personnalisés aux retardataires.',
                    illustration: _Illus3(),
                  ),
                ],
              ),
            ),

            // ── Bottom controls ───────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 36),
              child: Column(
                children: [
                  // Dots
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: List.generate(3, (i) {
                          final active = _current == i;
                          return AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            margin: const EdgeInsets.only(right: 8),
                            width: active ? 24 : 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: active ? AppColors.ink : AppColors.ink4.withValues(alpha: 0.4),
                              borderRadius: BorderRadius.circular(999),
                            ),
                          );
                        }),
                      ),
                      AppButton(
                        label: _current == 2 ? 'Commencer →' : 'Continuer →',
                        onPressed: _next,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Slide extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String titleAccent;
  final String body;
  final Widget illustration;

  const _Slide({
    required this.eyebrow,
    required this.title,
    required this.titleAccent,
    required this.body,
    required this.illustration,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Illustration
          Expanded(
            child: Center(child: illustration),
          ),
          const SizedBox(height: 8),

          // Eyebrow
          Text(
            eyebrow,
            style: AppTextStyles.caption.copyWith(
              color: AppColors.ink3,
              letterSpacing: 0.06 * 11,
            ),
          ),
          const SizedBox(height: 12),

          // Headline
          RichText(
            text: TextSpan(
              style: AppTextStyles.displayMedium.copyWith(
                fontSize: 32,
                fontWeight: FontWeight.w500,
                letterSpacing: -0.025 * 32,
                height: 1.05,
              ),
              children: [
                TextSpan(text: '$title\n'),
                TextSpan(
                  text: titleAccent,
                  style: AppTextStyles.serifItalic.copyWith(
                    fontSize: 32,
                    letterSpacing: -0.025 * 32,
                  ),
                ),
              ],
            ),
          )
              .animate()
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.1, end: 0, curve: Curves.easeOutCubic),

          const SizedBox(height: 14),

          Text(
            body,
            style: AppTextStyles.bodyMedium.copyWith(
              height: 1.55,
              color: AppColors.ink2,
            ),
          ).animate().fadeIn(delay: 150.ms, duration: 400.ms),

          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ── Simple illustrations ──────────────────────────────────────

class _Illus1 extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.line),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text('Anniversaire de Fatou',
              style: AppTextStyles.titleLarge.copyWith(fontSize: 18, letterSpacing: -0.02 * 18)),
          const SizedBox(height: 4),
          Text('Pour ses 30 ans · Zanzibar',
              style: AppTextStyles.bodySmall.copyWith(color: AppColors.ink3)),
          const SizedBox(height: 18),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: SizedBox(
              height: 4,
              child: LinearProgressIndicator(
                value: 0.75,
                backgroundColor: AppColors.paper2,
                valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accentBright),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('750 000 F', style: AppTextStyles.mono.copyWith(fontSize: 16)),
              Text('75 %', style: AppTextStyles.mono.copyWith(fontSize: 12, color: AppColors.ink3)),
            ],
          ),
        ],
      ),
    ).animate().scale(begin: const Offset(0.9, 0.9), duration: 500.ms, curve: Curves.easeOutBack).fadeIn();
  }
}

class _Illus2 extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // WhatsApp bubble
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.paper,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
              border: Border.all(color: AppColors.line),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 20,
                  height: 20,
                  decoration: const BoxDecoration(
                    color: Color(0xFF25D366),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text('W', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 8),
                Text('Lien partagé', style: AppTextStyles.bodySmall.copyWith(fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Contribution incoming
        Align(
          alignment: Alignment.centerRight,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.ink,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('Aminata K.', style: AppTextStyles.caption.copyWith(color: Colors.white54, letterSpacing: 0)),
                const SizedBox(height: 2),
                Text('+ 10 000 F', style: AppTextStyles.mono.copyWith(color: Colors.white, fontSize: 16)),
              ],
            ),
          ),
        ),
      ],
    ).animate().fadeIn(delay: 100.ms, duration: 500.ms).slideY(begin: 0.1, end: 0);
  }
}

class _Illus3 extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final rows = [
      ('Aminata Koné', '+25 000 F', true),
      ('Mamadou Diallo', '+10 000 F', true),
      ('Konan Kouassi', 'En attente', false),
    ];
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: rows.asMap().entries.map((e) {
        final (name, amount, paid) = e.value;
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.paper,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.line),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: paid ? AppColors.ink : AppColors.paper2,
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Text(
                    name[0],
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: paid ? Colors.white : AppColors.ink3,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(name, style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink))),
              Text(
                amount,
                style: AppTextStyles.mono.copyWith(
                  fontSize: 13,
                  color: paid ? AppColors.ink : AppColors.ink3,
                ),
              ),
            ],
          ),
        ).animate().fadeIn(delay: Duration(milliseconds: 100 + e.key * 100), duration: 350.ms);
      }).toList(),
    );
  }
}
