import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/cotisation_model.dart';
import '../../../core/services/api_service.dart';

final userCotisationsProvider = FutureProvider<List<CotisationModel>>((
  ref,
) async {
  if (!ApiService.isAuthenticated) return [];
  final res = await ApiService.get('/api/cotisations');
  final list = res['cotisations'] as List<dynamic>? ?? [];
  return list
      .map((e) => CotisationModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

final cotisationByIdProvider = FutureProvider.family<CotisationModel?, String>((
  ref,
  id,
) async {
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
    FutureProvider.family<List<ContributionModel>, String>((
      ref,
      cotisationId,
    ) async {
      final res = await ApiService.get(
        '/api/cotisations/$cotisationId/contributions',
      );
      final list = res['contributions'] as List<dynamic>? ?? [];
      return list
          .map((e) => ContributionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    });

class CotisationNotifier extends StateNotifier<AsyncValue<void>> {
  CotisationNotifier() : super(const AsyncValue.data(null));

  void reset() => state = const AsyncValue.data(null);

  Future<
    ({String? id, String? error, String? authorizationUrl, bool retryRequired})
  >
  createCotisation({
    required String requestId,
    required String title,
    String? description,
    required double targetAmount,
    required int durationDays,
    required bool useFree,
    CotisationSettings settings = const CotisationSettings(),
    String? coverUrl,
  }) async {
    state = const AsyncValue.loading();
    try {
      final res = await ApiService.post(
        '/api/cotisations',
        body: {
          'title': title,
          'description': description,
          'target_amount': targetAmount,
          'duration_days': durationDays,
          'use_free': useFree,
          'cover_url': coverUrl,
          'settings': settings.toJson(),
          'request_id': requestId,
        },
      );
      state = const AsyncValue.data(null);
      return (
        id: res['cotisation']['id'] as String,
        error: null,
        authorizationUrl: res['authorization_url'] as String?,
        retryRequired: false,
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return (
        id: null,
        error: e.toString().replaceAll('Exception: ', ''),
        authorizationUrl: null,
        retryRequired: e is! ApiException || e.statusCode >= 500,
      );
    }
  }

  Future<void> closeCotisation(String id) async {
    await ApiService.patch('/api/cotisations/$id', body: {'status': 'closed'});
  }

  Future<void> updateSettings(
    String cotisationId,
    CotisationSettings settings, {
    required int editVersion,
  }) async {
    await ApiService.patch(
      '/api/cotisations/$cotisationId',
      body: {
        'settings': settings.toJson(),
        'expected_edit_version': editVersion,
      },
    );
  }

  Future<({String? error})> addManualContribution({
    required String requestId,
    required String cotisationId,
    required String contributorName,
    required String contributorPhone,
    required double amount,
    String? note,
  }) async {
    try {
      await ApiService.post(
        '/api/cotisations/$cotisationId/contributions',
        body: {
          'contributor_name': contributorName.trim(),
          'contributor_phone': contributorPhone.trim(),
          'amount': amount,
          'payment_method': 'manual',
          'note': note,
          'request_id': requestId,
        },
      );
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
