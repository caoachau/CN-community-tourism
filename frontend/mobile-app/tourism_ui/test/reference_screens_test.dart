import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:tourism_ui/src/live/api.dart';
import 'package:tourism_ui/src/live/app.dart';

import 'live_screens_test.dart' show Vault, ok, empty;

const room = <String, dynamic>{
  'id': '31',
  'title': 'Phòng hướng vườn',
  'householdName': 'Hộ An Bình',
  'body': 'Phòng nghỉ trong khu vườn của hộ dân, cung cấp lưu trú theo đêm.',
  'nightlyPriceVnd': 400000,
  'maxGuests': 4,
  'checkInTime': '14:00',
  'checkOutTime': '12:00',
  'details': {
    'amenities': ['Wi-Fi'],
    'houseRules': [],
  },
  'place': {
    'title': 'Vườn An Bình',
    'details': {'locality': 'Vĩnh Long', 'contactPhone': '0901234567'},
  },
};
void main() {
  testWidgets(
    'welcome and unsupported navigation remain usable on a narrow phone',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = TourismApi(
        vault: Vault(),
        client: MockClient((_) async => ok(empty())),
      );
      addTearDown(api.dispose);
      await api.restore();
      await tester.pumpWidget(ConnectedTourismApp(api: api));
      await tester.pumpAndSettle();
      expect(find.text('Khám phá\nViệt Nam thật khác'), findsOneWidget);
      await tester.tap(find.text('Khám phá ngay'));
      await tester.pumpAndSettle();
      for (final name in ['Yêu thích', 'Đặt chỗ', 'Tin nhắn']) {
        await tester.tap(find.text(name));
        await tester.pumpAndSettle();
        expect(find.textContaining('Chức năng chưa khả dụng'), findsOneWidget);
        await tester.tap(find.text('Đã hiểu'));
        await tester.pumpAndSettle();
      }
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'detail explains missing booking before allowing a visual preview',
    (tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final requests = <String>[];
      final api = TourismApi(
        vault: Vault(),
        client: MockClient((r) async {
          requests.add('${r.method} ${r.url.path}');
          if (r.url.path.endsWith('/images')) return ok({'images': []});
          return ok({'room': room});
        }),
      );
      addTearDown(api.dispose);
      await api.restore();
      await tester.pumpWidget(
        MaterialApp(
          theme: referenceTheme(),
          home: PublicDetail(api: api, kind: PublicKind.room, id: '31'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Đặt ngay'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Chức năng giữ chỗ và đặt dịch vụ chưa được mở'), findsOneWidget);
      await tester.tap(find.text('Xem bố cục'));
      await tester.pumpAndSettle();
      expect(find.text('Chọn ngày lưu trú'), findsOneWidget);
      expect(find.text('Chưa kiểm tra chỗ trống'), findsOneWidget);
      expect(requests.first, 'GET /api/v1/public/rooms/31');
      expect(
        requests.skip(1),
        everyElement('GET /api/v1/public/rooms/31/images'),
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'checkout never sends payment or booking and rejects gateway and vouchers',
    (tester) async {
      tester.view.physicalSize = const Size(390, 1000);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final requests = <String>[];
      final api = TourismApi(
        vault: Vault(),
        client: MockClient((r) async {
          requests.add(r.method);
          return ok(empty());
        }),
      );
      addTearDown(api.dispose);
      await api.restore();
      await tester.pumpWidget(
        MaterialApp(
          theme: referenceTheme(),
          home: ReferenceCheckout(
            api: api,
            kind: PublicKind.room,
            data: room,
            start: DateTime(2026, 11, 10),
            end: DateTime(2026, 11, 12),
            guests: 2,
          ),
        ),
      );
      await tester.pumpAndSettle();
      final gateway = find.text('Ví điện tử (MoMo, ZaloPay)');
      await tester.ensureVisible(gateway);
      await tester.tap(gateway);
      await tester.pumpAndSettle();
      expect(find.textContaining('nằm ngoài MVP'), findsOneWidget);
      await tester.tap(find.text('Đã hiểu'));
      await tester.pumpAndSettle();
      final voucher = find.text('Áp dụng');
      await tester.ensureVisible(voucher);
      await tester.tap(voucher);
      await tester.pumpAndSettle();
      expect(
        find.textContaining('không có mã nào được áp dụng'),
        findsOneWidget,
      );
      await tester.tap(find.text('Đã hiểu'));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(FilledButton, 'Thanh toán'));
      await tester.pumpAndSettle();
      expect(
        find.textContaining('không tạo giao dịch hoặc thu tiền'),
        findsOneWidget,
      );
      expect(requests, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
}
