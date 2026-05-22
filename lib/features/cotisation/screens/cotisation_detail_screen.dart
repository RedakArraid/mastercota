import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/cotisation_provider.dart';
import '../models/cotisation_model.dart';
import '../widgets/contribution_dialog.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

class CotisationDetailScreen extends ConsumerStatefulWidget {
  final String cotisationId;
  const CotisationDetailScreen({super.key, required this.cotisationId});

  @override
  ConsumerState<CotisationDetailScreen> createState() =>
      _CotisationDetailScreenState();
}

class _CotisationDetailScreenState
    extends ConsumerState<CotisationDetailScreen>
    with SingleTickerProviderStateMixin {
  int _tabIndex = 0;

  @override
  Widget build(BuildContext context) {
    final cotAsync = ref.watch(cotisationStreamProvider(widget.cotisationId));
    final contrAsync =
        ref.watch(contributionsStreamProvider(widget.cotisationId));
    final formatter = NumberFormat('#,###', 'fr_FR');

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: cotAsync.when(
        data: (cot) {
          if (cot == null) {
            return Center(
              child: Text(
                'Cotisation introuvable',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink3),
              ),
            );
          }
          return Stack(
            children: [
              // ── Scrollable content ───────────────────────────
              SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 110),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    _TopBar(cot: cot),

                    // Editorial hero
                    _EditorialHero(cot: cot),

                    // Big number card
                    _BigNumberCard(cot: cot, formatter: formatter),

                    // Share strip
                    _ShareStrip(cot: cot),

                    // Tabs
                    _TabRow(
                      current: _tabIndex,
                      onTab: (i) => setState(() => _tabIndex = i),
                    ),

                    // Tab content
                    if (_tabIndex == 0)
                      _ActivityStream(
                        contrAsync: contrAsync,
                        formatter: formatter,
                      ),

                    const SizedBox(height: 32),
                  ],
                ),
              ),

              // ── Sticky action bar ────────────────────────────
              Positioned(
                bottom: 24,
                left: 16,
                right: 16,
                child: _ActionBar(cot: cot),
              ),
            ],
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.accentBright),
        ),
        error: (e, _) => Center(
          child: Text(
            'Erreur : $e',
            style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Top bar
// ─────────────────────────────────────────────────────────────────────────────

class _TopBar extends StatelessWidget {
  final CotisationModel cot;
  const _TopBar({required this.cot});

  void _share(BuildContext context) {
    HapticFeedback.mediumImpact();
    final url =
        'https://mastercota.com/c/${cot.slug}';
    final msg = cot.settings.shareMessage?.isNotEmpty == true
        ? '${cot.settings.shareMessage}\n$url'
        : 'Contribuez à "${cot.title}" sur MasterCota !\n$url';
    final encoded = Uri.encodeComponent(msg);
    launchUrl(
      Uri.parse('https://wa.me/?text=$encoded'),
      mode: LaunchMode.externalApplication,
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Back button
            GestureDetector(
              onTap: () {
                HapticFeedback.lightImpact();
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/home');
                }
              },
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.paper,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.line),
                ),
                child: const Center(
                  child: Text('←', style: TextStyle(fontSize: 16)),
                ),
              ),
            ),
            // Eyebrow title
            Text(
              'DÉTAIL',
              style: AppTextStyles.caption.copyWith(color: AppColors.ink3),
            ),
            // Share button
            GestureDetector(
              onTap: () => _share(context),
              child: Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: AppColors.paper,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.line),
                ),
                child: const Center(
                  child: Text('↗', style: TextStyle(fontSize: 16)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Editorial hero
// ─────────────────────────────────────────────────────────────────────────────

class _EditorialHero extends StatelessWidget {
  final CotisationModel cot;
  const _EditorialHero({required this.cot});

  @override
  Widget build(BuildContext context) {
    // Status eyebrow
    final String eyebrow;
    if (cot.isCompleted) {
      eyebrow = 'Terminé';
    } else if (cot.isActive) {
      eyebrow = 'En cours · J−${cot.daysRemaining}';
    } else {
      eyebrow = 'Expiré';
    }

    // Split title: put last word on gold serif-italic
    final words = cot.title.trim().split(' ');
    final String mainTitle;
    final String lastWord;
    if (words.length > 1) {
      mainTitle = words.sublist(0, words.length - 1).join(' ');
      lastWord = words.last;
    } else {
      mainTitle = cot.title;
      lastWord = '';
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status eyebrow
          Text(eyebrow, style: AppTextStyles.caption),
          const SizedBox(height: 10),
          // Large serif title
          RichText(
            text: TextSpan(
              style: AppTextStyles.headlineLarge.copyWith(
                fontSize: 36,
                letterSpacing: -0.02 * 36,
                height: 1.02,
              ),
              children: [
                if (lastWord.isNotEmpty) ...[
                  TextSpan(text: '$mainTitle\n'),
                  TextSpan(
                    text: '$lastWord.',
                    style: AppTextStyles.serifItalic.copyWith(
                      fontSize: 36,
                      color: AppColors.accent,
                    ),
                  ),
                ] else
                  TextSpan(text: mainTitle),
              ],
            ),
          ),
          // Description
          if (cot.description != null &&
              cot.description!.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              cot.description!,
              style: AppTextStyles.bodyMedium.copyWith(
                fontSize: 13,
                height: 1.5,
                color: AppColors.ink2,
              ),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ).animate().fadeIn(duration: 350.ms),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Big number card
// ─────────────────────────────────────────────────────────────────────────────

class _BigNumberCard extends StatelessWidget {
  final CotisationModel cot;
  final NumberFormat formatter;
  const _BigNumberCard({required this.cot, required this.formatter});

  @override
  Widget build(BuildContext context) {
    final progress = cot.progressPercent;
    final daysLeft = cot.daysRemaining.clamp(0, 9999);

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.paper,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AppColors.line),
        ),
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Labels row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('COLLECTÉ', style: AppTextStyles.caption),
                Text('OBJECTIF', style: AppTextStyles.caption),
              ],
            ),
            const SizedBox(height: 6),
            // Amounts row
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${formatter.format(cot.currentAmount)} F',
                  style: AppTextStyles.mono.copyWith(
                    fontSize: 38,
                    letterSpacing: -0.03 * 38,
                    color: AppColors.ink,
                  ),
                ),
                Text(
                  '${formatter.format(cot.targetAmount)} F',
                  style: AppTextStyles.mono.copyWith(
                    fontSize: 14,
                    color: AppColors.ink3,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            // 4px progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: progress.clamp(0.0, 1.0)),
                duration: const Duration(milliseconds: 900),
                curve: Curves.easeOutCubic,
                builder: (_, v, __) => SizedBox(
                  height: 4,
                  child: LinearProgressIndicator(
                    value: v,
                    backgroundColor: AppColors.paper2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      cot.isCompleted
                          ? AppColors.forest
                          : AppColors.accentBright,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            // Footer row: % atteint + jours restants
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text.rich(TextSpan(
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.ink2,
                  ),
                  children: [
                    TextSpan(
                      text: '${(progress * 100).toStringAsFixed(0)}%',
                      style: AppTextStyles.mono.copyWith(
                        color: AppColors.ink,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const TextSpan(text: ' atteint'),
                  ],
                )),
                Text(
                  '$daysLeft j restants',
                  style: AppTextStyles.mono.copyWith(
                    fontSize: 11,
                    color: AppColors.ink3,
                  ),
                ),
              ],
            ),
            // Mini stats grid
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.only(top: 16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.line)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _MiniStat(
                    value: '${(progress * 100).toStringAsFixed(0)}%',
                    label: 'Atteint',
                  ),
                  Container(width: 1, height: 28, color: AppColors.line),
                  _MiniStat(
                    value: formatter.format(
                        (cot.targetAmount - cot.currentAmount).clamp(0, double.infinity)),
                    label: 'Restant F',
                  ),
                  Container(width: 1, height: 28, color: AppColors.line),
                  _MiniStat(
                    value: '$daysLeft',
                    label: 'Jours restants',
                  ),
                ],
              ),
            ),
          ],
        ),
      ).animate().fadeIn(delay: 100.ms).slideY(
            begin: 0.1,
            end: 0,
            curve: Curves.easeOutCubic,
          ),
    );
  }
}

