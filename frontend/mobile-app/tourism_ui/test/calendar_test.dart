import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tourism_ui/src/live/api.dart';
import 'package:tourism_ui/src/live/calendar.dart';
import 'package:tourism_ui/src/live/public_calendar.dart';

class Vault implements RefreshVault {
  @override
  Future<String?> read() async => null;
  @override
  Future<void> write(String? value) async {}
}

http.Response ok(Json data) => http.Response(
  jsonEncode({'success': true, 'data': data}),
  200,
  headers: {'content-type': 'application/json; charset=utf-8'},
);
Future<TourismApi> apiWith(
  Future<http.Response> Function(http.Request) handler, {
  bool signed = true,
}) async {
  final api = TourismApi(
    baseUrl: 'http://127.0.0.1/api/v1',
    vault: Vault(),
    client: MockClient((request) async {
      if (request.url.path.endsWith('/auth/login')) {
        return ok({
          'user': {'id': '1', 'role': 'HOUSEHOLD', 'status': 'ACTIVE'},
          'accessToken': 'access',
          'refreshToken': 'refresh',
        });
      }
      return handler(request);
    }),
  );
  if (signed) {
    await api.authenticate({
      'email': 'test@example.invalid',
      'password': 'isolated test password',
    });
  }
  return api;
}

void main() {
  testWidgets(
    'changing accounts removes the previous household calendar from view',
    (tester) async {
      final api = await apiWith(
        (request) async => ok({
          'items': request.url.path.endsWith('/resources')
              ? [
                  {
                    'id': '1',
                    'name': 'Thiết bị riêng của hộ',
                    'code': 'PRIVATE',
                    'totalQuantity': 2,
                  },
                ]
              : [],
          'total': 1,
          'page': 1,
          'pageSize': 20,
        }),
      );
      addTearDown(api.dispose);
      await tester.pumpWidget(MaterialApp(home: CalendarPage(api: api)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tài nguyên'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Thiết bị riêng của hộ'), findsOneWidget);
      await api.clearSession();
      await tester.pumpAndSettle();
      expect(find.textContaining('Thiết bị riêng của hộ'), findsNothing);
      expect(find.textContaining('Phiên đã thay đổi'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  test('calendar input preserves Vietnam local time and rejects rolling invalid dates', () {
    expect(
      localInstant({'startDay': '2035-11-20', 'startTime': '14:30'}, 'start'),
      '2035-11-20T07:30:00.000Z',
    );
    expect(
      () => localInstant({
        'startDay': '2035-02-30',
        'startTime': '14:30',
      }, 'start'),
      throwsA(isA<ApiFailure>()),
    );
  });
  testWidgets(
    'slot edits preserve offers, allocations and optimistic token while changing capacity',
    (tester) async {
      var slot = <String, dynamic>{
        'id': '10',
        'serviceId': '20',
        'placeId': '30',
        'startsAt': '2035-11-20T07:00:00.000Z',
        'endsAt': '2035-11-20T09:00:00.000Z',
        'personCapacity': 10,
        'visibility': 'PUBLIC',
        'salesStatus': 'DRAFT',
        'readinessStatus': 'AWAITING_CONFIRMATION',
        'readinessNote': null,
        'offers': [
          {'offerId': '40', 'isEnabled': true, 'priceOverrideVnd': null},
        ],
        'assignments': [],
        'token': 'old-token',
        'archivedAt': null,
      };
      Json? body;
      final api = await apiWith((request) async {
        if (request.method == 'PUT') {
          body = object(jsonDecode(request.body));
          slot = {...slot, ...body!};
        }
        return ok({
          'slot': slot,
          'occupiedPeople': 0,
          'hasExclusiveReservation': false,
        });
      });
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: CalendarSlotPage(api: api, id: '10'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Sửa khung giờ và sức chứa'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('field-personCapacity')),
        '7',
      );
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('field-reason')),
        400,
        scrollable: find
            .byWidgetPredicate(
              (widget) =>
                  widget is Scrollable &&
                  widget.axisDirection == AxisDirection.down,
            )
            .first,
      );
      await tester.enterText(
        find.byKey(const ValueKey('field-reason')),
        'Giảm số khách phục vụ',
      );
      await tester.ensureVisible(
        find.widgetWithText(FilledButton, 'Lưu thay đổi'),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Lưu thay đổi'));
      await tester.pumpAndSettle();
      expect(body!['expectedToken'], 'old-token');
      expect(body!['personCapacity'], 7);
      expect(body!['startsAt'], '2035-11-20T07:00:00.000Z');
      expect(records(body!['offers']).single['offerId'], '40');
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'calendar resources use a household scoped API with typed quantities',
    (tester) async {
      Json? body;
      final api = await apiWith((request) async {
        if (request.method == 'POST') {
          expect(request.url.path.endsWith('/calendar/resources'), true);
          body = object(jsonDecode(request.body));
          return ok({
            'resource': {'id': '1'},
          });
        }
        return ok({'items': [], 'total': 0, 'page': 1, 'pageSize': 20});
      });
      addTearDown(api.dispose);
      await tester.pumpWidget(MaterialApp(home: CalendarPage(api: api)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tài nguyên'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Thêm tài nguyên'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const ValueKey('field-code')), 'BIKES');
      await tester.enterText(
        find.byKey(const ValueKey('field-name')),
        'Xe đạp',
      );
      await tester.enterText(
        find.byKey(const ValueKey('field-totalQuantity')),
        '4',
      );
      await tester.ensureVisible(
        find.widgetWithText(FilledButton, 'Lưu thay đổi'),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Lưu thay đổi'));
      await tester.pumpAndSettle();
      expect(body!['totalQuantity'], 4);
      expect(body!['resourceType'], 'POOL');
      expect(body!.containsKey('householdId'), false);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'visitors check room dates without authentication and see an advisory result',
    (tester) async {
      Uri? query;
      final api = await apiWith((request) async {
        expect(request.headers['Authorization'], isNull);
        query = request.url;
        return ok({'roomId': '1', 'available': true, 'reason': 'AVAILABLE'});
      }, signed: false);
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PublicCalendarPanel(api: api, kind: 'rooms', id: '1'),
          ),
        ),
      );
      await tester.tap(find.text('Lịch trống và sức chứa'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('field-fromDay')),
        '2035-11-20',
      );
      await tester.enterText(
        find.byKey(const ValueKey('field-toDay')),
        '2035-11-22',
      );
      await tester.enterText(
        find.byKey(const ValueKey('field-participants')),
        '4',
      );
      await tester.ensureVisible(
        find.widgetWithText(FilledButton, 'Kiểm tra lịch'),
      );
      await tester.tap(find.widgetWithText(FilledButton, 'Kiểm tra lịch'));
      await tester.pumpAndSettle();
      expect(query!.queryParameters['guests'], '4');
      expect(query!.queryParameters['checkInDate'], '2035-11-20');
      expect(find.textContaining('Phòng còn trống'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
