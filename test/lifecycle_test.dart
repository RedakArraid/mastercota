import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mastercota/core/services/api_service.dart';
import 'package:mastercota/features/auth/providers/auth_provider.dart';
import 'package:mastercota/features/cotisation/models/cotisation_model.dart';
import 'package:mastercota/features/cotisation/providers/cotisation_provider.dart';
import 'package:mastercota/features/cotisation/screens/create_cotisation_screen.dart';
import 'package:mastercota/features/cotisation/screens/public_contribution_page.dart';
import 'package:mastercota/features/cotisation/widgets/cotisation_editor.dart';
import 'package:mastercota/features/cotisation/widgets/contribution_dialog.dart';
import 'package:mastercota/features/cotisation/widgets/owner_controls.dart';
import 'package:mastercota/features/home/widgets/cotisation_card.dart';

CotisationModel cot({
  String status = 'active',
  int days = 5,
  String? reason,
  Map<String, dynamic>? lifecycle,
  Map<String, dynamic>? payment,
}) {
  final now = DateTime.now().toUtc();
  return CotisationModel.fromJson({
    'id': 'cot',
    'slug': 'test',
    'title': 'Projet',
    'description': 'Description',
    'owner_id': 'owner',
    'target_amount': 50000,
    'current_amount': 10000,
    'deadline': DateTime.utc(
      now.year,
      now.month,
      now.day,
    ).add(Duration(days: days)).toIso8601String().substring(0, 10),
    'created_at': '2026-01-01',
    'status': status,
    'close_reason': reason,
    'owner_wave_phone': '+2250700000000',
    'owner_wave_payout_mode': 'phone',
    'edit_version': 3,
    'lifecycle': lifecycle,
    'platform_payment': payment,
  });
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
    FlutterSecureStorage.setMockInitialValues({});
  });

  testWidgets(
    'cards distinguish payment, manual closure, expiration, completion and final active day',
    (tester) async {
      final cases = <CotisationModel, String>{
        cot(status: 'pending_fee', days: -2): 'Frais en attente',
        cot(status: 'closed', reason: 'manual'): 'Clôturée',
        cot(status: 'closed', days: -2, reason: 'expired'): 'Expirée',
        cot(status: 'completed'): 'Atteint',
        cot(days: 0): 'Dernier jour',
      };
      for (final entry in cases.entries) {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: CotisationCard(cotisation: entry.key, onTap: () {}),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text(entry.value), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
      expect(cot(days: 0).isActive, true);
      expect(cot(days: -1).isActive, false);
      expect(
        cot(status: 'closed', days: -1, reason: 'manual').isExpired,
        false,
      );
      final authoritative = cot(
        lifecycle: {
          'can_extend': false,
          'can_reopen': true,
          'can_record_contribution': false,
        },
      );
      expect(authoritative.canExtend, false);
      expect(authoritative.canReopen, true);
      expect(authoritative.canRecordContribution, false);
    },
  );

  testWidgets(
    'editing persists title, description and target with concurrency version',
    (tester) async {
      Map<String, dynamic>? sent;
      ApiService.client = MockClient((request) async {
        expect(request.method, 'PATCH');
        sent = jsonDecode(request.body);
        return http.Response('{}', 200);
      });
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => TextButton(
                  onPressed: () => showDialog<void>(
                    context: context,
                    builder: (_) => CotisationEditor(cot: cot()),
                  ),
                  child: const Text('Ouvrir'),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Ouvrir'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Titre'),
        ' Nouveau titre ',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Description').first,
        'Nouveau texte',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Objectif en FCFA'),
        '75000',
      );
      await tester.tap(find.text('Enregistrer'));
      await tester.pumpAndSettle();
      expect(sent, {
        'title': 'Nouveau titre',
        'description': 'Nouveau texte',
        'target_amount': 75000,
        'expected_edit_version': 3,
      });
      expect(find.byType(CotisationEditor), findsNothing);
    },
  );

  test(
    'extension fallback refuses attained objectives until target increases',
    () {
      CotisationModel candidate(
        String status,
        int current, {
        Map<String, dynamic>? lifecycle,
      }) => CotisationModel.fromJson({
        ...cot(status: status).toJson(),
        'starts_at': DateTime.now()
            .toUtc()
            .subtract(const Duration(days: 10))
            .toIso8601String()
            .substring(0, 10),
        'current_amount': current,
        'lifecycle': lifecycle,
      });
      expect(candidate('active', 10000).canExtend, true);
      expect(candidate('closed', 10000).canExtend, true);
      expect(candidate('active', 50000).canExtend, false);
      expect(candidate('closed', 50000).canExtend, false);
      expect(candidate('completed', 50000).canExtend, false);
      expect(
        candidate('active', 10000, lifecycle: {'can_extend': false}).canExtend,
        false,
      );
    },
  );

  testWidgets(
    'Wave verifies current destination, collection status and minimum before any new transfer',
    (tester) async {
      final initial = {
        ...cot().toJson(),
        'owner_wave_payout_mode': 'phone',
        'owner_wave_phone': '+2250700000000',
      };
      for (final change in [
        {'status': 'closed'},
        {'owner_wave_phone': '+2250700000001'},
        {
          'owner_wave_payout_mode': 'business',
          'owner_wave_phone': null,
          'owner_wave_pay_link': 'https://pay.wave.com/test',
        },
        {'settings': const CotisationSettings(minAmount: 5000).toJson()},
      ]) {
        SharedPreferences.setMockInitialValues({});
        var displayed = CotisationModel.fromJson(initial);
        var checks = 0;
        ApiService.client = MockClient((request) async {
          expect(request.method, 'GET');
          expect(request.url.path, '/api/cotisations/by-slug/test');
          checks++;
          final latest = {...initial, ...change};
          displayed = CotisationModel.fromJson(latest);
          return http.Response(jsonEncode({'cotisation': latest}), 200);
        });
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              cotisationBySlugProvider(
                'test',
              ).overrideWith((_) async => displayed),
              contributionsProvider('cot').overrideWith((_) async => []),
            ],
            child: const MaterialApp(
              home: PublicContributionPage(slug: 'test'),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Votre nom'),
          'Aminata',
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Votre téléphone'),
          '+2250700000000',
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Montant en FCFA'),
          '3000',
        );
        await tester.scrollUntilVisible(
          find.text('Payer dans Wave'),
          250,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Payer dans Wave'));
        await tester.pumpAndSettle();
        expect(checks, 1);
        expect(find.text('J’ai payé'), findsNothing);
        expect(find.text('Ouvrir Wave'), findsNothing);
        expect(
          (await SharedPreferences.getInstance()).getString(
            'wave_transfer_test',
          ),
          isNull,
        );
        expect(
          find.textContaining(
            change.containsKey('status')
                ? 'Aucun nouveau transfert'
                : 'informations de paiement ont changé',
          ),
          findsOneWidget,
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox.shrink());
      }
    },
  );

  testWidgets('concurrent edit cannot overwrite newer server data', (
    tester,
  ) async {
    ApiService.client = MockClient(
      (_) async => http.Response('{"error":"Conflit"}', 409),
    );
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: Scaffold(body: CotisationEditor(cot: cot())),
        ),
      ),
    );
    await tester.tap(find.text('Enregistrer'));
    await tester.pumpAndSettle();
    expect(find.textContaining('modifiée ailleurs'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Enregistrer'),
          )
          .onPressed,
      isNull,
    );
  });

  testWidgets(
    'creation persists request and payload after lost response and reuses them on restart',
    (tester) async {
      final requests = <Map<String, dynamic>>[];
      ApiService.client = MockClient((request) async {
        if (request.method == 'GET') {
          return http.Response('{"freeEligible":true}', 200);
        }
        requests.add(jsonDecode(request.body));
        if (requests.length == 1) {
          throw http.ClientException('Connexion interrompue');
        }
        return http.Response('{"cotisation":{"id":"created"}}', 201);
      });
      GoRouter router() => GoRouter(
        initialLocation: '/create',
        routes: [
          GoRoute(
            path: '/create',
            builder: (_, _) => const CreateCotisationScreen(),
          ),
          GoRoute(
            path: '/cotisation/:id',
            builder: (_, _) => const Scaffold(body: Text('Création retrouvée')),
          ),
        ],
      );
      Widget app(GoRouter router) => ProviderScope(
        overrides: [
          userProfileProvider.overrideWith((_) async => {'id': 'owner'}),
        ],
        child: MaterialApp.router(routerConfig: router),
      );
      final firstRouter = router();
      await tester.pumpWidget(app(firstRouter));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Titre'),
        'Collecte fiable',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Objectif en FCFA'),
        '25000',
      );
      await tester.scrollUntilVisible(
        find.text('Créer gratuitement'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Créer gratuitement'));
      await tester.pumpAndSettle();
      final prefs = await SharedPreferences.getInstance();
      final draft =
          jsonDecode(prefs.getString('cotisation_draft_owner')!)
              as Map<String, dynamic>;
      expect(draft['submitted'], true);
      expect(draft['request_id'], requests.single['request_id']);
      expect(draft['request_id'], matches(RegExp(r'^[a-f0-9-]{36}$')));
      await tester.pumpWidget(const SizedBox.shrink());
      firstRouter.dispose();
      final secondRouter = router();
      await tester.pumpWidget(app(secondRouter));
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<TextFormField>(find.widgetWithText(TextFormField, 'Titre'))
            .enabled,
        false,
      );
      await tester.scrollUntilVisible(
        find.text('Retrouver la cotisation'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retrouver la cotisation'));
      await tester.pumpAndSettle();
      expect(requests, hasLength(2));
      expect(requests[1], requests[0]);
      expect(prefs.getString('cotisation_draft_owner'), isNull);
      expect(find.text('Création retrouvée'), findsOneWidget);
      await tester.pumpWidget(const SizedBox.shrink());
      secondRouter.dispose();
    },
  );

  testWidgets('manual contribution retries preserve the same request id', (
    tester,
  ) async {
    final requests = <Map<String, dynamic>>[];
    ApiService.client = MockClient((request) async {
      requests.add(jsonDecode(request.body));
      return http.Response(
        requests.length == 1 ? '{"error":"Réessayez"}' : '{}',
        requests.length == 1 ? 502 : 201,
      );
    });
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: Scaffold(
            body: ContributionDialog(
              cotisationId: 'cot',
              cotisationTitle: 'Projet',
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Nom'),
      'Aminata',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Téléphone international'),
      '+2250700000000',
    );
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Montant en FCFA'),
      '3000',
    );
    for (var i = 0; i < 2; i++) {
      await tester.tap(find.text('Confirmer la réception'));
      await tester.pumpAndSettle();
      if (i == 0) {
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pumpWidget(
          const ProviderScope(
            child: MaterialApp(
              home: Scaffold(
                body: ContributionDialog(
                  cotisationId: 'cot',
                  cotisationTitle: 'Projet',
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<TextFormField>(find.widgetWithText(TextFormField, 'Nom'))
              .enabled,
          false,
        );
      }
    }
    expect(requests, hasLength(2));
    expect(requests[1]['request_id'], requests[0]['request_id']);
    expect(requests[0]['payment_method'], 'manual');
    expect(
      (await SharedPreferences.getInstance()).getString(
        'manual_contribution_cot',
      ),
      isNull,
    );
  });

  testWidgets(
    'Wave transfer survives closure and restart without offering another transfer',
    (tester) async {
      const requestId = '33333333-3333-4333-8333-333333333333';
      SharedPreferences.setMockInitialValues({
        'wave_transfer_test': jsonEncode({
          'request_id': requestId,
          'name': 'Aminata',
          'phone': '+2250700000000',
          'amount': '3000',
          'note': '',
        }),
      });
      final requests = <Map<String, dynamic>>[];
      ApiService.client = MockClient((request) async {
        requests.add(jsonDecode(request.body));
        return http.Response(
          requests.length == 1 ? '{"error":"Réessayez"}' : '{}',
          requests.length == 1 ? 502 : 201,
        );
      });
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            cotisationBySlugProvider(
              'test',
            ).overrideWith((_) async => cot(status: 'closed')),
            contributionsProvider('cot').overrideWith((_) async => []),
          ],
          child: const MaterialApp(home: PublicContributionPage(slug: 'test')),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Payer dans Wave'), findsNothing);
      expect(find.text('Ouvrir Wave'), findsNothing);
      for (var i = 0; i < 2; i++) {
        await tester.ensureVisible(find.text('J’ai payé'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('J’ai payé'));
        await tester.pumpAndSettle();
      }
      expect(requests, hasLength(2));
      expect(requests.every((r) => r['request_id'] == requestId), true);
      expect(find.text('Paiement signalé'), findsOneWidget);
      expect(
        (await SharedPreferences.getInstance()).getString('wave_transfer_test'),
        isNull,
      );
    },
  );

  testWidgets(
    'payment awaiting review is never presented as a payable activation',
    (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            contributionsProvider('cot').overrideWith((_) async => []),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: OwnerControls(
                cot: cot(
                  status: 'pending_fee',
                  payment: {
                    'status': 'paid',
                    'application_status': 'review_required',
                    'reference': 'paid-reference',
                  },
                ),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('service non appliqué'), findsOneWidget);
      expect(find.text('Payer les frais'), findsNothing);
      expect(find.text('Prolonger · 2 000 F'), findsNothing);
    },
  );

  testWidgets(
    'already paid checkout reports service outcome without launching a new payment',
    (tester) async {
      ApiService.client = MockClient((request) async {
        expect(request.url.path, '/api/cotisations/cot/pay-fee');
        return http.Response(
          '{"payment_required":false,"application_status":"review_required","reference":"paid-ref"}',
          200,
        );
      });
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            contributionsProvider('cot').overrideWith((_) async => []),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: OwnerControls(cot: cot(status: 'pending_fee')),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Payer les frais'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Ne payez pas une seconde fois.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'resolved payment review keeps its history and restores eligible extension without claiming a refund',
    (tester) async {
      final payment = {
        'status': 'paid',
        'application_status': 'review_required',
        'reference': 'reviewed-reference',
        'review_resolved_at': '2026-10-06T12:00:00Z',
        'review_resolved_by': 'support',
        'review_resolution_note':
            'Dossier examiné. Contact établi avec l’organisateur.',
      };
      CotisationModel candidate(Map<String, dynamic> payment) =>
          CotisationModel.fromJson({
            ...cot().toJson(),
            'starts_at': DateTime.now()
                .toUtc()
                .subtract(const Duration(days: 10))
                .toIso8601String()
                .substring(0, 10),
            'platform_payment': payment,
          });
      final resolved = candidate(payment);
      expect(resolved.paymentNeedsReview, false);
      expect(resolved.paymentReviewResolved, true);
      expect(resolved.canExtend, true);
      expect(
        candidate({...payment, 'review_resolved_at': null}).canExtend,
        false,
      );
      expect(
        resolved.platformPayment!['application_status'],
        'review_required',
      );
      final verifiedPaths = <String>[];
      ApiService.client = MockClient((request) async {
        verifiedPaths.add(request.url.path);
        if (request.url.path == '/api/cotisations/cot') {
          return http.Response(
            jsonEncode({
              'cotisation': {'platform_payment': payment},
            }),
            200,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }
        expect(
          request.url.path,
          '/api/platform-payments/verify/reviewed-reference',
        );
        return http.Response(
          jsonEncode({'payment': payment}),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        );
      });
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            contributionsProvider('cot').overrideWith((_) async => []),
          ],
          child: MaterialApp(
            home: Scaffold(body: OwnerControls(cot: resolved)),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.textContaining('Examen terminé pour ce paiement'),
        findsOneWidget,
      );
      expect(find.text(payment['review_resolution_note']!), findsOneWidget);
      expect(find.text('Prolonger · 2 000 F'), findsOneWidget);
      expect(
        find.textContaining('Ne payez pas une seconde fois'),
        findsNothing,
      );
      expect(
        find.textContaining(RegExp('rembours', caseSensitive: false)),
        findsNothing,
      );
      await tester.tap(find.text('Actualiser'));
      await tester.pumpAndSettle();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();
      expect(verifiedPaths, [
        '/api/cotisations/cot',
        '/api/platform-payments/verify/reviewed-reference',
      ]);
      expect(
        find.textContaining('Examen terminé pour ce paiement'),
        findsNWidgets(2),
      );
      expect(find.textContaining('service appliqué'), findsNothing);
    },
  );
}
