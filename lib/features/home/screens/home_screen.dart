import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../auth/providers/auth_provider.dart';
import '../../cotisation/providers/cotisation_provider.dart';
import '../../cotisation/models/cotisation_model.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../widgets/cotisation_card.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cotisationsAsync = ref.watch(userCotisationsProvider);
    final profileAsync = ref.watch(userProfileProvider);
    final phone = SupabaseService.currentUser?.phone ?? '';
    final formatter = NumberFormat('#,###', 'fr_FR');

    // Derive first name / initial from phone
    final greeting = phone.isNotEmpty
        ? phone.replaceAll(RegExp(r'\D'), '').substring(
            0, phone.replaceAll(RegExp(r'\D'), '').length.clamp(0, 4))
        : 'vous';

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
        child: RefreshIndicator(
          color: AppColors.accentBright,
          backgroundColor: AppColors.paper,
          onRefresh: () => ref.refresh(userCotisationsProvider.future),
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              // ── Header ────────────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _todayLabel(),
                            style: AppTextStyles.bodySmall.copyWith(
                              color: AppColors.ink3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Bonjour',
                            style: AppTextStyles.headlineLarge.copyWith(
                              fontSize: 28,
                              letterSpacing: -0.02 * 28,
                            ),
                          ),
                        ],
                      ),
                      GestureDetector(
                        onTap: () => context.push('/profile'),
                        child: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppColors.ink,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.line),
                          ),
                          child: Center(
                            child: Text(
                              phone.isNotEmpty ? phone[0] : 'M',
                              style: AppTextStyles.bodyLarge.copyWith(
                                color: AppColors.cream,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ).animate().fadeIn(duration: 400.ms),
                ),
              ),

              // ── Payout warning ────────────────────────────────
              SliverToBoxAdapter(
                child: profileAsync.maybeWhen(
                  data: (profile) {
                    final sub = profile?['paystack_subaccount_id'] as String?;
                    if (sub != null && sub.isNotEmpty) return const SizedBox.shrink();
                    return _PayoutWarningBanner()
                        .animate()
                        .fadeIn(delay: 100.ms)
                        .slideY(begin: -0.1, end: 0, curve: Curves.easeOut);
                  },
                  orElse: () => const SizedBox.shrink(),
                ),
              ),

              // ── Hero balance card (navy) ───────────────────────
              SliverToBoxAdapter(
                child: cotisationsAsync.when(
                  data: (list) => _HeroCard(list: list, formatter: formatter),
                  loading: () => _HeroCardSkeleton(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              // ── Quick actions ─────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: _ActionButton(
                          label: '+ Nouvelle cagnotte',
                          primary: true,
                          onTap: () => context.push('/cotisation/create'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _ActionButton(
                          label: 'Comment ?',
                          primary: false,
                          onTap: () => _showHelpSheet(context),
                        ),
                      ),
                    ],
                  ),
                ).animate().fadeIn(delay: 200.ms),
              ),

              // ── Section title ─────────────────────────────────
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 28, 20, 14),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        'Mes cagnottes',
                        style: AppTextStyles.headlineMedium.copyWith(
                          fontSize: 22,
                          letterSpacing: -0.01 * 22,
                        ),
                      ),
                      Text(
                        'Voir tout',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.ink3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // ── List ──────────────────────────────────────────
              cotisationsAsync.when(
                data: (list) {
                  if (list.isEmpty) {
                    return SliverToBoxAdapter(child: _EmptyState());
                  }
                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: CotisationCard(
                            cotisation: list[i],
                            animIndex: i,
                            onTap: () => context.push('/cotisation/${list[i].id}'),
                          ),
                        ),
                        childCount: list.length,
                      ),
                    ),
                  );
                },
                loading: () => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(52),
                    child: Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(3, (i) => Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          decoration: BoxDecoration(
                            color: i == 1
                                ? AppColors.accentBright
                                : AppColors.paper2,
                            shape: BoxShape.circle,
                          ),
                        )
                            .animate(
                              delay: Duration(milliseconds: i * 150),
                              onPlay: (c) => c.repeat(reverse: true),
                            )
                            .scaleXY(begin: 0.4, end: 1.2, duration: 600.ms)),
                      ),
                    ),
                  ),
                ),
                error: (e, _) => SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        'Erreur : $e',
                        style: AppTextStyles.bodySmall.copyWith(color: AppColors.error),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _todayLabel() {
    final now = DateTime.now();
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const months = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin',
                    'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'];
    return '${days[now.weekday - 1]} ${now.day} ${months[now.month - 1]}';
  }
}

// ── Hero balance card (navy) ──────────────────────────────────

class _HeroCard extends StatelessWidget {
  final List<CotisationModel> list;
  final NumberFormat formatter;
  const _HeroCard({required this.list, required this.formatter});

