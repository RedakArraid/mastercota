import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cotisation_model.dart';
import '../../../core/services/api_service.dart';

final userCotisationsProvider =
    FutureProvider<List<CotisationModel>>((ref) async {
  if (!ApiService.isAuthenticated) return [];
  final res = await ApiService.get('/api/cotisations');
  final list = res['cotisations'] as List<dynamic>? ?? [];
  return list
      .map((e) => CotisationModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

final cotisationByIdProvider =
    FutureProvider.family<CotisationModel?, String>((ref, id) async {
  final res = await ApiService.get('/api/cotisations/$id');
  final raw = res['cotisation'] as Map<String, dynamic>?;
  return raw == null ? null : CotisationModel.fromJson(raw);
});

final cotisationBySlugProvider =
    FutureProvider.family<CotisationModel?, String>((ref, slug) async {
  final res = await ApiService.get('/api/cotisations/by-slug/$slug');
  final raw = res['cotisation'] as Map<String, dynamic>?;
  return raw == null ? null : CotisationModel.fromJson(raw);
});

final contributionsProvider =
    FutureProvider.family<List<ContributionModel>, String>(
        (ref, cotisationId) async {
  final res =
      await ApiService.get('/api/cotisations/$cotisationId/contributions');
  final list = res['contributions'] as List<dynamic>? ?? [];
  return list
      .map((e) => ContributionModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

class CotisationNotifier extends StateNotifier<AsyncValue<void>> {
  CotisationNotifier() : super(const AsyncValue.data(null));

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
      final res = await ApiService.post('/api/cotisations', body: {
        'title': title,
        'description': description,
        'target_amount': targetAmount,
        'deadline': deadline.toIso8601String().split('T').first,
        'cover_url': coverUrl,
        'settings': const CotisationSettings().toJson(),
      });
      state = const AsyncValue.data(null);
      return (id: res['cotisation']['id'] as String, error: null);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return (id: null, error: e.toString().replaceAll('Exception: ', ''));
    }
  }

  Future<void> closeCotisation(String id) async {
    await ApiService.patch('/api/cotisations/$id', body: {'status': 'closed'});
  }

  Future<void> updateSettings(
      String cotisationId, CotisationSettings settings) async {
    await ApiService.patch('/api/cotisations/$cotisationId',
        body: {'settings': settings.toJson()});
  }

  Future<({String? error})> addManualContribution({
    required String cotisationId,
    required String contributorName,
    required String contributorPhone,
    required double amount,
    String? note,
  }) async {
    try {
      await ApiService.post('/api/cotisations/$cotisationId/contributions',
          body: {
            'contributor_name': contributorName.trim(),
            'contributor_phone': contributorPhone.trim(),
            'amount': amount,
          });
      return (error: null);
    } catch (e) {
      return (error: e.toString().replaceAll('Exception: ', ''));
    }
  }
}

final cotisationNotifierProvider =
    StateNotifierProvider<CotisationNotifier, AsyncValue<void>>(
  (ref) => CotisationNotifier(),
);
