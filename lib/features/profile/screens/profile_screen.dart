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

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  // Values loaded from site_config, with sensible defaults
  String _supportEmail = 'support@mastercota.com';
  String _supportPhone = '';
  String _privacyDocUrl = '';

  @override
  void initState() {
    super.initState();
    _loadSiteConfig();
  }

  Future<void> _loadSiteConfig() async {
    try {
      final data = await SupabaseService.client
          .from('site_config')
          .select('email_support, phone_whatsapp, doc_privacy_url')
          .eq('id', 1)
          .single();
      if (!mounted) return;
      setState(() {
        final email = data['email_support'] as String?;
        if (email != null && email.isNotEmpty) _supportEmail = email;
        _supportPhone = data['phone_whatsapp'] as String? ?? '';
        _privacyDocUrl = data['doc_privacy_url'] as String? ?? '';
      });
    } catch (_) {
      // Keep defaults on network/table error
    }
  }

  // ── Helpers ──────────────────────────────────────────────


  Future<void> _openSupport() async {
    final emailUri = Uri(
      scheme: 'mailto',
      path: _supportEmail,
      query: 'subject=Support%20Mastercota',
    );
    if (await canLaunchUrl(emailUri)) {
      await launchUrl(emailUri);
      return;
    }
    if (_supportPhone.isNotEmpty) {
      // Strip non-digit characters for wa.me URL
      final digits = _supportPhone.replaceAll(RegExp(r'[^\d]'), '');
      final waUri = Uri.parse('https://wa.me/$digits');
      if (await canLaunchUrl(waUri)) {
        await launchUrl(waUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  Future<void> _handlePrivacy(BuildContext context) async {
    if (_privacyDocUrl.isNotEmpty) {
      final uri = Uri.parse(_privacyDocUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
    }
    if (context.mounted) _showPrivacyInline(context);
  }

  void _showPrivacyInline(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      constraints: const BoxConstraints(maxWidth: 550),
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
                    const Icon(Icons.lock_outline_rounded,
                        color: AppColors.primary, size: 20),
                    const SizedBox(width: 10),
                    Text('Politique de confidentialité',
                        style: AppTextStyles.headlineMedium
                            .copyWith(fontWeight: FontWeight.bold)),
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
                      body:
                          'Mastercota collecte votre numéro de téléphone pour l\'authentification par OTP, ainsi que les informations des cotisations que vous créez (titre, description, montant, deadline).',
                    ),
                    _PrivacySection(
                      title: 'Utilisation des données',
                      body:
                          'Vos données servent uniquement à faire fonctionner l\'application : authentification, création et suivi de cotisations, et initialisation des paiements via Paystack.',
                    ),
                    _PrivacySection(
                      title: 'Paiements',
                      body:
                          'Les transactions sont traitées par Paystack (PCI-DSS). Mastercota ne stocke jamais vos informations bancaires ou de carte.',
                    ),
                    _PrivacySection(
                      title: 'Partage des données',
                      body:
                          'Nous ne vendons ni ne partageons vos données personnelles avec des tiers. Seul Paystack reçoit les informations nécessaires au traitement de paiement.',
                    ),
                    _PrivacySection(
                      title: 'Suppression de compte',
                      body:
                          'Pour supprimer votre compte et vos données, contactez-nous à $_supportEmail. Toutes vos données seront supprimées dans les 30 jours.',
                    ),
                    _PrivacySection(
                      title: 'Contact',
                      body:
                          'Pour toute question relative à la confidentialité : $_supportEmail',
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Dernière mise à jour : mai 2026',
                      style: AppTextStyles.caption
                          .copyWith(color: AppColors.textTertiary),
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
      builder: (dialogContext) => Dialog(
        backgroundColor: AppColors.surface,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
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
                  child: Text('₣',
                      style: TextStyle(
                          fontSize: 36,
                          color: Colors.white,
                          fontWeight: FontWeight.w900)),
                ),
              ),
              const SizedBox(height: 16),
              Text(AppConstants.appName,
                  style: AppTextStyles.headlineLarge
                      .copyWith(fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(AppConstants.appTagline,
                  style: AppTextStyles.bodySmall
                      .copyWith(color: AppColors.textSecondary),
                  textAlign: TextAlign.center),
              const SizedBox(height: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceElevated,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text('Version 1.0.0',
                    style: AppTextStyles.caption.copyWith(
                        color: AppColors.textTertiary,
                        fontWeight: FontWeight.bold)),
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
                  onPressed: () => Navigator.pop(dialogContext),
                  style: TextButton.styleFrom(
                    backgroundColor: AppColors.surfaceElevated,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: Text('Fermer',
                      style: AppTextStyles.bodyMedium.copyWith(
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.bold)),
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
  Widget build(BuildContext context) {
    final phone = SupabaseService.currentUser?.phone ?? '';
    final profileAsync = ref.watch(userProfileProvider);
    final profile = profileAsync.value;
    final name = profile?['name'] as String?;
    final avatarUrl = profile?['avatar_url'] as String? ?? '👤';

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    GestureDetector(
                      onTap: () => context.go('/home'),
                      child: Container(
                        width: 38, height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: const Center(child: Text('←', style: TextStyle(fontSize: 16))),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('COMPTE', style: AppTextStyles.caption.copyWith(color: AppColors.ink3)),
                    const SizedBox(height: 6),
                    RichText(
                      text: TextSpan(
                        style: AppTextStyles.displayMedium.copyWith(fontSize: 28, letterSpacing: -0.7, height: 1.05),
                        children: [
                          const TextSpan(text: 'Votre '),
                          TextSpan(
                            text: 'profil.',
                            style: AppTextStyles.serifItalic.copyWith(fontSize: 28, letterSpacing: -0.7),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),

              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      // User header card
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Column(
                          children: [
                            GestureDetector(
                              onTap: () => _showEditProfileSheet(context, name, avatarUrl),
                              child: Stack(
                                children: [
                                  Container(
                                    width: 80,
                                    height: 80,
                                    decoration: BoxDecoration(
                                      color: AppColors.ink,
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        (name != null && name.trim().isNotEmpty)
                                            ? name.trim()[0].toUpperCase()
                                            : (phone.isNotEmpty ? phone[phone.length > 2 ? phone.length - 2 : 0] : '?'),
                                        style: AppTextStyles.headlineLarge.copyWith(
                                          color: Colors.white,
                                          fontSize: 28,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                  )
                                      .animate()
                                      .scale(
                                          duration: 500.ms,
                                          curve: Curves.elasticOut,
                                          begin: const Offset(0.7, 0.7))
                                      .fadeIn(),
                                  Positioned(
                                    bottom: 0,
                                    right: 0,
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: AppColors.accentBright,
                                        shape: BoxShape.circle,
                                        border: Border.all(color: AppColors.cream, width: 2),
                                      ),
                                      child: const Icon(
                                        Icons.edit_rounded,
                                        size: 12,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 16),

                            if (name != null && name.trim().isNotEmpty) ...[
                              Text(
                                name,
                                style: AppTextStyles.headlineMedium,
                                textAlign: TextAlign.center,
                              ).animate().fadeIn(delay: 150.ms),
                              const SizedBox(height: 4),
                              Text(
                                phone.isNotEmpty ? phone : '+225 01 02 03 04 05',
                                style: AppTextStyles.bodyMedium.copyWith(
                                  color: AppColors.textSecondary,
                                ),
                              ).animate().fadeIn(delay: 180.ms),
                            ] else ...[
                              Text(
                                phone.isNotEmpty ? phone : '+225 01 02 03 04 05',
                                style: AppTextStyles.headlineMedium,
                                textAlign: TextAlign.center,
                              ).animate().fadeIn(delay: 150.ms),
                              const SizedBox(height: 4),
                              GestureDetector(
                                onTap: () => _showEditProfileSheet(context, name, avatarUrl),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      'Ajouter votre nom',
                                      style: AppTextStyles.bodyMedium.copyWith(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(
                                      Icons.add_circle_outline_rounded,
                                      size: 16,
                                      color: AppColors.primary,
                                    ),
                                  ],
                                ),
                              ).animate().fadeIn(delay: 180.ms),
                            ],

                            const SizedBox(height: 8),

                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.primary
                                    .withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: AppColors.primary
                                        .withValues(alpha: 0.3)),
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
                      ).animate().fadeIn(duration: 400.ms).slideY(
                          begin: 0.05, end: 0, curve: Curves.easeOut),

                      const SizedBox(height: 28),

                      // Options card
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Column(
                          children: [
                            profileAsync.maybeWhen(
                              data: (profile) {
                                final subaccountId =
                                    profile?['paystack_subaccount_id']
                                        as String?;
                                final hasSubaccount = subaccountId != null &&
                                    subaccountId.isNotEmpty;
                                return _buildTile(
                                  icon: Icons
                                      .account_balance_wallet_outlined,
                                  label: 'Compte de versement',
                                  trailing: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: hasSubaccount
                                          ? AppColors.success
                                              .withValues(alpha: 0.1)
                                          : AppColors.warning
                                              .withValues(alpha: 0.1),
                                      borderRadius:
                                          BorderRadius.circular(8),
                                      border: Border.all(
                                        color: hasSubaccount
                                            ? AppColors.success
                                                .withValues(alpha: 0.2)
                                            : AppColors.warning
                                                .withValues(alpha: 0.2),
                                      ),
                                    ),
                                    child: Text(
                                      hasSubaccount
                                          ? 'Configuré'
                                          : 'À configurer',
                                      style: AppTextStyles.caption.copyWith(
                                        color: hasSubaccount
                                            ? AppColors.success
                                            : AppColors.warning,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ),
                                  onTap: () =>
                                      context.push('/profile/payout'),
                                  showDivider: true,
                                );
                              },
                              orElse: () => _buildTile(
                                icon: Icons.account_balance_wallet_outlined,
                                label: 'Compte de versement',
                                onTap: () =>
                                    context.push('/profile/payout'),
                                showDivider: true,
                              ),
                            ),
                            _buildTile(
                              icon: Icons.notifications_none_rounded,
                              label: 'Notifications',
                              onTap: () => _showNotificationSheet(context),
                              showDivider: true,
                            ),
                            _buildTile(
                              icon: Icons.help_outline_rounded,
                              label: 'Aide & Support',
                              onTap: () { _openSupport(); },
                              showDivider: true,
                            ),
                            _buildTile(
                              icon: Icons.lock_outline_rounded,
                              label: 'Confidentialité',
                              onTap: () { _handlePrivacy(context); },
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

                      // Logout
                      GestureDetector(
                        onTap: () async {
                          await ref
                              .read(authNotifierProvider.notifier)
                              .signOut();
                          if (context.mounted) {
                            context.go('/auth/phone');
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: AppColors.paper,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
                          ),
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
    );
  }

  void _showEditProfileSheet(BuildContext context, String? name, String? avatar) {
    final isWide = MediaQuery.of(context).size.width > 600;
    if (isWide) {
      showDialog(
        context: context,
        useRootNavigator: true,
        builder: (dialogContext) => Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: _EditProfileSheet(
              initialName: name,
              initialAvatar: avatar,
              isDialog: true,
            ),
          ),
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        useRootNavigator: true,
        backgroundColor: Colors.transparent,
        constraints: const BoxConstraints(maxWidth: 550),
        builder: (_) => _EditProfileSheet(
          initialName: name,
          initialAvatar: avatar,
          isDialog: false,
        ),
      );
    }
  }

  void _showNotificationSheet(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 600;
    if (isWide) {
      showDialog(
        context: context,
        useRootNavigator: true,
        builder: (dialogContext) => Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 550, maxHeight: 650),
            child: const _NotificationSheet(isDialog: true),
          ),
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        useRootNavigator: true,
        backgroundColor: Colors.transparent,
        constraints: const BoxConstraints(maxWidth: 550),
        builder: (_) => SizedBox(
          height: MediaQuery.of(context).size.height * 0.8,
          child: const _NotificationSheet(isDialog: false),
        ),
      );
    }
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
            padding:
                const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceElevated,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon,
                      color: AppColors.textSecondary, size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Text(
                    label,
                    style: AppTextStyles.bodyLarge
                        .copyWith(fontWeight: FontWeight.w500),
                  ),
                ),
                if (trailing != null) ...[
                  trailing,
                  const SizedBox(width: 8)
                ],
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
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary)),
          const SizedBox(height: 6),
          Text(body,
              style: AppTextStyles.bodySmall.copyWith(
                  color: AppColors.textSecondary, height: 1.6)),
        ],
      ),
    );
  }
}

// ── Interactive Profile Editing Widget ───────────────────

class _EditProfileSheet extends ConsumerStatefulWidget {
  final String? initialName;
  final String? initialAvatar;
  final bool isDialog;

  const _EditProfileSheet({
    this.initialName,
    this.initialAvatar,
    this.isDialog = false,
  });

  @override
  ConsumerState<_EditProfileSheet> createState() => _EditProfileSheetState();
}

class _EditProfileSheetState extends ConsumerState<_EditProfileSheet> {
  late final TextEditingController _nameController;
  late String _selectedAvatar;
  bool _isLoading = false;

  final List<String> _avatars = ['👤', '🦁', '🦊', '🐯', '🐼', '🌟', '🐹', '🐨', '🐱', '🐶'];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _selectedAvatar = widget.initialAvatar ?? '👤';
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: widget.isDialog
            ? BorderRadius.circular(24)
            : const BorderRadius.vertical(top: Radius.circular(24)),
        border: widget.isDialog
            ? Border.all(color: AppColors.border)
            : const Border(top: BorderSide(color: AppColors.border)),
      ),
      padding: widget.isDialog
          ? const EdgeInsets.symmetric(horizontal: 24, vertical: 24)
          : EdgeInsets.only(
              left: 24,
              right: 24,
              top: 12,
              bottom: 32 + MediaQuery.of(context).viewInsets.bottom,
            ),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
          // Drag handle
          if (!widget.isDialog) ...[
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
          Row(
            children: [
              const Icon(Icons.edit_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 10),
              Text(
                'Modifier le profil',
                style: AppTextStyles.headlineMedium.copyWith(fontWeight: FontWeight.bold),
              ),
              if (widget.isDialog) ...[
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ],
          ),
          const SizedBox(height: 24),
          
          // Nom complet Label & Input
          Text(
            'Nom complet',
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _nameController,
            style: AppTextStyles.bodyLarge.copyWith(color: AppColors.textPrimary),
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              hintText: 'Entrez votre nom complet',
              hintStyle: AppTextStyles.bodyLarge.copyWith(color: AppColors.textTertiary),
              prefixIcon: const Icon(Icons.person_outline_rounded, color: AppColors.textSecondary),
              filled: true,
              fillColor: AppColors.surfaceElevated,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Avatar Selection Label
          Text(
            'Choisir un avatar',
            style: AppTextStyles.bodyMedium.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 60,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _avatars.length,
              itemBuilder: (context, index) {
                final avatar = _avatars[index];
                final isSelected = _selectedAvatar == avatar;
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedAvatar = avatar;
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.only(right: 12),
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: 0.15)
                          : AppColors.surfaceElevated,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.border,
                        width: isSelected ? 2.0 : 1.0,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        avatar,
                        style: const TextStyle(fontSize: 28),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          
          const SizedBox(height: 32),
          
          // Enregistrer Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading
                  ? null
                  : () async {
                      setState(() {
                        _isLoading = true;
                      });
                      try {
                        await ref.read(authNotifierProvider.notifier).updateProfile(
                              name: _nameController.text.trim(),
                              avatarUrl: _selectedAvatar,
                            );
                        if (context.mounted) {
                          Navigator.pop(context);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: const Text('Profil mis à jour avec succès'),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: AppColors.success,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          );
                        }
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Erreur lors de la mise à jour : $e'),
                              behavior: SnackBarBehavior.floating,
                              backgroundColor: AppColors.error,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          );
                        }
                      } finally {
                        if (mounted) {
                          setState(() {
                            _isLoading = false;
                          });
                        }
                      }
                    },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                padding: const EdgeInsets.symmetric(vertical: 16),
                elevation: 0,
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      'Enregistrer',
                      style: AppTextStyles.bodyLarge.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
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
}

// ── Comprehensive Notification Dashboard Widget ─────────

class _NotificationSheet extends StatefulWidget {
  final bool isDialog;
  const _NotificationSheet({this.isDialog = false});

  @override
  State<_NotificationSheet> createState() => _NotificationSheetState();
}

class _NotificationSheetState extends State<_NotificationSheet> {
  // Local state for settings
  bool _pushEnabled = true;
  bool _smsEnabled = false;
  bool _emailEnabled = true;

  // Local state for notifications history
  late List<Map<String, dynamic>> _notifications;

  @override
  void initState() {
    super.initState();
    _notifications = [
      {
        'id': '1',
        'icon': Icons.monetization_on_outlined,
        'title': 'Cotisation reçue',
        'body': 'Marc K. a cotisé 5 000 FCFA à "Cadeau de mariage"',
        'time': 'Il y a 10 min',
        'unread': true,
        'color': AppColors.success,
      },
      {
        'id': '2',
        'icon': Icons.account_balance_wallet_outlined,
        'title': 'Versement effectué',
        'body': '50 000 FCFA ont été transférés vers votre compte Orange Money.',
        'time': 'Il y a 2 h',
        'unread': true,
        'color': AppColors.primary,
      },
      {
        'id': '3',
        'icon': Icons.emoji_events_outlined,
        'title': 'Objectif atteint !',
        'body': 'Félicitations ! L\'objectif de 150 000 FCFA pour "Anniversaire de Papa" est atteint.',
        'time': 'Hier, 14:32',
        'unread': false,
        'color': AppColors.warning,
      },
      {
        'id': '4',
        'icon': Icons.person_add_alt_1_outlined,
        'title': 'Nouveau membre',
        'body': 'Awa D. a rejoint votre groupe de cotisation.',
        'time': 'Il y a 3 jours',
        'unread': false,
        'color': AppColors.textSecondary,
      },
    ];
  }

  void _markAsRead(String id) {
    setState(() {
      final index = _notifications.indexWhere((n) => n['id'] == id);
      if (index != -1) {
        _notifications[index]['unread'] = false;
      }
    });
  }

  void _markAllAsRead() {
    setState(() {
      for (var n in _notifications) {
        n['unread'] = false;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: widget.isDialog
              ? BorderRadius.circular(24)
              : const BorderRadius.vertical(top: Radius.circular(24)),
          border: widget.isDialog
              ? Border.all(color: AppColors.border)
              : const Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Column(
          children: [
            if (!widget.isDialog) ...[
              const SizedBox(height: 12),
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
            ],
            Padding(
              padding: EdgeInsets.fromLTRB(24, widget.isDialog ? 24 : 20, 24, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.notifications_none_rounded,
                          color: AppColors.primary, size: 22),
                      const SizedBox(width: 10),
                      Text(
                        'Notifications',
                        style: AppTextStyles.headlineMedium.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: _markAllAsRead,
                        child: Text(
                          'Tout lire',
                          style: AppTextStyles.bodyMedium.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (widget.isDialog) ...[
                        const SizedBox(width: 16),
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: AppColors.textSecondary),
                          onPressed: () => Navigator.pop(context),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            
            // TabBar
            const TabBar(
              tabs: [
                Tab(text: 'Historique'),
                Tab(text: 'Paramètres'),
              ],
              indicatorColor: AppColors.primary,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorSize: TabBarIndicatorSize.tab,
            ),
            
            Expanded(
              child: TabBarView(
                children: [
                  _buildHistoryTab(),
                  _buildSettingsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.notifications_off_outlined,
                size: 64, color: AppColors.textTertiary),
            const SizedBox(height: 16),
            Text(
              'Aucune notification',
              style: AppTextStyles.bodyLarge.copyWith(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      itemCount: _notifications.length,
      itemBuilder: (context, index) {
        final notif = _notifications[index];
        final isUnread = notif['unread'] as bool;
        final color = notif['color'] as Color;

        return GestureDetector(
          onTap: () => _markAsRead(notif['id'] as String),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isUnread
                  ? AppColors.primary.withValues(alpha: 0.05)
                  : AppColors.surfaceElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isUnread
                    ? AppColors.primary.withValues(alpha: 0.2)
                    : AppColors.border,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    notif['icon'] as IconData,
                    color: color,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 16),
                
                // Content
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              notif['title'] as String,
                              style: AppTextStyles.bodyLarge.copyWith(
                                fontWeight:
                                    isUnread ? FontWeight.bold : FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          if (isUnread)
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        notif['body'] as String,
                        style: AppTextStyles.bodyMedium.copyWith(
                          color: isUnread
                              ? AppColors.textSecondary
                              : AppColors.textTertiary,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        notif['time'] as String,
                        style: AppTextStyles.caption.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSettingsTab() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      children: [
        _buildSettingsToggle(
          icon: Icons.notifications_active_outlined,
          title: 'Notifications Push',
          description: 'Alerte instantanée sur le mobile pour chaque activité importante.',
          value: _pushEnabled,
          onChanged: (val) {
            setState(() {
              _pushEnabled = val;
            });
          },
        ),
        const SizedBox(height: 16),
        _buildSettingsToggle(
          icon: Icons.sms_outlined,
          title: 'Alertes SMS',
          description: 'Notifications par SMS pour les versements et cotisations critiques.',
          value: _smsEnabled,
          onChanged: (val) {
            setState(() {
              _smsEnabled = val;
            });
          },
        ),
        const SizedBox(height: 16),
        _buildSettingsToggle(
          icon: Icons.mail_outline_rounded,
          title: 'Rapports par Email',
          description: 'Rapport hebdomadaire sur le résumé de vos cotisations actives.',
          value: _emailEnabled,
          onChanged: (val) {
            setState(() {
              _emailEnabled = val;
            });
          },
        ),
      ],
    );
  }

  Widget _buildSettingsToggle({
    required IconData icon,
    required String title,
    required String description,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevated,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Icon(icon, color: AppColors.textSecondary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTextStyles.bodyLarge.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: AppTextStyles.caption.copyWith(
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Switch.adaptive(
            value: value,
            activeTrackColor: AppColors.primary,
            onChanged: onChanged,
          ),
        ],
      ),
    );
  }
}
