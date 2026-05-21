import 'package:flutter_riverpod/flutter_riverpod.dart';
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
          : CotisationModel.fromJson(data.first as Map<String, dynamic>));
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

  Future<String?> createCotisation({
    required String title,
    String? description,
    required double targetAmount,
    required DateTime deadline,
    String? coverUrl,
  }) async {
    state = const AsyncValue.loading();
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) throw Exception('Non authentifié');

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
          })
          .select()
          .single();

      state = const AsyncValue.data(null);
      return response['id'] as String;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return null;
    }
  }

  Future<void> closeCotisation(String id) async {
    await _client
        .from('cotisations')
        .update({'status': 'closed'}).eq('id', id);
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
