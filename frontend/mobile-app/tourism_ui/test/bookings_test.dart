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
