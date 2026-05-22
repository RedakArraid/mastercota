import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../auth/providers/auth_provider.dart';
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

  void _comingSoon(BuildContext context, String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label — bientôt disponible'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

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
    showDialog(
      context: context,
      useRootNavigator: true,
      builder: (_) => Dialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.border),
        ),
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520, maxHeight: 600),
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 16, 8),
                child: Row(
                  children: [
                    const Icon(Icons.lock_outline_rounded,
                        color: AppColors.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text('Politique de confidentialité',
                          style: AppTextStyles.headlineMedium
                              .copyWith(fontWeight: FontWeight.bold)),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded,
                          color: AppColors.textSecondary, size: 20),
                      onPressed: () => Navigator.pop(_),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),
              const Divider(color: AppColors.border, height: 1),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
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

  void _showEditProfileSheet(BuildContext context, String? name, String? avatar) {
    showDialog(
      context: context,
      useRootNavigator: true,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: EdgeInsets.fromLTRB(
          20, 20, 20,
          20 + MediaQuery.of(dialogContext).viewInsets.bottom,
        ),
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
  }

  void _showNotificationSheet(BuildContext context) {
    showDialog(
      context: context,
      useRootNavigator: true,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520, maxHeight: 580),
          child: const _NotificationSheet(isDialog: true),
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

    // Avatar initial: first letter of name, or last 2 digits of phone
    final String avatarInitial = (name != null && name.trim().isNotEmpty)
        ? name.trim()[0].toUpperCase()
        : (phone.length >= 2
            ? phone.substring(phone.length - 2)
            : (phone.isNotEmpty ? phone : '?'));

    // "Depuis [month] [year]" pill text
    const String sinceText = 'Depuis mai 2026';

    // Payout status
    final subaccountId = profile?['paystack_subaccount_id'] as String?;
    final hasSubaccount = subaccountId != null && subaccountId.isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.cream,
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 110),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Header ───────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 54, 20, 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                      child: const Center(
                        child: Text('←', style: TextStyle(fontSize: 16)),
                      ),
                    ),
                  ),
                  Text('PROFIL', style: AppTextStyles.caption),
                  GestureDetector(
                    onTap: () => _showEditProfileSheet(context, name, avatarUrl),
                    child: Container(
                      width: 38, height: 38,
                      decoration: BoxDecoration(
                        color: AppColors.paper,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: const Center(
                        child: Text('⋯', style: TextStyle(fontSize: 16)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // ── Identity ─────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
              child: Column(
                children: [
                  // Navy circle 84px with initial
                  Container(
                    width: 84, height: 84,
                    decoration: const BoxDecoration(
                      color: AppColors.ink,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        avatarInitial,
                        style: const TextStyle(
                          fontFamily: 'DM Sans',
                          fontSize: 36,
                          fontWeight: FontWeight.w400,
                          letterSpacing: -0.02 * 36,
                          color: AppColors.paper,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Name
                  Text(
                    (name != null && name.trim().isNotEmpty)
                        ? name
                        : (phone.isNotEmpty ? phone : ''),
                    style: AppTextStyles.displayMedium.copyWith(
                      fontSize: 26,
                      letterSpacing: -0.02 * 26,
                      height: 1.1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),

                  // Phone in mono
                  Text(
                    phone.isNotEmpty ? phone : '',
                    style: AppTextStyles.mono.copyWith(
                      fontSize: 12,
                      color: AppColors.ink3,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Pills row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // "Vérifié" pill with gold dot
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: AppColors.accent,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              'Vérifié',
                              style: AppTextStyles.caption.copyWith(
                                fontSize: 11,
                                color: AppColors.ink2,
                                letterSpacing: 0,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // "Depuis…" pill
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.paper,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.line),
                        ),
                        child: Text(
                          sinceText,
                          style: AppTextStyles.caption.copyWith(
                            fontSize: 11,
                            color: AppColors.ink2,
                            letterSpacing: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Mini stats ───────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                decoration: BoxDecoration(
                  color: AppColors.paper,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.line),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _StatCell(value: '—', label: 'Collecté'),
                    ),
                    Container(width: 1, height: 36, color: AppColors.line),
                    Expanded(
                      child: _StatCell(value: '—', label: 'Actives'),
                    ),
                    Container(width: 1, height: 36, color: AppColors.line),
                    Expanded(
                      child: _StatCell(value: '—', label: 'Donateurs'),
                    ),
                  ],
                ),
              ),
            ),

            // ── Settings: Compte ─────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Text('COMPTE', style: AppTextStyles.caption),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.paper,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.line),
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: Column(
                      children: [
                        _Row(
                          label: 'Compte de versement',
                          value: hasSubaccount ? 'Configuré' : 'À configurer',
                          warning: !hasSubaccount,
                          onTap: () => context.push('/profile/payout'),
                        ),
                        _Row(
                          label: 'Notifications',
                          value: 'Activées',
                          onTap: () => _showNotificationSheet(context),
                        ),
                        _Row(
                          label: 'Sécurité',
                          value: 'Code par SMS',
                          onTap: () => _comingSoon(context, 'Sécurité'),
                        ),
                        _Row(
                          label: 'Langue',
                          value: 'Français',
                          last: true,
                          onTap: () => _comingSoon(context, 'Langue'),
                        ),
                      ],
                    ),
                  ),

                  // ── Settings: Aide ───────────────────────────────
                  const SizedBox(height: 22),
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Text('AIDE', style: AppTextStyles.caption),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.paper,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.line),
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: Column(
                      children: [
                        _Row(
                          label: "Centre d'aide",
                          onTap: () => _openSupport(),
                        ),
                        _Row(
                          label: "Conditions d'utilisation",
                          onTap: () => _handlePrivacy(context),
                        ),
                        _Row(
                          label: 'Contacter le support',
                          last: true,
                          onTap: () => _openSupport(),
                        ),
                      ],
                    ),
                  ),

                  // ── Logout ───────────────────────────────────────
                  const SizedBox(height: 22),
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
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.line),
                      ),
                      child: Center(
                        child: Text(
                          'Se déconnecter',
                          style: AppTextStyles.titleMedium.copyWith(
                            color: AppColors.ink2,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // ── Version ──────────────────────────────────────
                  const SizedBox(height: 18),
                  Center(
                    child: Text(
                      'MasterCota · v1.0.0',
                      style: AppTextStyles.mono.copyWith(
                        fontSize: 11,
                        color: AppColors.ink4,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── _StatCell ────────────────────────────────────────────

class _StatCell extends StatelessWidget {
  final String value;
  final String label;

  const _StatCell({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          value,
          style: AppTextStyles.mono.copyWith(
            fontSize: 20,
            letterSpacing: -0.02 * 20,
            color: AppColors.ink,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label.toUpperCase(),
          style: AppTextStyles.caption.copyWith(fontSize: 10),
        ),
      ],
    );
  }
}

// ── _Row ─────────────────────────────────────────────────

class _Row extends StatelessWidget {
  final String label;
  final String? value;
  final bool last;
  final bool warning;
  final VoidCallback? onTap;

  const _Row({
    required this.label,
    this.value,
    this.last = false,
    this.warning = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          border: last
              ? null
              : Border(bottom: BorderSide(color: AppColors.line)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: AppTextStyles.titleMedium
                  .copyWith(fontWeight: FontWeight.w500),
            ),
            Row(
              children: [
                if (value != null)
                  Text(
                    value!,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: warning ? AppColors.warn : AppColors.ink3,
                    ),
                  ),
                const SizedBox(width: 8),
                const Text(
                  '›',
                  style: TextStyle(fontSize: 10, color: AppColors.ink4),
                ),
              ],
            ),
          ],
        ),
      ),
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
