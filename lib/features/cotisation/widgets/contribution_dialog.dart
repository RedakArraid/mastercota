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
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      constraints: const BoxConstraints(maxWidth: 550),
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
  final _grossController = TextEditingController(); // montant payé (envoyé à Paystack)
  final _netController = TextEditingController();   // montant dans la cagnotte

  bool _isLoading = false;
  String? _checkoutUrl;
  bool _isUpdating = false;

  double? _paystackFee;
  double? _platformFee;
  final _formatter = NumberFormat('#,###', 'fr_FR');

  @override
  void initState() {
    super.initState();
    _grossController.addListener(_onGrossChanged);
    _netController.addListener(_onNetChanged);
  }

  void _onGrossChanged() {
    if (_isUpdating) return;
    final raw = double.tryParse(_grossController.text.trim());
    if (raw == null || raw <= 0) {
      _isUpdating = true;
      _netController.text = '';
      _isUpdating = false;
      setState(() { _paystackFee = null; _platformFee = null; });
      return;
    }
    final gross = raw;
    final paystackFee = (gross * _dialogPaystackRate).clamp(0.0, _dialogPaystackFeeCap);
    final platformFee = gross * _dialogPlatformRate;
    final net = gross - paystackFee - platformFee;
    _isUpdating = true;
    _netController.text = net.toStringAsFixed(0);
    _isUpdating = false;
    setState(() { _paystackFee = paystackFee; _platformFee = platformFee; });
  }

  void _onNetChanged() {
    if (_isUpdating) return;
    final raw = double.tryParse(_netController.text.trim());
    if (raw == null || raw <= 0) {
      _isUpdating = true;
      _grossController.text = '';
      _isUpdating = false;
      setState(() { _paystackFee = null; _platformFee = null; });
      return;
    }
    final net = raw;
    double gross, paystackFee;
    final grossNoCap = net / (1 - _dialogTotalFeeRate);
    if (grossNoCap * _dialogPaystackRate <= _dialogPaystackFeeCap) {
      gross = grossNoCap;
      paystackFee = gross * _dialogPaystackRate;
    } else {
      gross = (net + _dialogPaystackFeeCap) / (1 - _dialogPlatformRate);
      paystackFee = _dialogPaystackFeeCap;
    }
    final platformFee = gross * _dialogPlatformRate;
    _isUpdating = true;
    _grossController.text = gross.toStringAsFixed(0);
    _isUpdating = false;
    setState(() { _paystackFee = paystackFee; _platformFee = platformFee; });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _grossController.removeListener(_onGrossChanged);
    _grossController.dispose();
    _netController.removeListener(_onNetChanged);
    _netController.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    try {
      final amount = double.parse(_grossController.text.trim());

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
                      hint: 'Ex: +2250707070707',
                      keyboardType: TextInputType.phone,
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Veuillez saisir votre téléphone';
                        }
                        final digits = val.replaceAll(RegExp(r'\D'), '');
                        if (digits.length != 10 && digits.length != 13) {
                          return 'Numéro invalide (doit contenir 10 chiffres)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 20),

                    // ── Deux champs synchronisés ──
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: AppTextField(
                            controller: _grossController,
                            label: 'Je veux payer',
                            hint: '5 000',
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            suffixText: 'F',
                            prefixIcon: const Icon(Icons.payments_outlined,
                                color: AppColors.textSecondary, size: 18),
                            validator: (_) {
                              final val = _grossController.text.trim();
                              if (val.isEmpty) return 'Saisir un montant';
                              final amt = double.tryParse(val);
                              if (amt == null || amt <= 0) return 'Invalide';
                              return null;
                            },
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.only(top: 28),
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 8),
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceElevated,
                              shape: BoxShape.circle,
                              border: Border.all(color: AppColors.border),
                            ),
                            child: const Icon(Icons.swap_horiz_rounded,
                                size: 16, color: AppColors.textTertiary),
                          ),
                        ),
                        Expanded(
                          child: AppTextField(
                            controller: _netController,
                            label: 'Dans la cagnotte',
                            hint: '4 850',
                            keyboardType: TextInputType.number,
                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                            suffixText: 'F',
                            prefixIcon: const Icon(Icons.savings_outlined,
                                color: AppColors.textSecondary, size: 18),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // ── Résumé frais ──
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 280),
                      child: (_paystackFee != null && _platformFee != null)
                          ? _DialogFeeBreakdown(
                              key: ValueKey('${_paystackFee}_$_platformFee'),
                              totalFee: _paystackFee! + _platformFee!,
                              net: double.parse(_netController.text.isEmpty ? '0' : _netController.text),
                              formatter: _formatter,
                            )
                          : Container(
                              key: const ValueKey('empty'),
                              padding: const EdgeInsets.all(13),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceElevated,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.calculate_outlined,
                                      color: AppColors.textTertiary, size: 15),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Saisissez un montant pour voir la répartition',
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

// ── Dialog fee summary (global, sans détail de la marge) ──────────────────────

class _DialogFeeBreakdown extends StatelessWidget {
  final double totalFee;
  final double net;
  final NumberFormat formatter;

  const _DialogFeeBreakdown({
    super.key,
    required this.totalFee,
    required this.net,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded,
              size: 13, color: AppColors.textTertiary),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Frais de service inclus • Dans la cagnotte : ${formatter.format(net.round())} F',
              style: AppTextStyles.caption.copyWith(
                  color: AppColors.textTertiary, fontSize: 11, height: 1.4),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '−${formatter.format(totalFee.round())} F',
            style: AppTextStyles.caption.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w700,
                fontSize: 11),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}
