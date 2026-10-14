import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tourism_ui/src/account.dart';
import 'package:tourism_ui/src/app.dart';
import 'package:tourism_ui/src/data.dart';
import 'package:tourism_ui/src/widgets.dart';

void main() {
  Future<void> launch(
    WidgetTester tester,
    TourismStore store,
    int screen, {
    double width = 390,
  }) async {
    tester.view.physicalSize = Size(width, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(TourismApp(store: store, initialScreen: screen));
    await tester.pumpAndSettle();
  }

  for (int screen = 1; screen <= 10; screen++) {
    testWidgets('M$screen renders and scrolls at narrow phone width', (
      tester,
    ) async {
      final store = TourismStore();
      addTearDown(store.dispose);
      await launch(tester, store, screen, width: 320);
      expect(tester.takeException(), isNull, reason: 'M$screen first frame');
      final scrollable = find.byType(Scrollable);
      if (scrollable.evaluate().isNotEmpty) {
        for (int step = 0; step < 6; step++) {
          await tester.drag(scrollable.first, const Offset(0, -580));
          await tester.pumpAndSettle();
          expect(
            tester.takeException(),
            isNull,
            reason: 'M$screen scroll $step',
          );
        }
      }
    });
  }
  for (int screen = 1; screen <= 10; screen++) {
    testWidgets('M$screen supports large text and reduced motion', (
      tester,
    ) async {
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      final store = TourismStore();
      addTearDown(store.dispose);
      await launch(tester, store, screen);
      expect(
        tester.takeException(),
        isNull,
        reason: 'M$screen enlarged first frame',
      );
      final scrollable = find.byType(Scrollable);
      if (scrollable.evaluate().isNotEmpty) {
        for (int step = 0; step < 6; step++) {
          await tester.drag(scrollable.first, const Offset(0, -580));
          await tester.pumpAndSettle();
          expect(
            tester.takeException(),
            isNull,
            reason: 'M$screen enlarged scroll $step',
          );
        }
      }
    });
  }
  testWidgets('Dismissing price filters preserves previously applied results', (
    tester,
  ) async {
    final store = TourismStore();
    addTearDown(store.dispose);
    await launch(tester, store, 3);
    await tester.tap(find.byTooltip('Bộ lọc tìm kiếm'));
    await tester.pumpAndSettle();
    final slider = tester.widget<RangeSlider>(find.byType(RangeSlider));
    slider.onChanged!(const RangeValues(500000, 1000000));
    await tester.pumpAndSettle();
    tester.state<NavigatorState>(find.byType(Navigator).first).pop();
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Homestay');
    await tester.pumpAndSettle();
    expect(find.text('Tìm thấy 3 kết quả tại Sa Pa'), findsOneWidget);
    await tester.tap(find.byTooltip('Xóa từ khóa'));
    await tester.pumpAndSettle();
    expect(find.text('Tìm thấy 7 kết quả tại Sa Pa'), findsOneWidget);
  });
  testWidgets(
    'Gallery changes photographs and closes back to the selected offer',
    (tester) async {
      final store = TourismStore();
      addTearDown(store.dispose);
      await launch(tester, store, 4);
      await tester.tap(find.text('1/4 ảnh'));
      await tester.pumpAndSettle();
      expect(find.byType(InteractiveViewer), findsWidgets);
      await tester.tap(find.byTooltip('Ảnh sau'));
      await tester.pumpAndSettle();
      expect(find.text('Khoảnh khắc ở bản · 2/4'), findsOneWidget);
      await tester.tap(find.byTooltip('Đóng thư viện ảnh'));
      await tester.pumpAndSettle();
      expect(find.text(store.selected.name), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('Search keeps the same five navigation destinations', (
    tester,
  ) async {
    final store = TourismStore();
    addTearDown(store.dispose);
    await launch(tester, store, 3);
    final nav = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(nav.destinations.cast<NavigationDestination>().map((d) => d.label), [
      'Khám phá',
      'Yêu thích',
      'Đặt chỗ',
      'Tin nhắn',
      'Cá nhân',
    ]);
    final favorite = find.descendant(
      of: find.byType(CustomerNav),
      matching: find.text('Yêu thích'),
    );
    await tester.tap(favorite);
    await tester.pumpAndSettle();
    expect(find.text('Địa điểm yêu thích'), findsOneWidget);
  });
  testWidgets('Search applies category and typed query to the visible offers', (
    tester,
  ) async {
    final store = TourismStore();
    addTearDown(store.dispose);
    await launch(tester, store, 3);
    await tester.tap(find.text('Homestay'));
    await tester.pumpAndSettle();
    expect(find.text('Tìm thấy 3 kết quả tại Sa Pa'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Tả Van Eco');
    await tester.pumpAndSettle();
    expect(find.text('Tìm thấy 1 kết quả tại Sa Pa'), findsOneWidget);
    expect(find.text('Tả Van Eco Homestay'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'Booking flow preserves room pricing and creates a pending request',
    (tester) async {
      final store = TourismStore()..signedIn = true;
      addTearDown(store.dispose);
      await launch(tester, store, 6);
      await tester.ensureVisible(find.text('Phòng riêng'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Phòng riêng'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tiếp tục'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'NHAPMA');
      await tester.ensureVisible(find.text('Áp dụng'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Áp dụng'));
      await tester.pumpAndSettle();
      expect(store.total, 1170000);
      await tester.tap(find.text('Gửi yêu cầu đặt'));
      await tester.pumpAndSettle();
      expect(find.text('Đã gửi yêu cầu đặt'), findsOneWidget);
      final trip = store.trips.first;
      expect(trip.amount, 1170000);
      expect(trip.status, TripStatus.pending);
      await tester.tap(find.text('Xem đơn đặt'));
      await tester.pumpAndSettle();
      final navigator = tester.state<NavigatorState>(
        find.byType(Navigator).first,
      );
      navigator.push(
        MaterialPageRoute<void>(
          builder: (_) => TripDetail(store: store, trip: trip, managing: true),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Xác nhận đơn · Demo'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Xác nhận đơn · Demo'));
      await tester.pumpAndSettle();
      expect(trip.status, TripStatus.confirmed);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets('Chat submission stays in the local conversation', (
    tester,
  ) async {
    final store = TourismStore();
    addTearDown(store.dispose);
    await launch(tester, store, 8);
    final count = store.messages.length;
    await tester.enterText(find.byType(TextField), 'Cho tôi hỏi về bữa tối');
    await tester.tap(find.byTooltip('Gửi tin nhắn demo'));
    await tester.pumpAndSettle();
    expect(store.messages.length, count + 1);
    expect(store.messages.last.text, 'Cho tôi hỏi về bữa tối');
    expect(tester.takeException(), isNull);
  });
}
