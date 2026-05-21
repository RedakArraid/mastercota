import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/cotisation_model.dart';
import '../../../core/services/supabase_service.dart';

// ── User's cotisations list ───────────────────────────────
final userCotisationsProvider =
    FutureProvider<List<CotisationModel>>((ref) async {
  final userId = SupabaseService.currentUser?.id;
  if (userId == null) return [];

  final response = await SupabaseService.client
      .from('cotisations')
      .select()
      .eq('owner_id', userId)
      .order('created_at', ascending: false);

  return (response as List<dynamic>)
      .map((e) => CotisationModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Single cotisation — realtime stream ───────────────────
final cotisationStreamProvider =
    StreamProvider.family<CotisationModel?, String>((ref, id) {
  return SupabaseService.client
      .from('cotisations')
      .stream(primaryKey: ['id'])
      .eq('id', id)
      .map((data) => data.isEmpty
          ? null
          : CotisationModel.fromJson(data.first));
});

// ── Public lookup by slug (no auth required) ──────────────
final cotisationBySlugProvider =
    FutureProvider.family<CotisationModel?, String>((ref, slug) async {
  final response = await SupabaseService.client
      .from('cotisations')
      .select()
      .eq('slug', slug)
      .maybeSingle();

  if (response == null) return null;
  return CotisationModel.fromJson(response);
});

// ── Contributions stream by cotisation id (public) ────────
final publicContributionsProvider =
    StreamProvider.family<List<ContributionModel>, String>(
        (ref, cotisationId) {
  return SupabaseService.client
      .from('contributions')
      .stream(primaryKey: ['id'])
      .eq('cotisation_id', cotisationId)
      .order('created_at', ascending: false)
      .map((data) => (data as List)
          .map((e) => ContributionModel.fromJson(e as Map<String, dynamic>))
          .toList());
});

// ── Contributions — realtime stream ───────────────────────
final contributionsStreamProvider =
    StreamProvider.family<List<ContributionModel>, String>(
        (ref, cotisationId) {
  return SupabaseService.client
      .from('contributions')
      .stream(primaryKey: ['id'])
      .eq('cotisation_id', cotisationId)
      .order('created_at', ascending: false)
      .map((data) => (data as List)
          .map((e) =>
              ContributionModel.fromJson(e as Map<String, dynamic>))
          .toList());
});

// ── Cotisation CRUD ───────────────────────────────────────
class CotisationNotifier extends StateNotifier<AsyncValue<void>> {
  CotisationNotifier() : super(const AsyncValue.data(null));

  final _client = SupabaseService.client;

  /// Remet le notifier à zéro (efface l'état d'erreur précédent).
  void reset() => state = const AsyncValue.data(null);

  Future<({String? id, String? error})> createCotisation({
    required String title,
    String? description,
    required double targetAmount,
    required DateTime deadline,
    String? coverUrl,
  }) async {
    state = const AsyncValue.loading();
    try {
      final userId = _client.auth.currentUser?.id;
      final userPhone = _client.auth.currentUser?.phone;
      if (userId == null) throw Exception('Vous devez être connecté pour créer une cotisation.');

      // Filet de sécurité : s'assurer que le profil existe dans public.users
      // (peut manquer si le upsert post-OTP a échoué silencieusement)
      await _client.from('users').upsert(
        {'id': userId, 'phone': userPhone},
        onConflict: 'id',
      );

      final slug = _generateSlug(title);

      final response = await _client
          .from('cotisations')
          .insert({
            'title': title,
            'description': description,
            'target_amount': targetAmount,
            'current_amount': 0,
            'deadline': deadline.toIso8601String().split('T').first,
            'owner_id': userId,
            'cover_url': coverUrl,
            'slug': slug,
            'status': 'active',
            'settings': const CotisationSettings().toJson(),
          })
          .select()
          .single();

      state = const AsyncValue.data(null);
      return (id: response['id'] as String, error: null);
    } on PostgrestException catch (e, st) {
      state = AsyncValue.error(e, st);
      // Message lisible pour les erreurs Supabase/PostgreSQL
      final msg = e.message.contains('duplicate')
          ? 'Ce titre existe déjà. Essayez un titre différent.'
          : 'Erreur base de données : ${e.message}';
      return (id: null, error: msg);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return (id: null, error: e.toString().replaceAll('Exception: ', ''));
    }
  }

  Future<void> closeCotisation(String id) async {
    await _client
        .from('cotisations')
        .update({'status': 'closed'}).eq('id', id);
  }

  /// Met à jour les paramètres d'affichage d'une cotisation
  Future<void> updateSettings(String cotisationId, CotisationSettings settings) async {
    await _client
        .from('cotisations')
        .update({'settings': settings.toJson()}).eq('id', cotisationId);
  }

  /// Ajoute une contribution manuelle (cash/virement) avec statut 'paid' immédiat
  Future<({String? error})> addManualContribution({
    required String cotisationId,
    required String contributorName,
    required String contributorPhone,
    required double amount,
    String? note,
  }) async {
    try {
      await _client.from('contributions').insert({
        'cotisation_id': cotisationId,
        'contributor_name': contributorName.trim(),
        'contributor_phone': contributorPhone.trim(),
        'amount': amount,
        'status': 'paid',
        'payment_method': 'manual',
        'paystack_reference': null,
      });
      return (error: null);
    } on PostgrestException catch (e) {
      return (error: 'Erreur base de données : ${e.message}');
    } catch (e) {
      return (error: e.toString().replaceAll('Exception: ', ''));
    }
  }

  String _generateSlug(String title) {
    final base = title
        .toLowerCase()
        .replaceAll(RegExp(r'[àáâãäå]'), 'a')
        .replaceAll(RegExp(r'[èéêë]'), 'e')
        .replaceAll(RegExp(r'[ìíîï]'), 'i')
        .replaceAll(RegExp(r'[òóôõö]'), 'o')
        .replaceAll(RegExp(r'[ùúûü]'), 'u')
        .replaceAll(RegExp(r'[^a-z0-9\s-]'), '')
        .trim()
        .replaceAll(RegExp(r'\s+'), '-');
    final ts = DateTime.now().millisecondsSinceEpoch.toString().substring(8);
    return '$base-$ts';
  }
}

final cotisationNotifierProvider =
    StateNotifierProvider<CotisationNotifier, AsyncValue<void>>(
  (ref) => CotisationNotifier(),
);
