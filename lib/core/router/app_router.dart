import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/screens/splash_screen.dart';
import '../../features/auth/screens/onboarding_screen.dart';
import '../../features/auth/screens/phone_screen.dart';
import '../../features/auth/screens/otp_screen.dart';
import '../../features/home/screens/home_screen.dart';
import '../../features/cotisation/screens/create_cotisation_screen.dart';
import '../../features/cotisation/screens/cotisation_detail_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../services/supabase_service.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/splash',
    redirect: (BuildContext context, GoRouterState state) {
      final isLoggedIn = SupabaseService.isAuthenticated;
      final location = state.matchedLocation;

      // Splash always shows first
      if (location == '/splash') return null;

      final isAuthRoute = location.startsWith('/auth') ||
          location == '/onboarding';

      if (!isLoggedIn && !isAuthRoute) return '/auth/phone';
      if (isLoggedIn && isAuthRoute) return '/home';

      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (ctx, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (ctx, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/auth/phone',
        builder: (ctx, state) => const PhoneScreen(),
      ),
      GoRoute(
        path: '/auth/otp',
        builder: (ctx, state) {
          final phone = state.extra as String? ?? '';
          return OtpScreen(phone: phone);
        },
      ),
      GoRoute(
        path: '/home',
        builder: (ctx, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/cotisation/create',
        builder: (ctx, state) => const CreateCotisationScreen(),
      ),
      GoRoute(
        path: '/cotisation/:id',
        builder: (ctx, state) {
          final id = state.pathParameters['id']!;
          return CotisationDetailScreen(cotisationId: id);
        },
      ),
      GoRoute(
        path: '/profile',
        builder: (ctx, state) => const ProfileScreen(),
      ),
    ],
    errorBuilder: (ctx, state) => Scaffold(
      backgroundColor: const Color(0xFF050B18),
      body: Center(
        child: Text(
          'Page introuvable\n${state.error}',
          style: const TextStyle(color: Colors.white),
          textAlign: TextAlign.center,
        ),
      ),
    ),
  );
});
