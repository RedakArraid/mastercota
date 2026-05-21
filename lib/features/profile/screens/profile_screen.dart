import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/constants/app_constants.dart';
import '../../../core/services/supabase_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_text_styles.dart';
import '../../../core/widgets/glass_card.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  // ── Helpers ──────────────────────────────────────────────

  static void _showComingSoon(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature — bientôt disponible'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppColors.surfaceElevated,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  static Future<void> _openSupport() async {
    final email = Uri.parse(
      'mailto:support@mastercota.com?subject=Support%20Mastercota',
    );
    final whatsapp = Uri.parse('https://wa.me/2250000000000');
    if (await canLaunchUrl(email)) {
      await launchUrl(email);
    } else if (await canLaunchUrl(whatsapp)) {
      await launchUrl(whatsapp, mode: LaunchMode.externalApplication);
    }
  }

  static void _showPrivacy(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.92,
        minChildSize: 0.4,
        builder: (_, controller) => Container(
          decoration: const BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
                child: Row(
                  children: [
                    const Icon(Icons.lock_outline_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 10),
                    Text('Politique de confidentialité',
                        style: AppTextStyles.headlineSmall.copyWith(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  controller: controller,
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
                  children: [
                    _PrivacySection(
                      title: 'Données collectées',
                      body: 'Mastercota collecte votre numéro de téléphone pour l\'authentification par OTP, ainsi que les informations des cotisations que vous créez (titre, description, montant, deadline).',
                    ),
                    _PrivacySection(
                      title: 'Utilisation des données',
                      body: 'Vos données servent uniquement à faire fonctionner l\'application : authentification, création et suivi de cotisations, et initialisation des paiements via Paystack.',
                    ),
                    _PrivacySection(
                      title: 'Paiements',
                      body: 'Les transactions sont traitées par Paystack (PCI-DSS). Mastercota ne stocke jamais vos informations bancaires ou de carte.',
                    ),
                    _PrivacySection(
                      title: 'Partage des données',
                      body: 'Nous ne vendons ni ne partageons vos données personnelles avec des tiers. Seul Paystack reçoit les informations nécessaires au traitement de paiement.',
                    ),
                    _PrivacySection(
                      title: 'Suppression de compte',
                      body: 'Pour supprimer votre compte et vos données, contactez-nous à support@mastercota.com. Toutes vos données seront supprimées dans les 30 jours.',
                    ),
                    _PrivacySection(
                      title: 'Contact',
                      body: 'Pour toute question relative à la confidentialité : support@mastercota.com',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Dernière mise à jour : mai 2026',
                      style: AppTextStyles.caption.copyWith(color: AppColors.textTertiary),
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

  static void _showAbout(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 20,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: const Center(
                  child: Text('₣', style: TextStyle(fontSize: 36, color: Colors.white, fontWeight: FontWeight.w900)),
                ),
              ),
              const SizedBox(height: 16),
              Text(AppConstants.appName,
                  style: AppTextStyles.headlineLarge.copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(AppConstants.appTagline,
                  style: AppTextStyles.bodySmall.copyWith(color: AppColors.textSecondary),
                  textAlign: TextAlign.center),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text('Version 1.0.0',
                    style: AppTextStyles.caption.copyWith(
                        color: AppColors.textTertiary, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 20),
              const Divider(color: AppColors.border),
              const SizedBox(height: 12),
              Text(
                'Mastercota simplifie les cotisations collectives en Afrique de l\'Ouest grâce à la technologie mobile et aux paiements sécurisés.',
                style: AppTextStyles.bodySmall.copyWith(
                    color: AppColors.textSecondary, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.surfaceElevated,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text('Fermer',
                      style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phone = SupabaseService.currentUser?.phone ?? '';
    final profileAsync = ref.watch(userProfileProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppColors.backgroundGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 16, 24, 0),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
                      onPressed: () => context.pop(),
                      color: AppColors.textPrimary,
                    ),
                    Text('Profil', style: AppTextStyles.headlineLarge),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      // User header card
                      GlassCard(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            Container(
                              width: 88,
                              height: 88,
                              decoration: BoxDecoration(
                                gradient: AppColors.primaryGradient,
                                borderRadius: BorderRadius.circular(28),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primary.withValues(alpha: 0.3),
                                    blurRadius: 24,
                                    spreadRadius: 1,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: const Center(
                                child: Text('👤', style: TextStyle(fontSize: 38)),
                              ),
                            )
                                .animate()
                                .scale(
                                    duration: 500.ms,
                                    curve: Curves.elasticOut,
                                    begin: const Offset(0.7, 0.7))
                                .fadeIn(),

                            const SizedBox(height: 16),

                            Text(
                              phone.isNotEmpty ? phone : '+225 01 02 03 04',
                              style: AppTextStyles.headlineMedium,
                            ).animate().fadeIn(delay: 150.ms),

                            const SizedBox(height: 8),

                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: AppColors.primary.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.verified_rounded,
                                      color: AppColors.primary, size: 14),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Membre certifié',
                                    style: AppTextStyles.caption.copyWith(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ).animate().fadeIn(delay: 200.ms),
                          ],
                        ),
                      ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05, end: 0, curve: Curves.easeOut),

                      const SizedBox(height: 28),

                      // Options card
                      GlassCard(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          children: [
                            profileAsync.maybeWhen(
                              data: (profile) {
                                final subaccountId = profile?['paystack_subaccount_id'] as String?;
                                final hasSubaccount = subaccountId != null && subaccountId.isNotEmpty;
                                return _buildTile(
                                  icon: Icons.account_balance_wallet_outlined,
                                  label: 'Compte de versement',
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: hasSubaccount
                                          ? AppColors.success.withValues(alpha: 0.1)
                                          : AppColors.warning.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(
                                        color: hasSubaccount
                                            ? AppColors.success.withValues(alpha: 0.2)
                                            : AppColors.warning.withValues(alpha: 0.2),
                                      ),
                                    ),
                                    child: Text(
                                      hasSubaccount ? 'Configuré' : 'À configurer',
                                      style: AppTextStyles.caption.copyWith(
                                        color: hasSubaccount ? AppColors.success : AppColors.warning,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ),
                                  onTap: () => context.push('/profile/payout'),
                                  showDivider: true,
                                );
                              },
                              orElse: () => _buildTile(
                                icon: Icons.account_balance_wallet_outlined,
                                label: 'Compte de versement',
                                onTap: () => context.push('/profile/payout'),
                                showDivider: true,
                              ),
                            ),
                            _buildTile(
                              icon: Icons.notifications_none_rounded,
                              label: 'Notifications',
                              onTap: () => _showComingSoon(context, 'Notifications'),
                              showDivider: true,
                            ),
                            _buildTile(
                              icon: Icons.help_outline_rounded,
                              label: 'Aide & Support',
                              onTap: _openSupport,
                              showDivider: true,
                            ),
                            _buildTile(
                              icon: Icons.lock_outline_rounded,
                              label: 'Confidentialité',
                              onTap: () => _showPrivacy(context),
                              showDivider: true,
                            ),
                            _buildTile(
                              icon: Icons.info_outline_rounded,
                              label: 'À propos de MasterCota',
                              onTap: () => _showAbout(context),
                              showDivider: false,
                            ),
                          ],
                        ),
                      ).animate(delay: 100.ms).fadeIn(duration: 400.ms),

                      const SizedBox(height: 24),

                      // Logout button
                      GestureDetector(
                        onTap: () async {
                          await ref.read(authNotifierProvider.notifier).signOut();
                          if (context.mounted) context.go('/auth/phone');
                        },
                        child: GlassCard(
                          opacity: 0.03,
                          border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.logout_rounded,
                                  color: AppColors.error, size: 20),
                              const SizedBox(width: 10),
                              Text('Se déconnecter',
                                  style: AppTextStyles.titleMedium
                                      .copyWith(color: AppColors.error)),
                            ],
                          ),
                        ),
                      ).animate(delay: 200.ms).fadeIn(duration: 400.ms),

                      const SizedBox(height: 24),

                      Text('MasterCota v1.0.0',
                          style: AppTextStyles.caption
                              .copyWith(color: AppColors.textTertiary)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTile({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    required bool showDivider,
    Widget? trailing,
  }) {
    return Column(
      children: [
        InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: AppColors.textSecondary, size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    label,
                    style: AppTextStyles.bodyLarge.copyWith(
                        fontWeight: FontWeight.w500),
                  ),
                ),
                if (trailing != null) ...[trailing, const SizedBox(width: 8)],
                const Icon(Icons.chevron_right_rounded,
                    color: AppColors.textTertiary, size: 20),
              ],
            ),
          ),
        ),
        if (showDivider)
          const Padding(
            padding: EdgeInsets.only(left: 64, right: 20),
            child: Divider(height: 1, color: AppColors.border),
          ),
      ],
    );
  }
}

// ── Privacy section widget ────────────────────────────────

class _PrivacySection extends StatelessWidget {
  final String title;
  final String body;
  const _PrivacySection({required this.title, required this.body});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: AppTextStyles.titleMedium.copyWith(
                  fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          Text(body,
              style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary, height: 1.6)),
        ],
      ),
    );
  }
}
