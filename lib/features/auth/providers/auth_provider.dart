import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/services/api_service.dart';
import '../../cotisation/providers/cotisation_provider.dart';

final authStateProvider = Provider<bool>((ref) {
  void changed() => ref.invalidateSelf();
  ApiService.authChanges.addListener(changed);
  ref.onDispose(() => ApiService.authChanges.removeListener(changed));
  return ApiService.isAuthenticated;
});

final userProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  if (!ref.watch(authStateProvider)) return null;
  final res = await ApiService.get('/api/profile');
  return res['user'] as Map<String, dynamic>?;
});

class AuthNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  AuthNotifier(this._ref) : super(const AsyncValue.data(null));

  Future<bool> sendOtp(String phone) async {
    state = const AsyncValue.loading();
    try {
      await ApiService.post('/api/auth/send-otp', body: {'phone': phone});
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> verifyOtp(String phone, String token) async {
    state = const AsyncValue.loading();
    try {
      final res = await ApiService.post(
        '/api/auth/verify-otp',
        body: {'phone': phone, 'token': token},
      );
      final jwt = res['token'] as String?;
      if (jwt == null) throw Exception('Token manquant');
      await ApiService.setToken(jwt);
      _ref.invalidate(userProfileProvider);
      _ref.invalidate(userCotisationsProvider);
      _ref.invalidate(cotisationByIdProvider);
      _ref.invalidate(contributionsProvider);
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      await ApiService.post('/api/auth/logout');
    } catch (_) {}
    await ApiService.setToken(null);
    _ref.invalidate(userProfileProvider);
    _ref.invalidate(userCotisationsProvider);
    _ref.invalidate(cotisationByIdProvider);
    _ref.invalidate(contributionsProvider);
    state = const AsyncValue.data(null);
  }

  Future<void> deleteAccount() async {
    await ApiService.delete(
      '/api/profile',
      body: const {'confirmation': 'SUPPRIMER'},
    );
    await ApiService.setToken(null);
    _ref.invalidate(userProfileProvider);
    _ref.invalidate(userCotisationsProvider);
    _ref.invalidate(cotisationByIdProvider);
    _ref.invalidate(contributionsProvider);
    state = const AsyncValue.data(null);
  }

  Future<void> updateProfile({String? name, String? avatarUrl}) async {
    await ApiService.patch(
      '/api/profile',
      body: {
        if (name != null) 'name': name,
        if (avatarUrl != null) 'avatar_url': avatarUrl,
      },
    );
    _ref.invalidate(userProfileProvider);
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<void>>(
      (ref) => AuthNotifier(ref),
    );
