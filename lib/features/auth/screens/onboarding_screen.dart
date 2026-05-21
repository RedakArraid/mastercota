import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/glass_card.dart';

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
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Passer button
              Align(
                alignment: Alignment.topRight,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(0, 8, 16, 0),
                  child: TextButton(
                    onPressed: () => context.go('/auth/phone'),
                    child: Text(
                      'Passer',
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ),

              // Page contents
              Expanded(
                child: PageView(
                  controller: _pageController,
                  onPageChanged: (i) => setState(() => _current = i),
                  children: [
                    _buildSlide(
                      title: 'Créez en 30 secondes',
                      subtitle: 'Définissez un titre, un objectif et une date limite.\nVotre cagnotte est immédiatement prête.',
                      illustration: _buildSlide1Illustration(),
                    ),
                    _buildSlide(
                      title: 'Partagez sur WhatsApp',
                      subtitle: 'Un lien unique et sécurisé à partager.\nVos contributeurs paient directement sans s\'inscrire.',
                      illustration: _buildSlide2Illustration(),
                    ),
                    _buildSlide(
                      title: 'Suivez en temps réel',
                      subtitle: 'Chaque paiement Mobile Money est notifié.\nGardez un oeil sur le total collecté.',
                      illustration: _buildSlide3Illustration(),
                    ),
                  ],
                ),
              ),

              // Bottom control bar
              Padding(
                padding: const EdgeInsets.fromLTRB(28, 0, 28, 36),
                child: Column(
                  children: [
                    // Expanded dots indicator
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(3, (i) {
                        final isActive = _current == i;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 5),
                          width: isActive ? 24 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            gradient: isActive 
                                ? AppColors.primaryGradient 
                                : null,
                            color: isActive ? null : AppColors.border,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 32),
                    AppButton(
                      label: _current == 2 ? 'Commencer 🚀' : 'Suivant',
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

  Widget _buildSlide({
    required String title,
    required String subtitle,
    required Widget illustration,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Illustration Box
          Expanded(
            child: Center(
              child: illustration,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            title,
            style: AppTextStyles.displayMedium,
            textAlign: TextAlign.center,
          )
              .animate()
              .fadeIn(duration: 400.ms)
              .slideY(begin: 0.15, end: 0, curve: Curves.easeOutCubic),
          const SizedBox(height: 12),
          Text(
            subtitle,
            style: AppTextStyles.bodyMedium.copyWith(height: 1.6),
            textAlign: TextAlign.center,
          )
              .animate()
              .fadeIn(delay: 200.ms, duration: 400.ms),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  // ── Illustration Slide 1: Create Cotisation ─────────────────────
  Widget _buildSlide1Illustration() {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Background decorative glow
        Container(
          width: 200,
          height: 200,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.primary.withValues(alpha: 0.05),
          ),
        ),
        
        // Mock Cotisation Card
        GlassCard(
          padding: const EdgeInsets.all(20),
          borderRadius: 24,
          opacity: 0.12,
          child: SizedBox(
            width: 280,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header tag
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '🎁 Anniversaire de Fatou',
                    style: AppTextStyles.caption.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                // Target progress text
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Objectif',
                      style: AppTextStyles.bodySmall,
                    ),
                    Text(
                      '75% atteint',
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Progress Bar Animated
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: SizedBox(
                    height: 8,
                    child: LinearProgressIndicator(
                      value: 0.75,
                      backgroundColor: AppColors.border,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // Amounts
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Collecté', style: AppTextStyles.caption),
                        Text(
                          '375 000 F',
                          style: AppTextStyles.titleLarge.copyWith(
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('Cible', style: AppTextStyles.caption),
                        Text(
                          '500 000 F',
                          style: AppTextStyles.titleMedium.copyWith(
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        )
            .animate()
            .scale(duration: 600.ms, curve: Curves.easeOutBack, begin: const Offset(0.7, 0.7))
            .fadeIn(duration: 400.ms),
      ],
    );
  }

  // ── Illustration Slide 2: WhatsApp Share ────────────────────────
  Widget _buildSlide2Illustration() {
    return Stack(
      alignment: Alignment.center,
      children: [
        // WhatsApp Chat bubble Mockup
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // WhatsApp-like incoming message bubble
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              margin: const EdgeInsets.only(right: 28),
              decoration: const BoxDecoration(
                color: Color(0xFF1E3A3A),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: const Text(
                'Salut la famille ! Qui participe au cadeau ? 🥳',
                style: TextStyle(color: Colors.white, fontSize: 13),
              ),
            )
                .animate()
                .slideX(begin: -0.2, end: 0, duration: 500.ms, curve: Curves.easeOutCubic)
                .fadeIn(),
            
            const SizedBox(height: 12),
            
            // Share Link Message Bubble
            Container(
              width: 260,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF112520),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
                border: Border.all(color: const Color(0xFF2E6B5E), width: 1),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    height: 90,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Center(
                      child: Text(
                        'MasterCota 🤝',
                        style: AppTextStyles.headlineMedium.copyWith(color: Colors.black),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Anniversaire de Fatou',
                    style: AppTextStyles.titleMedium.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Contribuez facilement via Mobile Money en cliquant sur ce lien.',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'mastercota.com/c/anniv-fatou',
                    style: TextStyle(color: AppColors.primary, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            )
                .animate()
                .slideX(begin: 0.2, end: 0, delay: 250.ms, duration: 500.ms, curve: Curves.easeOutCubic)
                .fadeIn(),
          ],
        ),
      ],
    );
  }

  // ── Illustration Slide 3: Tracker ──────────────────────────────
  Widget _buildSlide3Illustration() {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Decorative background gradient ring
        Container(
          width: 190,
          height: 190,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.accent.withValues(alpha: 0.05),
          ),
        ),
        
        // Mock contributors list
        SizedBox(
          width: 280,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildMockContributor(
                name: 'Koffi Yao',
                phone: '+225 07 45 ••• 88',
                amount: '+25 000 F',
                avatarGrad: AppColors.cardGradients[0],
                isPaid: true,
                animDelay: 100,
              ),
              const SizedBox(height: 10),
              _buildMockContributor(
                name: 'Awa Touré',
                phone: '+225 05 11 ••• 42',
                amount: '+50 000 F',
                avatarGrad: AppColors.cardGradients[5],
                isPaid: true,
                animDelay: 300,
              ),
              const SizedBox(height: 10),
              _buildMockContributor(
                name: 'Konan Kouassi',
                phone: '+225 01 77 ••• 19',
                amount: '+10 000 F',
                avatarGrad: AppColors.cardGradients[2],
                isPaid: false,
                animDelay: 500,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMockContributor({
    required String name,
    required String phone,
    required String amount,
    required List<Color> avatarGrad,
    required bool isPaid,
    required int animDelay,
  }) {
    return GlassCard(
      padding: const EdgeInsets.all(10),
      borderRadius: 16,
      opacity: 0.08,
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: avatarGrad,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Center(
              child: Text(
                name[0],
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: AppTextStyles.titleMedium.copyWith(fontSize: 13)),
                Text(phone, style: AppTextStyles.caption.copyWith(fontSize: 10)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amount,
                style: AppTextStyles.titleMedium.copyWith(
                  color: isPaid ? AppColors.primary : AppColors.textSecondary,
                  fontSize: 13,
                ),
              ),
              Text(
                isPaid ? '✓ Payé' : '⏳ Attente',
                style: AppTextStyles.caption.copyWith(
                  color: isPaid ? AppColors.success : AppColors.warning,
                  fontSize: 9,
                ),
              ),
            ],
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(delay: animDelay.ms, duration: 400.ms)
        .slideY(begin: 0.2, end: 0, delay: animDelay.ms);
  }
}
