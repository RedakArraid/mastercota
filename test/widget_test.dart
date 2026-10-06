import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mastercota/app.dart';
import 'package:mastercota/core/services/api_service.dart';
import 'package:mastercota/core/utils/fees.dart';
import 'package:mastercota/features/cotisation/providers/cotisation_provider.dart';
import 'package:mastercota/features/cotisation/models/cotisation_model.dart';
import 'package:mastercota/features/auth/screens/phone_screen.dart';
import 'package:mastercota/features/auth/screens/otp_screen.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });
  testWidgets('App reaches onboarding without a session', (tester) async {
    await ApiService.setToken(null);
    await tester.pumpWidget(const ProviderScope(child: MastercotaApp()));
    await tester.pump(const Duration(seconds: 3));
    await tester.pump(const Duration(seconds: 2));
    expect(find.byType(MaterialApp), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
  });
  test('pricing boundaries and maximum duration', () {
    expect(PlatformPricing.feeForDuration(0), null);
    expect(PlatformPricing.feeForDuration(15), 2000);
    expect(PlatformPricing.feeForDuration(16), 4000);
    expect(PlatformPricing.feeForDuration(35), 4000);
    expect(PlatformPricing.feeForDuration(36), 10000);
    expect(PlatformPricing.feeForDuration(60), 10000);
    expect(PlatformPricing.feeForDuration(61), null);
  });
  testWidgets(
    'authentication actions remain reachable with a keyboard on a small screen',
    (tester) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      tester.view.viewInsets = const FakeViewPadding(bottom: 280);
      addTearDown(tester.view.reset);
      for (final screen in [
        const PhoneScreen(),
        const OtpScreen(phone: '+2250700000042'),
      ]) {
        await tester.pumpWidget(
          ProviderScope(child: MaterialApp(home: screen)),
        );
        await tester.pump(const Duration(seconds: 1));
        final action = find.text(
          screen is PhoneScreen ? 'Recevoir le code →' : 'Vérifier →',
        );
        await tester.ensureVisible(action);
        await tester.pump();
        expect(action.hitTestable(), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump(const Duration(seconds: 1));
      }
    },
  );
  test(
    'mobile creation sends duration, free tier and chosen settings',
    () async {
      Map<String, dynamic>? sent;
      ApiService.client = MockClient((request) async {
        sent = jsonDecode(request.body);
        return http.Response(
          jsonEncode({
            'cotisation': {'id': 'cot'},
            'authorization_url': 'https://checkout.paystack.com/test',
          }),
          201,
        );
      });
      final notifier = CotisationNotifier();
      final result = await notifier.createCotisation(
        title: 'Mariage',
        targetAmount: 10000,
        durationDays: 35,
        useFree: true,
        settings: const CotisationSettings(showContributors: false),
      );
      expect(sent!['duration_days'], 35);
      expect(sent!['use_free'], true);
      expect(sent!['settings']['show_contributors'], false);
      expect(sent!.containsKey('deadline'), false);
      expect(result.id, 'cot');
      expect(result.authorizationUrl, 'https://checkout.paystack.com/test');
      notifier.dispose();
    },
  );
  test(
    'manual contribution explicitly chooses manual and includes its note',
    () async {
      Map<String, dynamic>? sent;
      ApiService.client = MockClient((request) async {
        sent = jsonDecode(request.body);
        return http.Response('{}', 201);
      });
      final notifier = CotisationNotifier();
      await notifier.addManualContribution(
        cotisationId: 'cot',
        contributorName: 'A',
        contributorPhone: '+2250700000000',
        amount: 5000,
        note: 'Espèces reçues',
      );
      expect(sent!['payment_method'], 'manual');
      expect(sent!['note'], 'Espèces reçues');
      notifier.dispose();
    },
  );
  test(
    'expired session clears local auth; malformed server response is understandable',
    () async {
      await ApiService.setToken('expired');
      ApiService.client = MockClient(
        (request) async => http.Response('{"error":"Unauthorized"}', 401),
      );
      await expectLater(ApiService.get('/api/profile'), throwsException);
      expect(ApiService.isAuthenticated, false);
      ApiService.client = MockClient(
        (request) async => http.Response('<h1>Gateway error</h1>', 502),
      );
      await expectLater(
        ApiService.get('/api/profile'),
        throwsA(
          predicate(
            (e) => e.toString().contains('temporairement indisponible'),
          ),
        ),
      );
    },
  );
  test(
    'public model handles hidden owner and target without losing public progress',
    () {
      final c = CotisationModel.fromJson({
        'id': 'c',
        'slug': 'c',
        'title': 'Test',
        'current_amount': '5000',
        'target_amount': 0,
        'deadline': '2030-01-01',
        'created_at': '2026-01-01',
        'status': 'active',
        'owner_wave_phone': '+2250700000000',
        'owner_wave_payout_mode': 'phone',
        'progress_percent': 50,
      });
      expect(c.ownerId, '');
      expect(c.hasWave, true);
      expect(c.progressPercent, 0.5);
    },
  );
}
