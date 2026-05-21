import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';

const double _dialogPaystackRate = 0.015;
const double _dialogPlatformRate = 0.01;
const double _dialogTotalFeeRate = _dialogPaystackRate + _dialogPlatformRate;
const double _dialogPaystackFeeCap = 2000; // FCFA

class ContributionDialog extends StatefulWidget {
  final String cotisationId;
  final String cotisationTitle;

  const ContributionDialog({
    super.key,
    required this.cotisationId,
    required this.cotisationTitle,
  });

  static Future<void> show(BuildContext context, {
    required String cotisationId,
    required String cotisationTitle,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ContributionDialog(
        cotisationId: cotisationId,
        cotisationTitle: cotisationTitle,
      ),
    );
  }

  @override
  State<ContributionDialog> createState() => _ContributionDialogState();
}

class _ContributionDialogState extends State<ContributionDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _amountController = TextEditingController(); // montant brut (envoyé à Paystack)
  final _inputController = TextEditingController();  // montant saisi par l'utilisateur

  bool _isLoading = false;
  String? _checkoutUrl;

  // Calculateur
  bool _modePay = true;
  double? _grossAmount;
  double? _netAmount;
  double? _paystackFee;
  double? _platformFee;
  final _formatter = NumberFormat('#,###', 'fr_FR');

  @override
  void initState() {
    super.initState();
    _inputController.addListener(_recalculate);
  }

  void _recalculate() {
    final raw = double.tryParse(_inputController.text.trim());
    if (raw == null || raw <= 0) {
      setState(() {
        _grossAmount = _netAmount = _paystackFee = _platformFee = null;
        _amountController.text = '';
      });
      return;
    }
    double gross, net, paystackFee, platformFee;
    if (_modePay) {
      gross = raw;
      paystackFee = (gross * _dialogPaystackRate).clamp(0, _dialogPaystackFeeCap);
      platformFee = gross * _dialogPlatformRate;
    } else {
      net = raw;
      // Tentative sans plafond
      final grossNoCap = net / (1 - _dialogTotalFeeRate);
      if (grossNoCap * _dialogPaystackRate <= _dialogPaystackFeeCap) {
        gross = grossNoCap;
        paystackFee = gross * _dialogPaystackRate;
      } else {
        // Plafond Paystack atteint : paystackFee = 2000, platformFee = gross * 1%
        // net = gross * (1 - 0.01) - 2000  →  gross = (net + 2000) / 0.99
        gross = (net + _dialogPaystackFeeCap) / (1 - _dialogPlatformRate);
        paystackFee = _dialogPaystackFeeCap;
      }
      platformFee = gross * _dialogPlatformRate;
    }
    net = gross - paystackFee - platformFee;
    setState(() {
      _grossAmount = gross;
      _netAmount = net;
      _paystackFee = paystackFee;
      _platformFee = platformFee;
      _amountController.text = gross.toStringAsFixed(0);
    });
  }

  void _switchMode(bool payMode) {
    if (_modePay == payMode) return;
    setState(() => _modePay = payMode);
    if (_grossAmount != null && _netAmount != null) {
      _inputController.removeListener(_recalculate);
      _inputController.text = payMode
          ? _grossAmount!.toStringAsFixed(0)
          : _netAmount!.toStringAsFixed(0);
      _inputController.addListener(_recalculate);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _amountController.dispose();
    _inputController.removeListener(_recalculate);
    _inputController.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    try {
      final amount = double.parse(_amountController.text.trim());

      final response = await SupabaseService.client.functions.invoke(
        'paystack-initialize',
        body: {
          'cotisation_id': widget.cotisationId,
          'amount': amount,
          'contributor_name': _nameController.text.trim(),
          'contributor_phone': _phoneController.text.trim(),
        },
      );

      if (response.status != 200) {
        throw Exception(response.data['error'] ?? 'Erreur d\'initialisation');
      }

      final authUrl = response.data['authorization_url'] as String;
      setState(() {
        _checkoutUrl = authUrl;
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
            content: Text('Erreur : ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + bottomInset),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(28),
          topRight: Radius.circular(28),
        ),
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1.5),
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 24),

            if (_checkoutUrl == null) ...[
              Text(
                'Faire une contribution',
                style: AppTextStyles.headlineMedium.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Soutenez la cotisation "${widget.cotisationTitle}"',
                style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 28),

              Form(
                key: _formKey,
                child: Column(
                  children: [
                    AppTextField(
                      controller: _nameController,
                      label: 'Votre Nom complet',
                      hint: 'Ex: Kader Sylla',
                      textCapitalization: TextCapitalization.words,
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Veuillez saisir votre nom';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 18),
                    AppTextField(
                      controller: _phoneController,
                      label: 'Votre Numéro de téléphone',
                      hint: 'Ex: +22507080910',
                      keyboardType: TextInputType.phone,
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Veuillez saisir votre téléphone';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),

                    // ── Mode toggle ──
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceElevated,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          _DialogModeTab(
                            label: 'Je veux payer',
                            icon: Icons.payments_outlined,
                            isActive: _modePay,
                            onTap: () => _switchMode(true),
                          ),
                          _DialogModeTab(
                            label: 'Mettre dans la cagnotte',
                            icon: Icons.savings_outlined,
                            isActive: !_modePay,
                            onTap: () => _switchMode(false),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Montant
                    AppTextField(
                      controller: _inputController,
                      label: _modePay ? 'Montant que je paie' : 'Montant à verser dans la cagnotte',
                      hint: 'Ex: 5000',
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      suffixText: 'FCFA',
                      prefixIcon: Icon(
                        _modePay ? Icons.payments_outlined : Icons.savings_outlined,
                        color: AppColors.textSecondary, size: 20,
                      ),
                      validator: (_) {
                        final val = _amountController.text.trim();
                        if (val.isEmpty) return 'Veuillez saisir le montant';
                        final amt = double.tryParse(val);
                        if (amt == null || amt <= 0) return 'Montant invalide';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),

                    // ── Breakdown ──
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 280),
                      child: (_grossAmount != null && _netAmount != null && _paystackFee != null && _platformFee != null)
                          ? _DialogFeeBreakdown(
                              key: ValueKey('$_grossAmount'),
                              grossAmount: _grossAmount!,
                              netAmount: _netAmount!,
                              paystackFee: _paystackFee!,
                              platformFee: _platformFee!,
                              formatter: _formatter,
                            )
                          : Container(
                              key: const ValueKey('empty'),
                              padding: const EdgeInsets.all(13),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(12),
                                border:
                                    Border.all(color: AppColors.borderLight),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.calculate_outlined,
                                      color: AppColors.textTertiary, size: 15),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Répartition des frais affichée ici',
                                    style: AppTextStyles.caption.copyWith(
                                        color: AppColors.textTertiary),
                                  ),
                                ],
                              ),
                            ),
                    ),

                    const SizedBox(height: 28),

                    AppButton(
                      label: 'Payer par Mobile Money / Carte',
                      icon: Icons.credit_card_rounded,
                      isLoading: _isLoading,
                      onPressed: _pay,
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Checkout Redirecting state
              Center(
                child: Column(
                  children: [
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2), width: 2),
                      ),
                      child: const Icon(
                        Icons.payments_outlined,
                        color: AppColors.primary,
                        size: 64,
                      ),
                    ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
                    const SizedBox(height: 28),
                    Text(
                      'Paiement initié',
                      style: AppTextStyles.headlineMedium.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'La page sécurisée Paystack s\'est ouverte dans votre navigateur.',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary, height: 1.5),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Une fois validé, la cotisation s\'actualisera automatiquement.',
                      textAlign: TextAlign.center,
                      style: AppTextStyles.bodySmall.copyWith(color: AppColors.primary, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 40),
                    AppButton(
                      label: 'Ouvrir à nouveau la page',
                      icon: Icons.open_in_browser_rounded,
                      isSecondary: true,
                      onPressed: () async {
                        final url = Uri.parse(_checkoutUrl!);
                        if (await canLaunchUrl(url)) {
                          await launchUrl(url, mode: LaunchMode.externalApplication);
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    AppButton(
                      label: 'Retour à la cotisation',
                      icon: Icons.arrow_back_rounded,
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Dialog mode tab ────────────────────────────────────────

class _DialogModeTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isActive;
  final VoidCallback onTap;
  const _DialogModeTab(
      {required this.label,
      required this.icon,
      required this.isActive,
      required this.onTap});

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
                        offset: const Offset(0, 3))
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon,
                  size: 14,
                  color: isActive ? Colors.black : AppColors.textSecondary),
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

// ── Dialog fee breakdown ───────────────────────────────────

class _DialogFeeBreakdown extends StatelessWidget {
  final double grossAmount;
  final double netAmount;
  final double paystackFee;
  final double platformFee;
  final NumberFormat formatter;

  const _DialogFeeBreakdown({
    super.key,
    required this.grossAmount,
    required this.netAmount,
    required this.paystackFee,
    required this.platformFee,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    final paystackCapped = paystackFee >= _dialogPaystackFeeCap;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Text('Vous payez',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary)),
              const Spacer(),
              Text('${formatter.format(grossAmount.round())} FCFA',
                  style: AppTextStyles.bodySmall.copyWith(
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                paystackCapped
                    ? 'Frais Paystack (plafonné)'
                    : 'Frais Paystack (1,5%)',
                style: AppTextStyles.caption.copyWith(
                    color: AppColors.textTertiary, fontSize: 11)),
              const Spacer(),
              Text('−${formatter.format(paystackFee.round())} FCFA',
                  style: AppTextStyles.caption.copyWith(
                      color: AppColors.textTertiary, fontSize: 11)),
            ],
          ),
          const SizedBox(height: 3),
          Row(
            children: [
              Text('Commission Mastercota (1%)',
                  style: AppTextStyles.caption.copyWith(
                      color: AppColors.textTertiary, fontSize: 11)),
              const Spacer(),
              Text('−${formatter.format(platformFee.round())} FCFA',
                  style: AppTextStyles.caption.copyWith(
                      color: AppColors.textTertiary, fontSize: 11)),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(color: AppColors.borderLight, height: 1),
          ),
          Row(
            children: [
              Expanded(
                child: Text('Dans la cagnotte',
                    style: AppTextStyles.bodySmall.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.success)),
              ),
              Text('${formatter.format(netAmount.round())} FCFA',
                  style: AppTextStyles.titleMedium.copyWith(
                      fontWeight: FontWeight.w800, color: AppColors.success)),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color color;
  const _Row(this.label, this.value,
      {this.bold = false, required this.color});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(label,
              style: AppTextStyles.caption.copyWith(
                color: color,
                fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              )),
        ),
        Text(value,
            style: AppTextStyles.bodySmall.copyWith(
              color: color,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
            )),
      ],
    );
  }
}
