import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';

class _Slide {
  final String emoji;
  final String title;
  final String subtitle;
  final List<Color> colors;

  const _Slide({
    required this.emoji,
    required this.title,
    required this.subtitle,
    required this.colors,
  });
}

const _slides = [
  _Slide(
    emoji: '⚡',
    title: 'Créez en 30 secondes',
    subtitle:
        'Titre, objectif, date limite.\nVotre cotisation est prête à être partagée.',
    colors: [Color(0xFF00D4AA), Color(0xFF0099AA)],
  ),
  _Slide(
    emoji: '📲',
    title: 'Partagez sur WhatsApp',
    subtitle:
        'Un simple lien. Pas de compte requis\npour vos contributeurs.',
    colors: [Color(0xFF667EEA), Color(0xFF764BA2)],
  ),
  _Slide(
    emoji: '👁️',
    title: 'Suivez en temps réel',
    subtitle:
        'Chaque paiement confirmé automatiquement.\nTransparence totale.',
    colors: [Color(0xFFFFB347), Color(0xFFE09020)],
  ),
];

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
    if (_current < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      context.go('/auth/phone');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Skip
              Align(
                alignment: Alignment.topRight,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(0, 8, 8, 0),
                  child: TextButton(
                    onPressed: () => context.go('/auth/phone'),
                    child: Text(
                      'Passer',
                      style: AppTextStyles.bodyMedium
                          .copyWith(color: AppColors.textSecondary),
                    ),
                  ),
                ),
              ),

              // Pages
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  onPageChanged: (i) => setState(() => _current = i),
                  itemCount: _slides.length,
                  itemBuilder: (context, index) =>
                      _SlidePage(slide: _slides[index]),
                ),
              ),

              // Bottom controls
              Padding(
                padding: const EdgeInsets.fromLTRB(28, 0, 28, 36),
                child: Column(
                  children: [
                    // Progress dots
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(_slides.length, (i) {
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: _current == i ? 28 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: _current == i
                                ? AppColors.primary
                                : AppColors.border,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 28),
                    AppButton(
                      label: _current == _slides.length - 1
                          ? 'Commencer 🚀'
                          : 'Suivant',
                      onPressed: _next,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SlidePage extends StatelessWidget {
  final _Slide slide;
  const _SlidePage({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 170,
            height: 170,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: slide.colors,
              ),
              borderRadius: BorderRadius.circular(44),
              boxShadow: [
                BoxShadow(
                  color: slide.colors.first.withValues(alpha: 0.45),
                  blurRadius: 60,
                  spreadRadius: 4,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Center(
              child: Text(slide.emoji,
                  style: const TextStyle(fontSize: 76)),
            ),
          )
              .animate()
              .scale(
                duration: 600.ms,
                curve: Curves.elasticOut,
                begin: const Offset(0.7, 0.7),
              )
              .fadeIn(duration: 400.ms),

          const SizedBox(height: 52),

          Text(
            slide.title,
            style: AppTextStyles.displayMedium,
            textAlign: TextAlign.center,
          )
              .animate()
              .fadeIn(delay: 200.ms, duration: 400.ms)
              .slideY(begin: 0.25, end: 0, curve: Curves.easeOut),

          const SizedBox(height: 16),

          Text(
            slide.subtitle,
            style: AppTextStyles.bodyMedium.copyWith(height: 1.7),
            textAlign: TextAlign.center,
          )
              .animate()
              .fadeIn(delay: 350.ms, duration: 400.ms),
        ],
      ),
    );
  }
}