  @override
  Widget build(BuildContext context) {
    final total  = list.fold<double>(0, (s, c) => s + c.currentAmount);
    final active = list.where((c) => c.isActive).length;
    final contributors = list.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.ink,
          borderRadius: BorderRadius.circular(22),
        ),
        padding: const EdgeInsets.fromLTRB(24, 26, 24, 22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Eyebrow
            Text(
              'TOTAL COLLECTÉ',
              style: AppTextStyles.caption.copyWith(
                color: Colors.white.withValues(alpha: 0.55),
                fontSize: 10,
              ),
            ),
            const SizedBox(height: 14),
            // Big amount
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  formatter.format(total),
                  style: AppTextStyles.amount.copyWith(
                    fontSize: 44,
                    color: Colors.white,
                    letterSpacing: -0.03 * 44,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'F',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: Colors.white.withValues(alpha: 0.55),
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),
            // Stats row
            Row(
              children: [
                _Stat(value: active.toString(), label: 'Actives', light: true),
                _Divider(),
                _Stat(value: contributors.toString(), label: 'Contributeurs', light: true),
                _Divider(),
                _Stat(
                  value: list.length.toString(),
                  label: 'Total',
                  accent: true,
                ),
              ],
            ),
          ],
        ),
      ).animate().fadeIn(delay: 150.ms).slideY(begin: 0.06, end: 0, curve: Curves.easeOutCubic),
    );
  }
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  final bool light;
  final bool accent;
  const _Stat({required this.value, required this.label, this.light = false, this.accent = false});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            color: Colors.white.withValues(alpha: 0.55),
            fontSize: 11,
            letterSpacing: 0,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: AppTextStyles.mono.copyWith(
            fontSize: 18,
            color: accent ? AppColors.accentBright : Colors.white,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 1,
    height: 32,
    margin: const EdgeInsets.symmetric(horizontal: 20),
    color: Colors.white.withValues(alpha: 0.15),
  );
}

class _HeroCardSkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Container(
        height: 150,
        decoration: BoxDecoration(
          color: AppColors.paper2,
          borderRadius: BorderRadius.circular(22),
        ),
      ).animate(onPlay: (c) => c.repeat(reverse: true))
          .shimmer(duration: 1200.ms, color: AppColors.line),
    );
  }
}

// ── Quick actions ─────────────────────────────────────────────

class _ActionButton extends StatelessWidget {
  final String label;
  final bool primary;
  final VoidCallback onTap;
  const _ActionButton({required this.label, required this.primary, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 56,
        decoration: BoxDecoration(
          color: primary ? AppColors.accentBright : AppColors.paper,
          borderRadius: BorderRadius.circular(16),
          border: primary ? null : Border.all(color: AppColors.line),
        ),
        child: Center(
          child: Text(
            label,
            style: AppTextStyles.bodyMedium.copyWith(
              color: primary ? Colors.white : AppColors.ink,
              fontWeight: FontWeight.w500,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.paper,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.accentBright.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '+',
                      style: AppTextStyles.displayLarge.copyWith(
                        color: AppColors.accent,
                        fontSize: 32,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Votre première cagnotte',
                  style: AppTextStyles.headlineMedium.copyWith(fontSize: 18),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Créez une cotisation, partagez le lien et recevez les fonds directement.',
                  style: AppTextStyles.bodyMedium.copyWith(height: 1.5),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                GestureDetector(
                  onTap: () => context.push('/cotisation/create'),
                  child: Container(
                    width: double.infinity,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.accentBright,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Center(
                      child: Text(
                        'Créer une cagnotte →',
                        style: AppTextStyles.bodyLarge.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 200.ms).scale(
              begin: const Offset(0.96, 0.96),
              duration: 400.ms,
              curve: Curves.easeOutBack),
        ],
      ),
    );
  }
}

// ── Payout warning ────────────────────────────────────────────

class _PayoutWarningBanner extends StatelessWidget {
  const _PayoutWarningBanner();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/profile/payout'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(20, 14, 20, 0),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.warn.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: AppColors.warn.withValues(alpha: 0.25),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: AppColors.warn,
                shape: BoxShape.circle,
              ),
              child: const Center(
                child: Text(
                  '!',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Configurez votre compte de versement pour recevoir les fonds.',
                style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.warn,
                  height: 1.4,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Icon(Icons.arrow_forward_ios_rounded, color: AppColors.warn, size: 12),
          ],
        ),
      ),
    );
  }
}

// ── Help bottom sheet ─────────────────────────────────────────

void _showHelpSheet(BuildContext context) {
  showModalBottomSheet(
    context: context,
    useRootNavigator: true,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (context) {
      return Container(
        decoration: const BoxDecoration(
          color: AppColors.cream,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Comment fonctionne MasterCota ?',
              style: AppTextStyles.headlineMedium.copyWith(fontSize: 20),
            ),
            const SizedBox(height: 8),
            Text(
              'Collectez en 3 étapes simples.',
              style: AppTextStyles.bodyMedium,
            ),
            const SizedBox(height: 24),
            _HelpStep(n: '1', title: 'Créez votre cagnotte', desc: 'Titre, description et objectif financier.'),
            const SizedBox(height: 16),
            _HelpStep(n: '2', title: 'Partagez le lien', desc: 'Via WhatsApp ou SMS — sans inscription nécessaire.'),
            const SizedBox(height: 16),
            _HelpStep(n: '3', title: 'Suivez et relancez', desc: 'Contributeurs en temps réel + rappels personnalisés.'),
          ],
        ),
      );
    },
  );
}

class _HelpStep extends StatelessWidget {
  final String n, title, desc;
  const _HelpStep({required this.n, required this.title, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: AppColors.accentBright.withValues(alpha: 0.12),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              n,
              style: AppTextStyles.bodyMedium.copyWith(
                color: AppColors.accent,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTextStyles.bodyLarge.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 3),
              Text(desc, style: AppTextStyles.bodySmall.copyWith(height: 1.4)),
            ],
          ),
        ),
      ],
    );
  }
}
