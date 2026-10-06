import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/services/api_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/constants/app_constants.dart';
import '../../auth/providers/auth_provider.dart';

final notificationsProvider = FutureProvider<List<Map<String, dynamic>>>((
  ref,
) async {
  if (!ref.watch(authStateProvider)) return [];
  final result = await ApiService.get('/api/notifications');
  return (result['notifications'] as List).cast<Map<String, dynamic>>();
});

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});
  Future<void> _edit(BuildContext context, WidgetRef ref, String name) async {
    var draft = name;
    final next = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Votre nom'),
        content: TextFormField(
          initialValue: name,
          onChanged: (value) => draft = value,
          maxLength: 100,
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () {
              if (draft.trim().isNotEmpty) {
                Navigator.pop(ctx, draft.trim());
              }
            },
            child: const Text('Enregistrer'),
          ),
        ],
      ),
    );
    if (next == null) return;
    try {
      await ref.read(authNotifierProvider.notifier).updateProfile(name: next);
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _open(BuildContext context, String url) async {
    try {
      if (!await launchUrl(
        Uri.parse(url),
        mode: LaunchMode.externalApplication,
      )) {
        throw Exception('Ouverture impossible');
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Impossible d’ouvrir ce lien')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(userProfileProvider);
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(title: const Text('Mon profil')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(
          child: TextButton(
            onPressed: () => ref.invalidate(userProfileProvider),
            child: const Text('Réessayer'),
          ),
        ),
        data: (user) {
          if (user == null) {
            return Center(
              child: TextButton(
                onPressed: () async {
                  await ref.read(authNotifierProvider.notifier).signOut();
                  if (context.mounted) context.go('/auth/phone');
                },
                child: const Text('Se reconnecter'),
              ),
            );
          }
          final name = user['name'] as String? ?? '';
          final wave = user['wave_payout_mode'] == 'business'
              ? user['wave_pay_link']
              : user['wave_phone'];
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(userProfileProvider);
              ref.invalidate(notificationsProvider);
              await ref.read(userProfileProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Text(
                  name.isEmpty ? 'Bienvenue' : name,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                Text(user['phone'] as String? ?? ''),
                const SizedBox(height: 24),
                ListTile(
                  leading: const Icon(Icons.person_outline),
                  title: const Text('Modifier mon nom'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _edit(context, ref, name),
                ),
                ListTile(
                  leading: const Icon(Icons.account_balance_wallet_outlined),
                  title: const Text('Réception Wave'),
                  subtitle: Text(wave as String? ?? 'À configurer'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => context.push('/profile/payout'),
                ),
                ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: const Text('Notifications'),
                  onTap: () => showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (ctx) => const FractionallySizedBox(
                      heightFactor: 0.8,
                      child: _Notifications(),
                    ),
                  ),
                ),
                const Divider(),
                ListTile(
                  leading: const Icon(Icons.help_outline),
                  title: const Text('Aide et frais'),
                  onTap: () =>
                      _open(context, '${AppConstants.appBaseUrl}/frais'),
                ),
                ListTile(
                  leading: const Icon(Icons.mail_outline),
                  title: const Text('Contacter le support'),
                  onTap: () => _open(context, 'mailto:support@mastercota.com'),
                ),
                ListTile(
                  title: const Text('Confidentialité'),
                  onTap: () => _open(
                    context,
                    '${AppConstants.appBaseUrl}/p/confidentialite',
                  ),
                ),
                ListTile(
                  title: const Text('Conditions générales'),
                  onTap: () =>
                      _open(context, '${AppConstants.appBaseUrl}/p/cgu'),
                ),
                const SizedBox(height: 16),
                const Text(
                  'La déconnexion ferme toutes les sessions de votre compte. Ne partagez jamais votre code WhatsApp.',
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  icon: const Icon(Icons.logout),
                  label: const Text('Déconnecter mes appareils'),
                  onPressed: () async {
                    final ok = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Se déconnecter partout ?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Annuler'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Déconnecter'),
                          ),
                        ],
                      ),
                    );
                    if (ok == true) {
                      await ref.read(authNotifierProvider.notifier).signOut();
                      ref.invalidate(notificationsProvider);
                      if (context.mounted) context.go('/auth/phone');
                    }
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Notifications extends ConsumerWidget {
  const _Notifications();
  @override
  Widget build(BuildContext context, WidgetRef ref) => SafeArea(
    child: Column(
      children: [
        ListTile(
          title: const Text('Notifications'),
          trailing: TextButton(
            onPressed: () async {
              try {
                await ApiService.post('/api/notifications/read', body: {});
                ref.invalidate(notificationsProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text(e.toString())));
                }
              }
            },
            child: const Text('Tout lire'),
          ),
        ),
        Expanded(
          child: ref
              .watch(notificationsProvider)
              .when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, st) => Center(
                  child: TextButton(
                    onPressed: () => ref.invalidate(notificationsProvider),
                    child: const Text('Réessayer'),
                  ),
                ),
                data: (items) => items.isEmpty
                    ? const Center(child: Text('Aucune notification'))
                    : ListView.builder(
                        itemCount: items.length,
                        itemBuilder: (ctx, i) {
                          final n = items[i];
                          return ListTile(
                            leading: Icon(
                              n['read_at'] == null
                                  ? Icons.notifications_active_outlined
                                  : Icons.notifications_none,
                            ),
                            title: Text(n['title'] as String),
                            subtitle: Text(n['body'] as String),
                            onTap: () async {
                              try {
                                await ApiService.post(
                                  '/api/notifications/read',
                                  body: {'id': n['id']},
                                );
                                ref.invalidate(notificationsProvider);
                                if (ctx.mounted && n['cotisation_id'] != null) {
                                  Navigator.pop(ctx);
                                  context.push(
                                    '/cotisation/${n['cotisation_id']}',
                                  );
                                }
                              } catch (e) {
                                if (ctx.mounted) {
                                  ScaffoldMessenger.of(ctx).showSnackBar(
                                    SnackBar(content: Text(e.toString())),
                                  );
                                }
                              }
                            },
                          );
                        },
                      ),
              ),
        ),
      ],
    ),
  );
}
