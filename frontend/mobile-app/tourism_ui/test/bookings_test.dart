import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tourism_ui/src/live/api.dart';
import 'package:tourism_ui/src/live/bookings.dart';
import 'package:tourism_ui/src/live/common.dart';

import 'live_screens_test.dart' show Vault, ok;

final line = <String, dynamic>{
  'kind': 'ROOM',
  'roomId': '3',
  'checkInDate': '2035-12-01',
  'checkOutDate': '2035-12-02',
  'participants': 2,
};
final quote = <String, dynamic>{
  'token': 'a' * 64,
  'totalVnd': 400000,
  'items': [
    {
      'totalVnd': 400000,
      'startsAt': '2035-12-01T07:00:00Z',
      'endsAt': '2035-12-02T05:00:00Z',
      'snapshot': {
        'title': 'Phòng kiểm thử',
        'profile': {
          'terms': {
            'includedItems': ['Bữa sáng'],
            'excludedItems': [],
          },
        },
      },
    },
  ],
};
Json detail({String status = 'CONFIRMED', Json? review}) => {
  'booking': {
    'id': '7',
    'code': 'BK-TEST',
    'status': status,
    'token': 'b' * 64,
    'totalVnd': 400000,
    'firstStartsAt': '2035-12-01T07:00:00Z',
    'lastEndsAt': '2035-12-02T05:00:00Z',
    'holdExpiresAt': '2035-11-30T07:00:00Z',
    'contact': {'name': 'Khách kiểm thử', 'phone': '0901234567'},
    'summary': {
      'receivedVnd': 200000,
      'refundedVnd': 0,
      'netReceivedVnd': 200000,
      'balanceDueVnd': 200000,
      'refundDueVnd': 0,
    },
  },
  'items': [],
  'entries': [],
  'review': review,
  'history': [],
};
Future<TourismApi> apiWith(
  Future<http.Response> Function(http.Request) handler, {
  String role = 'CUSTOMER',
}) async {
  final api = TourismApi(
    baseUrl: 'http://127.0.0.1/api/v1',
    vault: Vault(),
    client: MockClient((r) async {
      if (r.url.path.endsWith('/auth/login')) {
        return ok({
          'user': {
            'id': '1',
            'role': role,
            'status': 'ACTIVE',
            'displayName': 'Khách kiểm thử',
            'email': 'guest@example.invalid',
            'phone': '0901234567',
          },
          'accessToken': 'access',
          'refreshToken': 'refresh',
        });
      }
      return handler(r);
    }),
  );
  await api.authenticate({
    'email': 'guest@example.invalid',
    'password': 'isolated password',
  });
  return api;
}

