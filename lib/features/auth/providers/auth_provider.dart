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

// Future of the current user's profile from the public.users table
final userProfileProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final userId = SupabaseService.currentUser?.id;
  if (userId == null) return null;

  final res = await SupabaseService.client
      .from('users')
      .select()
      .eq('id', userId);
  return res.isEmpty ? null : res.first;
});

// ── Auth actions ─────────────────────────────────────────
class AuthNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref _ref;
  AuthNotifier(this._ref) : super(const AsyncValue.data(null));

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
        _ref.invalidate(userProfileProvider);
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
    _ref.invalidate(userProfileProvider);
    state = const AsyncValue.data(null);
  }

  Future<void> updateProfile({String? name, String? avatarUrl}) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) return;
    
    final phone = _client.auth.currentUser?.phone;
    final cleanPhone = (phone != null && phone.trim().isNotEmpty) ? phone.trim() : null;
    
    // Check if the user profile exists first
    final check = await _client.from('users').select('id').eq('id', userId).maybeSingle();
    
    if (check == null) {
      await _client.from('users').insert({
        'id': userId,
        if (cleanPhone != null) 'phone': cleanPhone,
        'name': name ?? '',
        'avatar_url': avatarUrl ?? '👤',
      });
    } else {
      await _client.from('users').update({
        if (name != null) 'name': name,
        if (avatarUrl != null) 'avatar_url': avatarUrl,
      }).eq('id', userId);
    }
    
    _ref.invalidate(userProfileProvider);
  }
}

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AsyncValue<void>>(
  (ref) => AuthNotifier(ref),
);
