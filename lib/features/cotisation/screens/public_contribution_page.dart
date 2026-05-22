import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/cotisation_provider.dart';
import '../models/cotisation_model.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';

// ── Preset amounts (FCFA) ─────────────────────────────────
const _presetAmounts = [1000, 2000, 5000, 10000, 25000, 50000];

class PublicContributionPage extends ConsumerStatefulWidget {
  final String slug;
  const PublicContributionPage({super.key, required this.slug});

  @override
  ConsumerState<PublicContributionPage> createState() =>
      _PublicContributionPageState();
}

class _PublicContributionPageState
    extends ConsumerState<PublicContributionPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController();
  final _scrollController = ScrollController();

  int? _selectedPreset;
  bool _isLoading = false;
  bool _paymentInitiated = false;
  String? _checkoutUrl;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _amountController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _selectPreset(int amount) {
    HapticFeedback.selectionClick();
    setState(() {
      _selectedPreset = amount;
      _amountController.text = amount.toString();
    });
  }

  Future<void> _pay(String cotisationId) async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    try {
      final amount = double.parse(_amountController.text.trim());

      final response = await SupabaseService.client.functions.invoke(
        'paystack-initialize',
        body: {
          'cotisation_id': cotisationId,
          'amount': amount,
          'contributor_name': _nameController.text.trim(),
          'contributor_phone': _phoneController.text.trim(),
        },
      );

      if (response.status != 200) {
        throw Exception(
            response.data['error'] ?? 'Erreur d\'initialisation du paiement');
      }

      final authUrl = response.data['authorization_url'] as String;
      setState(() {
        _checkoutUrl = authUrl;
        _paymentInitiated = true;
      });

      final url = Uri.parse(authUrl);
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('Impossible d\'ouvrir la page de paiement');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content:
                Text('Erreur : ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cotAsync = ref.watch(cotisationBySlugProvider(widget.slug));

    return Scaffold(
      backgroundColor: AppColors.background,
      body: cotAsync.when(
        data: (cot) {
          if (cot == null) return _NotFoundPage(slug: widget.slug);
          return _buildPage(cot);
        },
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => _ErrorPage(error: e.toString()),
      ),
    );
  }

  Widget _buildPage(CotisationModel cot) {
    final formatter = NumberFormat('#,###', 'fr_FR');
    final contribAsync = ref.watch(publicContributionsProvider(cot.id));
    final colors = AppColors.cardGradients[
        cot.slug.hashCode.abs() % AppColors.cardGradients.length];
    final progress = cot.progressPercent;
    final isClosed = !cot.isActive && !cot.isCompleted;
    final s = cot.settings;

    return CustomScrollView(
      controller: _scrollController,
      slivers: [
        // ── Hero ─────────────────────────────────────────
        SliverAppBar(
          expandedHeight: 260,
          pinned: true,
          backgroundColor: Color(colors[1].value),
          automaticallyImplyLeading: false,
          flexibleSpace: FlexibleSpaceBar(
            background: _HeroSection(cot: cot, colors: colors),
          ),
        ),

        SliverToBoxAdapter(
          child: Column(
            children: [
              // ── Progress card ───────────────────────────
              if (s.showProgress)
                _ProgressSection(
                  cot: cot,
                  progress: progress,
                  formatter: formatter,
                  showTargetAmount: s.showTargetAmount,
                ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.05, end: 0),

              // ── Best contributor ────────────────────────
              if (s.showBestContributor)
                contribAsync.when(
                  data: (list) {
                    final paid = list.where((c) => c.isPaid).toList();
                    if (paid.isEmpty) return const SizedBox.shrink();
                    final best = paid.reduce(
                        (a, b) => a.amount >= b.amount ? a : b);
                    return _BestContributorCard(
                      contribution: best,
                      formatter: formatter,
                    ).animate().fadeIn(delay: 200.ms);
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),

              // ── Contributors preview ────────────────────
              if (s.showContributors)
                contribAsync.when(
                  data: (list) {
                    final paid = list.where((c) => c.isPaid).toList();
                    if (paid.isEmpty) return const SizedBox.shrink();
                    return _ContributorsPreview(
                            contributions: paid, formatter: formatter)
                        .animate()
                        .fadeIn(delay: 250.ms);
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),

              // ── Payment form or success ─────────────────
              if (!isClosed && !cot.isCompleted)
                _paymentInitiated
                    ? _PaymentSuccess(
                        checkoutUrl: _checkoutUrl!,
                        onReopen: () async {
                          final url = Uri.parse(_checkoutUrl!);
                          if (await canLaunchUrl(url)) {
                            await launchUrl(url,
                                mode: LaunchMode.externalApplication);
                          }
                        },
                        onBack: () =>
                            setState(() => _paymentInitiated = false),
                      ).animate().fadeIn()
                    : _PaymentForm(
                        cot: cot,
                        formKey: _formKey,
                        nameController: _nameController,
                        phoneController: _phoneController,
                        amountController: _amountController,
                        selectedPreset: _selectedPreset,
                        isLoading: _isLoading,
                        onPresetTap: _selectPreset,
                        onPay: () => _pay(cot.id),
                        anonymousAllowed: s.anonymousAllowed,
                      ).animate().fadeIn(delay: 300.ms)
              else
                _ClosedBanner(isCompleted: cot.isCompleted)
                    .animate()
                    .fadeIn(delay: 200.ms),

              // ── Footer ─────────────────────────────────
              const _Footer(),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Hero section ──────────────────────────────────────────

class _HeroSection extends StatelessWidget {
  final CotisationModel cot;
  final List<Color> colors;
  const _HeroSection({required this.cot, required this.colors});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: Stack(
        children: [
          // Decorative circles
          Positioned(
            top: -30,
            right: -30,
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
              ),
            ),
          ),
          Positioned(
            bottom: 20,
            left: -40,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.04),
              ),
            ),
          ),
          // Content
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  // Mastercota badge
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: Colors.white.withValues(alpha: 0.25)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.handshake_outlined,
                            color: Colors.white, size: 13),
                        const SizedBox(width: 5),
                        Text(
                          'Mastercota',
                          style: AppTextStyles.caption.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    cot.title,
                    style: AppTextStyles.displayMedium.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      height: 1.15,
                      shadows: [
                        const Shadow(
                          color: Colors.black26,
                          offset: Offset(0, 2),
                          blurRadius: 6,
                        ),
                      ],
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (cot.description != null &&
                      cot.description!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      cot.description!,
                      style: AppTextStyles.bodyMedium.copyWith(
                        color: Colors.white.withValues(alpha: 0.85),
                        height: 1.4,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Progress section ──────────────────────────────────────

// ── Best contributor card ────────────────────────────────

class _BestContributorCard extends StatelessWidget {
  final ContributionModel contribution;
  final NumberFormat formatter;
  const _BestContributorCard(
      {required this.contribution, required this.formatter});

  @override
  Widget build(BuildContext context) {
    final c = contribution;
    final initial = c.contributorName.isNotEmpty
        ? c.contributorName[0].toUpperCase()
        : '?';
    final gradIdx =
        c.contributorName.hashCode.abs() % AppColors.cardGradients.length;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFFFFB830).withValues(alpha: 0.08),
            const Color(0xFFFF8C00).withValues(alpha: 0.04),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
            color: const Color(0xFFFFB830).withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          // Trophy icon
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFFFFB830).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                  color: const Color(0xFFFFB830).withValues(alpha: 0.3)),
            ),
            child: const Center(
              child: Text('🏆', style: TextStyle(fontSize: 22)),
            ),
          ),
          const SizedBox(width: 12),
          // Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Meilleur contributeur',
                  style: AppTextStyles.caption.copyWith(
                    color: const Color(0xFFFFB830),
                    fontWeight: FontWeight.w700,
                    fontSize: 10,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  c.contributorName.isEmpty ? 'Anonyme' : c.contributorName,
                  style: AppTextStyles.titleMedium
                      .copyWith(fontWeight: FontWeight.w800),
                ),
              ],
            ),
          ),
          // Avatar + Amount
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                      colors: AppColors.cardGradients[gradIdx]),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    initial,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${formatter.format(c.amount)} F',
                style: AppTextStyles.bodySmall.copyWith(
                  color: const Color(0xFFFFB830),
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Progress section ──────────────────────────────────────

class _ProgressSection extends StatelessWidget {
  final CotisationModel cot;
  final double progress;
  final NumberFormat formatter;
  final bool showTargetAmount;
  const _ProgressSection(
      {required this.cot, required this.progress, required this.formatter, this.showTargetAmount = true});

  @override
  Widget build(BuildContext context) {
    final daysLeft = cot.daysRemaining.clamp(0, 9999);

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          // Amounts row
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Collecté',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${formatter.format(cot.currentAmount)} FCFA',
                      style: AppTextStyles.headlineLarge.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w800,
                        fontSize: 22,
                      ),
                    ),
                  ],
                ),
              ),
              if (showTargetAmount)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Objectif',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${formatter.format(cot.targetAmount)} FCFA',
                      style: AppTextStyles.titleLarge.copyWith(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 16),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: progress),
              duration: const Duration(milliseconds: 1000),
              curve: Curves.easeOutCubic,
              builder: (_, v, __) => SizedBox(
                height: 10,
                child: LinearProgressIndicator(
                  value: v,
                  backgroundColor: AppColors.borderLight,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    cot.isCompleted ? AppColors.success : AppColors.primary,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${(progress * 100).toStringAsFixed(0)}% atteint',
                style: AppTextStyles.bodySmall.copyWith(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              if (cot.isCompleted)
                Text(
                  '🎉 Objectif atteint !',
                  style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w700,
                  ),
                )
              else
                Row(
                  children: [
                    Icon(
                      Icons.schedule_rounded,
                      size: 12,
                      color: daysLeft <= 3
                          ? AppColors.warning
                          : AppColors.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$daysLeft jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: daysLeft <= 3
                            ? AppColors.warning
                            : AppColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Contributors preview ──────────────────────────────────

class _ContributorsPreview extends StatelessWidget {
  final List<ContributionModel> contributions;
  final NumberFormat formatter;
  const _ContributorsPreview(
      {required this.contributions, required this.formatter});

  @override
  Widget build(BuildContext context) {
    final recent = contributions.take(5).toList();

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.people_alt_outlined,
                  size: 16, color: AppColors.primary),
              const SizedBox(width: 8),
              Text(
                '${contributions.length} contributeur${contributions.length > 1 ? 's' : ''}',
                style: AppTextStyles.titleMedium.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Stacked avatars + names
          ...recent.asMap().entries.map((e) {
            final c = e.value;
            final initial = c.contributorName.isNotEmpty
                ? c.contributorName[0].toUpperCase()
                : '?';
            final gradIdx =
                c.contributorName.hashCode.abs() % AppColors.cardGradients.length;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                          colors: AppColors.cardGradients[gradIdx]),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Center(
                      child: Text(
                        initial,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      c.contributorName,
                      style: AppTextStyles.bodyMedium.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  Text(
                    '${formatter.format(c.amount)} FCFA',
                    style: AppTextStyles.bodySmall.copyWith(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            );
          }),
          if (contributions.length > 5)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '+ ${contributions.length - 5} autre${contributions.length - 5 > 1 ? 's' : ''}…',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Payment form ──────────────────────────────────────────

// ── Calcul des frais ──────────────────────────────────────
// Taux appliqué sur le montant brut (gross) envoyé à Paystack

const double _paystackRate = 0.015;
const double _paystackCap  = 2000.0;   // FCFA
const double _platformRate = 0.01;

double _calcPaystackFee(double gross) =>
    (gross * _paystackRate).clamp(0, _paystackCap);

double _calcPlatformFee(double gross) => gross * _platformRate;

double _calcNet(double gross) =>
    gross - _calcPaystackFee(gross) - _calcPlatformFee(gross);

// Calcul inverse : trouver le montant brut à partir du net souhaité
double _grossFromNet(double net) {
  // Seuil du plafond Paystack : au-dessus de 133 333 FCFA brut, le plafond s'applique
  const double threshold = _paystackCap / _paystackRate; // ~ 133 333 FCFA
  // Cas 1 : sous le seuil → gross = net / (1 - 0.015 - 0.01)
  final gross1 = net / (1 - _paystackRate - _platformRate);
  if (gross1 < threshold) return gross1;
  // Cas 2 : au-dessus du seuil → gross = (net + 2000) / (1 - 0.01)
  return (net + _paystackCap) / (1 - _platformRate);
}

class _PaymentForm extends StatefulWidget {
  final CotisationModel cot;
  final GlobalKey<FormState> formKey;
  final TextEditingController nameController;
  final TextEditingController phoneController;
  final TextEditingController amountController;
  final int? selectedPreset;
  final bool isLoading;
  final bool anonymousAllowed;
  final void Function(int) onPresetTap;
  final VoidCallback onPay;

  const _PaymentForm({
    required this.cot,
    required this.formKey,
    required this.nameController,
    required this.phoneController,
    required this.amountController,
    required this.selectedPreset,
    required this.isLoading,
    this.anonymousAllowed = false,
    required this.onPresetTap,
    required this.onPay,
  });

  @override
  State<_PaymentForm> createState() => _PaymentFormState();
}

class _PaymentFormState extends State<_PaymentForm> {
  // true = l'utilisateur saisit ce qu'il PAIE (montant brut)
  // false = l'utilisateur saisit ce qui ARRIVE dans la cagnotte (montant net)
  bool _modePay = true;
  final _inputController = TextEditingController();
  double? _grossAmount;   // montant facturé au contributeur
  double? _netAmount;     // montant qui arrive dans la cagnotte
  double? _paystackFee;
  double? _platformFee;

  @override
  void initState() {
    super.initState();
    _inputController.addListener(_recalculate);
    // Sync avec la valeur initiale de amountController si preset sélectionné
    if (widget.amountController.text.isNotEmpty) {
      _inputController.text = widget.amountController.text;
    }
  }

  @override
  void dispose() {
    _inputController.removeListener(_recalculate);
    _inputController.dispose();
    super.dispose();
  }

  void _recalculate() {
    final raw = double.tryParse(_inputController.text.trim());
    if (raw == null || raw <= 0) {
      setState(() {
        _grossAmount = null;
        _netAmount = null;
        _paystackFee = null;
        _platformFee = null;
        widget.amountController.text = '';
      });
      return;
    }

    final double gross2 = _modePay ? raw : _grossFromNet(raw);
    final double pstkFee = _calcPaystackFee(gross2);
    final double pltfFee = _calcPlatformFee(gross2);
    final double net2 = gross2 - pstkFee - pltfFee;

    setState(() {
      _grossAmount = gross2;
      _netAmount   = net2;
      _paystackFee = pstkFee;
      _platformFee = pltfFee;
      widget.amountController.text = gross2.toStringAsFixed(0);
    });
  }

  void _onPresetTap(int amount) {
    widget.onPresetTap(amount);
    setState(() => _modePay = true);
    _inputController.text = amount.toString();
  }

  void _switchMode(bool payMode) {
    if (_modePay == payMode) return;
    setState(() => _modePay = payMode);
    // Bascule la valeur affichée
    if (_grossAmount != null && _netAmount != null) {
      _inputController.removeListener(_recalculate);
      _inputController.text = payMode
          ? _grossAmount!.toStringAsFixed(0)
          : _netAmount!.toStringAsFixed(0);
      _inputController.addListener(_recalculate);
    }
  }

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat('#,###', 'fr_FR');
    final hasCalc = _grossAmount != null && _netAmount != null;
    final minAmount = widget.cot.settings.minAmount;

    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Form(
        key: widget.formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.volunteer_activism_rounded,
                      color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Faire une contribution',
                        style: AppTextStyles.titleLarge.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        'Paiement sécurisé par Paystack',
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Name field
            AppTextField(
              controller: widget.nameController,
              label: widget.anonymousAllowed
                  ? 'Votre nom (optionnel)'
                  : 'Votre nom complet',
              hint: widget.anonymousAllowed
                  ? 'Laisser vide pour rester anonyme'
                  : 'Ex: Kader Sylla',
              prefixIcon: Icon(
                widget.anonymousAllowed
                    ? Icons.person_off_outlined
                    : Icons.person_outline_rounded,
                color: AppColors.textSecondary,
                size: 20,
              ),
              textCapitalization: TextCapitalization.words,
              validator: widget.anonymousAllowed
                  ? null
                  : (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'Veuillez saisir votre nom';
                      }
                      return null;
                    },
            ),

            const SizedBox(height: 16),

            // Phone field
            AppTextField(
              controller: widget.phoneController,
              label: 'Votre numéro de téléphone',
              hint: 'Ex: +2250707070707',
              keyboardType: TextInputType.phone,
              prefixIcon: const Icon(Icons.phone_outlined,
                  color: AppColors.textSecondary, size: 20),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Veuillez saisir votre numéro';
                }
                final digits = val.replaceAll(RegExp(r'\D'), '');
                if (digits.length != 10 && digits.length != 13) {
                  return 'Numéro invalide (doit contenir 10 chiffres)';
                }
                return null;
              },
            ),

            const SizedBox(height: 20),

            // Preset amounts
            Text(
              'Choisissez un montant',
              style: AppTextStyles.labelLarge,
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _presetAmounts.map((amount) {
                final isSelected = widget.selectedPreset == amount;
                return GestureDetector(
                  onTap: () => _onPresetTap(amount),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary
                          : AppColors.surfaceElevated,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : AppColors.border,
                        width: isSelected ? 1.5 : 1,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.25),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              )
                            ]
                          : null,
                    ),
                    child: Text(
                      '${formatter.format(amount)} F',
                      style: AppTextStyles.bodySmall.copyWith(
                        color: isSelected
                            ? Colors.black
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 12,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),

            // ── Mode toggle ──────────────────────────────
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.surfaceElevated,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  _ModeTab(
                    label: 'Je veux payer',
                    icon: Icons.payments_outlined,
                    isActive: _modePay,
                    onTap: () => _switchMode(true),
                  ),
                  _ModeTab(
                    label: 'Mettre dans la cagnotte',
                    icon: Icons.savings_outlined,
                    isActive: !_modePay,
                    onTap: () => _switchMode(false),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Amount field
            AppTextField(
              controller: _inputController,
              label: _modePay
                  ? 'Montant que je paie'
                  : 'Montant à verser dans la cagnotte',
              hint: minAmount > 0
                  ? 'Min. ${formatter.format(minAmount)} FCFA'
                  : 'Ex: 10000',
              suffixText: 'FCFA',
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              prefixIcon: Icon(
                _modePay
                    ? Icons.payments_outlined
                    : Icons.savings_outlined,
                color: AppColors.textSecondary,
                size: 20,
              ),
              validator: (_) {
                // On valide via le amountController (montant brut)
                final val = widget.amountController.text.trim();
                if (val.isEmpty) return 'Veuillez saisir un montant';
                final amt = double.tryParse(val);
                if (amt == null || amt <= 0) return 'Montant invalide';
                if (minAmount > 0) {
                  final net = _modePay
                      ? _calcNet(amt)
                      : (_netAmount ?? 0);
                  if (net < minAmount) {
                    return 'Minimum dans la cagnotte : ${formatter.format(minAmount)} FCFA';
                  }
                }
                return null;
              },
            ),

            const SizedBox(height: 12),

            // ── Fee breakdown card ───────────────────────
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: hasCalc
                  ? _FeeBreakdown(
                      key: ValueKey('$_grossAmount'),
                      grossAmount: _grossAmount!,
                      netAmount: _netAmount!,
                      paystackFee: _paystackFee!,
                      platformFee: _platformFee!,
                      formatter: formatter,
                    )
                  : Container(
                      key: const ValueKey('empty'),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.borderLight),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.calculate_outlined,
                              color: AppColors.textTertiary, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            'Saisissez un montant pour voir la répartition des frais',
                            style: AppTextStyles.caption
                                .copyWith(color: AppColors.textTertiary),
                          ),
                        ],
                      ),
                    ),
            ),

            // Minimum amount badge
            if (minAmount > 0) ...[
              const SizedBox(height: 8),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.07),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: AppColors.warning.withValues(alpha: 0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.arrow_downward_rounded,
                        size: 12, color: AppColors.warning),
                    const SizedBox(width: 6),
                    Text(
                      'Contribution minimum fixée à ${formatter.format(minAmount)} FCFA',
                      style: AppTextStyles.caption.copyWith(
                        color: AppColors.warning,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 28),

            // Pay button
            AppButton(
              label: 'Payer par Mobile Money / Carte',
              icon: Icons.credit_card_rounded,
              isLoading: widget.isLoading,
              onPressed: widget.onPay,
            ),

            const SizedBox(height: 14),

            // Security note
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock_outline_rounded,
                    size: 12, color: AppColors.textTertiary),
                const SizedBox(width: 5),
                Text(
                  'Paiement 100% sécurisé — Chiffrement SSL',
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textTertiary,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ── Mode toggle tab ────────────────────────────────────────

class _ModeTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;

  const _ModeTab({
    required this.label,
    required this.icon,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeInOut,
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(
            color: isActive ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isActive
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    )
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 14,
                color: isActive ? Colors.black : AppColors.textSecondary,
              ),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  label,
                  style: AppTextStyles.caption.copyWith(
                    color: isActive ? Colors.black : AppColors.textSecondary,
                    fontWeight:
                        isActive ? FontWeight.w700 : FontWeight.w500,
                    fontSize: 11,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Fee summary card ────────────────────────────────────────

class _FeeBreakdown extends StatelessWidget {
  final double grossAmount;
  final double netAmount;
  final NumberFormat formatter;

  const _FeeBreakdown({
    super.key,
    required this.grossAmount,
    required this.netAmount,
    required this.formatter,
    // ignored — conservés pour compatibilité ascendante si besoin
    double paystackFee = 0,
    double platformFee = 0,
  });

  @override
  Widget build(BuildContext context) {
    final fee = grossAmount - netAmount;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        children: [
          // Ligne 1 : Vous payez
          Row(
            children: [
              Text('Vous payez',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary)),
              const Spacer(),
              Text(
                '${formatter.format(grossAmount.round())} FCFA',
                style: AppTextStyles.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text('Frais de service (2,5%)',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textTertiary, fontSize: 11)),
              const Spacer(),
              Text(
                '−${formatter.format(fee.round())} FCFA',
                style: AppTextStyles.caption.copyWith(
                    color: AppColors.textTertiary, fontSize: 11),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(color: AppColors.borderLight, height: 1),
          ),
          // Ligne 2 : Dans la cagnotte
          Row(
            children: [
              Expanded(
                child: Text(
                  'Dans la cagnotte',
                  style: AppTextStyles.bodySmall.copyWith(
                      fontWeight: FontWeight.w800, color: AppColors.success),
                ),
              ),
              Text(
                '${formatter.format(netAmount.round())} FCFA',
                style: AppTextStyles.titleMedium.copyWith(
                    fontWeight: FontWeight.w800, color: AppColors.success),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 250.ms).slideY(begin: 0.05, end: 0);
  }
}

// ── Payment success state ─────────────────────────────────

class _PaymentSuccess extends StatelessWidget {
  final String checkoutUrl;
  final VoidCallback onReopen;
  final VoidCallback onBack;
  const _PaymentSuccess(
      {required this.checkoutUrl,
      required this.onReopen,
      required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.1),
              shape: BoxShape.circle,
              border: Border.all(
                  color: AppColors.success.withValues(alpha: 0.3), width: 2),
            ),
            child: const Icon(Icons.check_rounded,
                color: AppColors.success, size: 48),
          ).animate().scale(duration: 500.ms, curve: Curves.elasticOut),
          const SizedBox(height: 20),
          Text(
            'Paiement initié !',
            style: AppTextStyles.headlineMedium
                .copyWith(fontWeight: FontWeight.w800),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            'La page sécurisée Paystack s\'est ouverte dans votre navigateur. Complétez le paiement pour valider votre contribution.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'La cotisation se mettra à jour automatiquement après confirmation.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodySmall.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 28),
          AppButton(
            label: 'Ouvrir à nouveau le lien de paiement',
            icon: Icons.open_in_browser_rounded,
            isSecondary: true,
            onPressed: onReopen,
          ),
          const SizedBox(height: 12),
          AppButton(
            label: 'Faire une autre contribution',
            icon: Icons.add_rounded,
            onPressed: onBack,
          ),
        ],
      ),
    );
  }
}

// ── Closed / Completed banner ─────────────────────────────

class _ClosedBanner extends StatelessWidget {
  final bool isCompleted;
  const _ClosedBanner({required this.isCompleted});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isCompleted
            ? AppColors.success.withValues(alpha: 0.08)
            : AppColors.error.withValues(alpha: 0.06),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isCompleted
              ? AppColors.success.withValues(alpha: 0.3)
              : AppColors.error.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        children: [
          Text(
            isCompleted ? '🎉' : '🔒',
            style: const TextStyle(fontSize: 48),
          ),
          const SizedBox(height: 12),
          Text(
            isCompleted ? 'Objectif atteint !' : 'Cotisation fermée',
            style: AppTextStyles.headlineMedium.copyWith(
              fontWeight: FontWeight.w800,
              color:
                  isCompleted ? AppColors.success : AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isCompleted
                ? 'Merci à tous les contributeurs ! L\'objectif a été atteint avec succès.'
                : 'Cette cotisation n\'accepte plus de nouvelles contributions.',
            textAlign: TextAlign.center,
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

// ── 404 page ──────────────────────────────────────────────

class _NotFoundPage extends StatelessWidget {
  final String slug;
  const _NotFoundPage({required this.slug});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('🔍', style: TextStyle(fontSize: 64)),
                const SizedBox(height: 20),
                Text(
                  'Cotisation introuvable',
                  style: AppTextStyles.headlineLarge
                      .copyWith(fontWeight: FontWeight.w800),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  'Le lien "$slug" ne correspond à aucune cotisation active.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Error page ────────────────────────────────────────────

class _ErrorPage extends StatelessWidget {
  final String error;
  const _ErrorPage({required this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.wifi_off_rounded,
                    size: 64, color: AppColors.textSecondary),
                const SizedBox(height: 20),
                Text(
                  'Erreur de connexion',
                  style: AppTextStyles.headlineLarge
                      .copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),
                Text(
                  'Vérifiez votre connexion internet et réessayez.',
                  textAlign: TextAlign.center,
                  style: AppTextStyles.bodyMedium.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Footer ────────────────────────────────────────────────

class _Footer extends StatelessWidget {
  const _Footer();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
      child: Column(
        children: [
          const Divider(color: AppColors.borderLight),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.handshake_rounded,
                  color: AppColors.primary, size: 16),
              const SizedBox(width: 6),
              Text(
                'Mastercota',
                style: AppTextStyles.titleMedium.copyWith(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Plateforme de cotisations communautaires',
            style: AppTextStyles.caption.copyWith(
              color: AppColors.textTertiary,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline_rounded,
                  size: 11, color: AppColors.textTertiary),
              const SizedBox(width: 4),
              Text(
                'Paiements sécurisés par ',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.textTertiary,
                  fontSize: 10,
                ),
              ),
              Text(
                'Paystack',
                style: AppTextStyles.caption.copyWith(
                  color: AppColors.accent,
                  fontWeight: FontWeight.w700,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