Future<void> tapText(WidgetTester tester, String text) async {
  final finder = find.text(text);
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void largeScreen(WidgetTester tester) {
  tester.view.physicalSize = const Size(430, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets(
    'customer cancellation retries the same command and shows a pending request instead of cancelled',
    (tester) async {
      largeScreen(tester);
      final bodies = <Json>[];
      var state = detail();
      final api = await apiWith((r) async {
        if (r.method == 'POST') {
          expect(r.url.path, '/api/v1/bookings/7/cancellation-requests');
          bodies.add(object(jsonDecode(r.body)));
          if (bodies.length == 1) {
            throw http.ClientException('connection lost after sending');
          }
          state = detail();
          (state['booking'] as Json)['displayStatus'] = 'CANCEL_REQUESTED';
          (state['booking'] as Json)['pendingCancellation'] = {
            'id': '9',
            'status': 'OPEN',
            'reason': 'Thay đổi kế hoạch',
            'createdAt': '2035-01-01T00:00:00Z',
          };
          state['allowedActions'] = ['withdrawCancellation'];
        }
        return ok(state);
      });
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: BookingDetailPage(api: api, id: '7'),
        ),
      );
      await tester.pumpAndSettle();
      await tapText(tester, 'Yêu cầu hủy đơn');
      await tester.enterText(find.byType(TextField), 'Thay đổi kế hoạch');
      await tapText(tester, 'Xác nhận');
      expect(bodies.length, 1);
      await tapText(tester, 'Thử lại thao tác hủy');
      expect(bodies.length, 2);
      expect(bodies[1], bodies[0]);
      expect(find.text('Chờ xử lý hủy'), findsOneWidget);
      expect(find.text('Rút yêu cầu hủy'), findsOneWidget);
      expect(find.text('Đã hủy'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'host sees cancellation acknowledgment and cannot confirm or complete the underlying booking',
    (tester) async {
      largeScreen(tester);
      final state = detail(status: 'PENDING');
      (state['booking'] as Json)['displayStatus'] = 'CANCEL_REQUESTED';
      (state['booking'] as Json)['pendingCancellation'] = {
        'id': '9',
        'status': 'OPEN',
        'reason': 'Khách đổi lịch',
        'createdAt': '2035-01-01T00:00:00Z',
      };
      state['allowedActions'] = ['confirmCancellation'];
      final api = await apiWith((_) async => ok(state), role: 'HOUSEHOLD');
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: BookingDetailPage(api: api, id: '7', host: true),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Xác nhận hủy theo yêu cầu khách'), findsOneWidget);
      expect(find.text('Xác nhận'), findsNothing);
      expect(find.text('Từ chối'), findsNothing);
      expect(find.text('Hoàn thành phục vụ'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'quote that lacks the minimum response time cannot be submitted',
    (tester) async {
      largeScreen(tester);
      var holds = 0;
      final api = await apiWith((r) async {
        if (r.url.path.endsWith('/bookings')) holds++;
        return ok({
          'quote': {
            ...quote,
            'canHold': false,
            'holdExpiresAt': '2035-11-30T00:00:00Z',
          },
        });
      });
      addTearDown(api.dispose);
      api.addBookingItem('2', 'Phòng', line);
      await tester.pumpWidget(MaterialApp(home: BookingCheckoutPage(api: api)));
      await tester.pumpAndSettle();
      await tapText(tester, 'Kiểm tra và lấy báo giá');
      await tapText(
        tester,
        'Tôi đã kiểm tra hạng mục, thời gian, giá và điều kiện phục vụ.',
      );
      final button = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Gửi yêu cầu giữ chỗ'),
      );
      expect(button.onPressed, isNull);
      expect(holds, 0);
    },
  );
  testWidgets(
    'notifications navigate to the booking audience and disappear on session change',
    (tester) async {
      largeScreen(tester);
      final api = await apiWith((r) async {
        if (r.url.path.endsWith('/notifications')) {
          return ok({
            'items': [
              {
                'id': '1',
                'title': 'Khách đề nghị hủy booking',
                'body': 'Đơn vẫn giữ chỗ',
                'createdAt': '2035-01-01T00:00:00Z',
                'readAt': null,
                'navigation': {
                  'screen': 'booking',
                  'bookingId': '7',
                  'audience': 'host',
                },
              },
            ],
            'total': 1,
            'unreadCount': 1,
          });
        }
        if (r.url.path.endsWith('/read')) return ok({});
        expect(r.url.path, '/api/v1/households/me/bookings/7');
        return ok(detail());
      }, role: 'HOUSEHOLD');
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(home: BookingNotificationsPage(api: api)),
      );
      await tester.pumpAndSettle();
      await tapText(tester, 'Khách đề nghị hủy booking');
      expect(find.text('BK-TEST'), findsOneWidget);
      await api.clearSession();
      await tester.pumpAndSettle();
      expect(find.text('BK-TEST'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
  test('cart prevents mixing households, replaces a room selection and clears with the session', () async {
    final api = await apiWith((_) async => ok({}));
    addTearDown(api.dispose);
    api.addBookingItem('2', 'Phòng', line);
    api.addBookingItem('2', 'Phòng', {...line, 'participants': 3});
    assert(api.bookingCart.length == 1);
    expect(object(api.bookingCart.first['payload'])['participants'], 3);
    expect(
      () => api.addBookingItem('4', 'Hộ khác', line),
      throwsA(
        isA<ApiFailure>().having(
          (e) => e.code,
          'code',
          'CART_HOUSEHOLD_MISMATCH',
        ),
      ),
    );
    await api.clearSession();
    expect(api.bookingCart, isEmpty);
    expect(api.bookingHouseholdId, isNull);
  });
  testWidgets(
    'checkout retries the same request after network failure and after leaving the screen',
    (tester) async {
      largeScreen(tester);
      final bodies = <Json>[];
      final api = await apiWith((r) async {
        if (r.url.path.endsWith('/bookings/quote')) return ok({'quote': quote});
        if (r.method == 'POST' && r.url.path.endsWith('/bookings')) {
          bodies.add(object(jsonDecode(r.body)));
          if (bodies.length == 1) {
            throw http.ClientException('network interrupted');
          }
          return ok(detail());
        }
        return ok(detail());
      });
      addTearDown(api.dispose);
      api.addBookingItem('2', 'Phòng kiểm thử', line);
      await tester.pumpWidget(MaterialApp(home: BookingCheckoutPage(api: api)));
      await tester.pumpAndSettle();
      await tapText(tester, 'Kiểm tra và lấy báo giá');
      expect(find.textContaining('Bữa sáng'), findsOneWidget);
      await tapText(
        tester,
        'Tôi đã kiểm tra hạng mục, thời gian, giá và điều kiện phục vụ.',
      );
      await tapText(tester, 'Gửi yêu cầu giữ chỗ');
      expect(bodies.length, 1);
      expect(api.pendingBookingRequest, isNotNull);
      expect(
        () => api.addBookingItem('2', 'Phòng', line),
        throwsA(isA<ApiFailure>()),
      );
      await tester.pumpWidget(const SizedBox());
      await tester.pumpAndSettle();
      await tester.pumpWidget(MaterialApp(home: BookingCheckoutPage(api: api)));
      await tester.pumpAndSettle();
      await tapText(tester, 'Thử lại giữ chỗ');
      expect(bodies.length, 2);
      expect(bodies[1], bodies[0]);
      expect(api.bookingCart, isEmpty);
      expect(api.pendingBookingRequest, isNull);
      expect(find.text('Đã xác nhận'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'booking detail hides private data immediately after account changes',
    (tester) async {
      final api = await apiWith((_) async => ok(detail()));
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: BookingDetailPage(api: api, id: '7'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('BK-TEST'), findsOneWidget);
      await api.clearSession();
      await tester.pumpAndSettle();
      expect(find.text('BK-TEST'), findsNothing);
      expect(find.textContaining('Phiên đã thay đổi'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'host records a refund agreement without cash method or receipt purpose',
    (tester) async {
      largeScreen(tester);
      Json? posted;
      final api = await apiWith((r) async {
        if (r.method == 'POST') {
          posted = object(jsonDecode(r.body));
          return ok(detail());
        }
        return ok(detail());
      }, role: 'HOUSEHOLD');
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: BookingDetailPage(api: api, id: '7', host: true),
        ),
      );
      await tester.pumpAndSettle();
      await tapText(tester, 'Thỏa thuận hoàn');
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Số tiền (VND) *'),
        '100000',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Nội dung / chứng từ *'),
        'Hoàn theo thỏa thuận với khách',
      );
      await tapText(tester, 'Ghi nhận');
      expect(posted?['type'], 'REFUND_AGREEMENT');
      expect(posted?.containsKey('paymentMethod'), false);
      expect(posted?.containsKey('receiptPurpose'), false);
      expect(posted?['amountVnd'], 100000);
      expect((posted?['idempotencyKey'] as String).length, 48);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets(
    'completed customer visit can submit one review through the shared API',
    (tester) async {
      largeScreen(tester);
      Json? posted;
      final api = await apiWith((r) async {
        if (r.method == 'POST') {
          posted = object(jsonDecode(r.body));
          return ok({
            'review': {'rating': 5, 'comment': 'Trải nghiệm rất tốt'},
          });
        }
        return ok(detail(status: 'COMPLETED', review: posted));
      });
      addTearDown(api.dispose);
      await tester.pumpWidget(
        MaterialApp(
          home: BookingDetailPage(api: api, id: '7'),
        ),
      );
      await tester.pumpAndSettle();
      await tapText(tester, 'Viết đánh giá');
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Cảm nhận của bạn *'),
        'Trải nghiệm rất tốt',
      );
      await tapText(tester, 'Gửi đánh giá');
      expect(posted, {'rating': 5, 'comment': 'Trải nghiệm rất tốt'});
      expect(find.text('Viết đánh giá'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
  testWidgets('refund adjustments accept signed integer input', (tester) async {
    Json? posted;
    final api = await apiWith((_) async => ok({}));
    addTearDown(api.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: DataForm(
          api: api,
          title: 'Điều chỉnh',
          action: 'Lưu',
          fields: const [
            FieldSpec(
              'amountVnd',
              'Số tiền',
              kind: InputKind.integer,
              required: true,
              min: -999999999999999,
            ),
          ],
          save: (input) async {
            posted = input;
            return {};
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), '-40000');
    await tapText(tester, 'Lưu');
    expect(posted?['amountVnd'], -40000);
  });
}
