import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/utils/fees.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_text_field.dart';

class ContributionDialog extends StatefulWidget {
  final String cotisationId;
  final String cotisationTitle;

  const ContributionDialog({
    super.key,
    required this.cotisationId,
    required this.cotisationTitle,
  });

  static Future<void> show(
    BuildContext context, {
    required String cotisationId,
    required String cotisationTitle,
  }) {
    return showDialog(
      context: context,
      useRootNavigator: true,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          16 + MediaQuery.of(ctx).viewInsets.bottom,
        ),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 500),
          child: ContributionDialog(
            cotisationId: cotisationId,
            cotisationTitle: cotisationTitle,
          ),
        ),
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
  final _netController = TextEditingController();

  bool _isLoading = false;
  String? _checkoutUrl;
  FeeQuote? _quote;
  final _formatter = NumberFormat('#,###', 'fr_FR');

  @override
  void initState() {
    super.initState();
    _netController.addListener(_onNetChanged);
  }

  void _onNetChanged() {
    final raw = double.tryParse(_netController.text.trim());
    setState(() {
      _quote = raw == null ? null : Fees.fromNet(raw);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _netController.removeListener(_onNetChanged);
    _netController.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (!_formKey.currentState!.validate()) return;
    final quote = _quote;
    if (quote == null) return;

    setState(() => _isLoading = true);
    HapticFeedback.mediumImpact();

    try {
      final response = await ApiService.post('/api/paystack/initialize', body: {
        'cotisation_id': widget.cotisationId,
        'amount': quote.net,
        'contributor_name': _nameController.text.trim(),
        'contributor_phone': _phoneController.text.trim(),
      });

      final authUrl = response['authorization_url'] as String;
      setState(() => _checkoutUrl = authUrl);

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
            content: Text(
                'Erreur : ${e.toString().replaceAll('Exception: ', '')}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + bottomInset),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: AppColors.border, width: 1.5),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            if (_checkoutUrl == null) ...[
              Text(
                'Faire une contribution',
                style: AppTextStyles.headlineMedium
                    .copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                'Soutenez la cotisation "${widget.cotisationTitle}"',
                style: AppTextStyles.bodyMedium
                    .copyWith(color: AppColors.textSecondary),
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
                    AppTextField(
                      controller: _netController,
                      label: 'Montant dans la cotisation',
                      hint: '10 000',
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly
                      ],
                      suffixText: 'F',
                      prefixIcon: const Icon(Icons.savings_outlined,
                          color: AppColors.textSecondary, size: 18),
                      validator: (_) {
                        if (_quote == null) return 'Saisir un montant';
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 280),
                      child: _quote != null
                          ? _DialogFeeBreakdown(
                              key: ValueKey(_quote!.gross),
                              quote: _quote!,
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
                                    'Saisissez un montant pour voir les frais',
                                    style: AppTextStyles.caption.copyWith(
                                        color: AppColors.textTertiary),
                                  ),
                                ],
                              ),
                            ),
                    ),
                    const SizedBox(height: 28),
                    AppButton(
                      label: _quote == null
                          ? 'Payer par Mobile Money / Carte'
                          : 'Payer ${_formatter.format(_quote!.gross)} F',
                      icon: Icons.credit_card_rounded,
                      isLoading: _isLoading,
                      onPressed: _pay,
                    ),
                  ],
                ),
              ),
            ] else ...[
              Center(
                child: Column(
                  children: [
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                        border: Border.all(
                            color: AppColors.primary.withValues(alpha: 0.2),
                            width: 2),
                      ),
                      child: const Icon(
                        Icons.payments_outlined,
                        color: AppColors.primary,
                        size: 64,
                      ),
                    ).animate().scale(
                        duration: 400.ms, curve: Curves.easeOutBack),
                    const SizedBox(height: 28),
                    Text(
                      'Redirection vers le paiement…',
                      style: AppTextStyles.titleLarge
                          .copyWith(fontWeight: FontWeight.w700),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Finalisez le paiement dans votre navigateur, puis revenez ici.',
                      style: AppTextStyles.bodyMedium
                          .copyWith(color: AppColors.textSecondary),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 28),
                    TextButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Fermer'),
                    ),
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

class _DialogFeeBreakdown extends StatelessWidget {
  final FeeQuote quote;
  final NumberFormat formatter;

  const _DialogFeeBreakdown({
    super.key,
    required this.quote,
    required this.formatter,
  });

  @override
  Widget build(BuildContext context) {
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
              Text('Dans la cotisation',
                  style: AppTextStyles.caption
                      .copyWith(color: AppColors.textSecondary)),
              const Spacer(),
              Text(
                '${formatter.format(quote.net)} F',
                style: AppTextStyles.bodySmall
                    .copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text('Frais de service (${Fees.serviceFeeLabel})',
                  style: AppTextStyles.caption.copyWith(
                      color: AppColors.textTertiary, fontSize: 11)),
              const Spacer(),
              Text(
                '+${formatter.format(quote.fee)} F',
                style: AppTextStyles.caption.copyWith(
                    color: AppColors.textTertiary, fontSize: 11),
              ),
            ],
          ),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(color: AppColors.borderLight, height: 1),
          ),
          Row(
            children: [
              Text('Vous payez',
                  style: AppTextStyles.bodySmall
                      .copyWith(fontWeight: FontWeight.w700)),
              const Spacer(),
              Text(
                '${formatter.format(quote.gross)} F',
                style: AppTextStyles.bodySmall.copyWith(
                    fontWeight: FontWeight.w800, color: AppColors.primary),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}