// ── Mini stat helper widget ───────────────────────────────────

class _MiniStat extends StatelessWidget {
  final String value;
  final String label;
  const _MiniStat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: AppTextStyles.mono.copyWith(
            fontSize: 16,
            letterSpacing: -0.01 * 16,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTextStyles.caption.copyWith(
            fontSize: 10,
            letterSpacing: 0,
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Share strip
// ─────────────────────────────────────────────────────────────────────────────

class _ShareStrip extends StatelessWidget {
  final CotisationModel cot;
  const _ShareStrip({required this.cot});

  Future<void> _openWhatsApp(BuildContext context, CotisationModel cot) async {
    final link = 'https://mastercota.com/c/${cot.slug}';
    final msg = cot.settings.shareMessage?.isNotEmpty == true
        ? '${cot.settings.shareMessage}\n$link'
        : 'Contribuez à "${cot.title}" sur MasterCota !\n$link';
    final encoded = Uri.encodeComponent(msg);
    final uri = Uri.parse('https://wa.me/?text=$encoded');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible d\'ouvrir WhatsApp')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final link = 'mastercota.com/c/${cot.slug}';
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      child: Container(
        padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
        decoration: BoxDecoration(
          border: Border.all(
            color: AppColors.line,
            style: BorderStyle.solid,
          ),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: [
            // Link text
            Expanded(
              child: Text(
                link,
                style: AppTextStyles.mono.copyWith(
                  fontSize: 11,
                  color: AppColors.ink3,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            // WhatsApp button
            GestureDetector(
              onTap: () => _openWhatsApp(context, cot),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppColors.ink,
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: AppColors.ink),
                ),
                child: Text(
                  'WhatsApp',
                  style: AppTextStyles.caption.copyWith(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0,
                  ),
                ),
              ),
            ),
          ],
        ),
      ).animate().fadeIn(delay: 200.ms),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────────────────

class _TabRow extends StatelessWidget {
  final int current;
  final ValueChanged<int> onTab;
  static const _tabs = ['Activité', 'Contributeurs', 'Réglages'];

  const _TabRow({required this.current, required this.onTab});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
      child: Row(
        children: List.generate(_tabs.length, (i) {
          final active = i == current;
          return GestureDetector(
            onTap: () => onTab(i),
            child: Container(
              margin: EdgeInsets.only(right: i < _tabs.length - 1 ? 8 : 0),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: active ? AppColors.ink : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: active ? AppColors.ink : AppColors.line,
                ),
              ),
              child: Text(
                _tabs[i],
                style: AppTextStyles.caption.copyWith(
                  color: active ? Colors.white : AppColors.ink3,
                  letterSpacing: 0,
                  fontSize: 12,
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity stream
// ─────────────────────────────────────────────────────────────────────────────

class _ActivityStream extends StatelessWidget {
  final AsyncValue<List<ContributionModel>> contrAsync;
  final NumberFormat formatter;
  const _ActivityStream({
    required this.contrAsync,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    return contrAsync.when(
      data: (list) {
        if (list.isEmpty) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
            child: Center(
              child: Text(
                'Aucune contribution',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.ink3),
              ),
            ),
          );
        }
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Column(
            children: list.asMap().entries.map((entry) {
              final idx = entry.key;
              final c = entry.value;
              return _ActivityRow(
                index: idx + 1,
                contribution: c,
                formatter: formatter,
              )
                  .animate(delay: Duration(milliseconds: 40 * idx))
                  .fadeIn(duration: 280.ms)
                  .slideY(begin: 0.06, end: 0, curve: Curves.easeOutQuad);
            }).toList(),
          ),
        );
      },
      loading: () => const Padding(
        padding: EdgeInsets.all(24),
        child: Center(
          child: CircularProgressIndicator(color: AppColors.accentBright),
        ),
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.all(20),
        child: Text(
          'Erreur : $e',
          style: AppTextStyles.bodySmall.copyWith(color: AppColors.error),
        ),
      ),
    );
  }
}

class _ActivityRow extends StatelessWidget {
  final int index;
  final ContributionModel contribution;
  final NumberFormat formatter;
  const _ActivityRow({
    required this.index,
    required this.contribution,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    final c = contribution;
    final timeLabel = _relativeTime(c.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Index number
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: AppColors.paper2,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                '$index',
                style: AppTextStyles.mono.copyWith(
                  fontSize: 11,
                  color: AppColors.ink3,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          // Name + timestamp
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        c.contributorName,
                        style: AppTextStyles.titleMedium.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    // Amount in mono
                    Text(
                      '${formatter.format(c.amount)} F',
                      style: AppTextStyles.mono.copyWith(
                        fontSize: 13,
                        color: AppColors.ink,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  timeLabel,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.ink4,
                    fontSize: 10,
                    letterSpacing: 0,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _relativeTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'À l\'instant';
    if (diff.inMinutes < 60) return 'Il y a ${diff.inMinutes} min';
    if (diff.inHours < 24) return 'Il y a ${diff.inHours} h';
    return 'Il y a ${diff.inDays} j';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky action bar
// ─────────────────────────────────────────────────────────────────────────────

class _ActionBar extends StatelessWidget {
  final CotisationModel cot;
  const _ActionBar({required this.cot});

  Future<void> _whatsApp(BuildContext context) async {
    final link = 'https://mastercota.com/c/${cot.slug}';
    final msg = cot.settings.shareMessage?.isNotEmpty == true
        ? '${cot.settings.shareMessage}\n$link'
        : 'Contribuez à "${cot.title}" sur MasterCota !\n$link';
    final encoded = Uri.encodeComponent(msg);
    final uri = Uri.parse('https://wa.me/?text=$encoded');
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.ink,
        borderRadius: BorderRadius.circular(22),
      ),
      padding: const EdgeInsets.all(6),
      child: Row(
        children: [
          // Share icon button
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              _whatsApp(context);
            },
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Center(
                child: Text(
                  '↗',
                  style: TextStyle(color: Colors.white, fontSize: 18),
                ),
              ),
            ),
          ),
          const SizedBox(width: 2),
          // Main CTA button
          Expanded(
            child: GestureDetector(
              onTap: () {
                HapticFeedback.mediumImpact();
                if (cot.isActive) {
                  ContributionDialog.show(
                    context,
                    cotisationId: cot.id,
                    cotisationTitle: cot.title,
                  );
                } else {
                  _whatsApp(context);
                }
              },
              child: Container(
                height: 52,
                decoration: BoxDecoration(
                  color: AppColors.accent,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Center(
                  child: Text(
                    cot.isActive
                        ? 'Relancer les retardataires'
                        : 'Partager',
                    style: AppTextStyles.bodyMedium.copyWith(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
