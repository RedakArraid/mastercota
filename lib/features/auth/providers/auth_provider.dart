import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/services/supabase_service.dart';

// ── Auth state stream ────────────────────────────────────
final authStateProvider = StreamProvider<AuthState>((ref) {
  return SupabaseService.authStateChanges;
});

final currentUserProvider = Provider<User?>((ref) {
  return SupabaseService.currentUser;
});

// Stream of the current user's profile from the public.users table
final userProfileProvider = StreamProvider<Map<String, dynamic>?>((ref) {
  final userId = SupabaseService.currentUser?.id;
  if (userId == null) return Stream.value(null);

  return SupabaseService.client
      .from('users')
      .stream(primaryKey: ['id'])
      .eq('id', userId)
      .map((data) => data.isEmpty ? null : data.first);
});

// ── Auth actions ─────────────────────────────────────────
class AuthNotifier extends StateNotifier<AsyncValue<void>> {
  AuthNotifier() : super(const AsyncValue.data(null));

  final _client = SupabaseService.client;

  Future<bool> sendOtp(String phone) async {
    state = const AsyncValue.loading();
    try {
      await _client.auth.signInWithOtp(phone: phone);
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
      await _client.auth.verifyOTP(
        phone: phone,
        token: token,
        type: OtpType.sms,
      );
      // Upsert user profile
      final userId = _client.auth.currentUser?.id;
      if (userId != null) {
        await _client.from('users').upsert({
          'id': userId,
          'phone': phone,
        });
      }
      state = const AsyncValue.data(null);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
    state = const AsyncValue.data(null);
  }

  Future<void> updateProfile({String? name, String? avatarUrl}) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;
    await _client.from('users').update({
      if (name != null) 'name': name,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
    }).eq('id', userId);
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<void>>(
  (ref) => AuthNotifier(),
);
