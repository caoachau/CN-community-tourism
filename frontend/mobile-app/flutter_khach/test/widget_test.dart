import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_khach/main.dart';
import 'package:tourism_ui/tourism_ui.dart';

class GuestApi extends TourismApi {
  @override
  Future<void> restore() async {
    restoring = false;
    notifyListeners();
  }

  @override
  Future<Json> request(
    String method,
    String path, {
    Json? body,
    Map<String, dynamic>? query,
    bool authenticated = true,
    Uint8List? bytes,
    bool binary = false,
  }) async => {'items': [], 'total': 0, 'page': 1, 'pageSize': 20};
}

void main() {
  testWidgets(
    'Customer app opens the live public catalog without requiring login',
    (tester) async {
      final api = GuestApi();
      addTearDown(api.dispose);
      await tester.pumpWidget(MyApp(api: api));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Khám phá ngay'));
      await tester.tap(find.text('Khám phá ngay'));
      await tester.pumpAndSettle();
      expect(find.text('Khám phá'), findsOneWidget);
      expect(find.text('Trải nghiệm'), findsOneWidget);
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -600));
      await tester.pumpAndSettle();
      expect(find.textContaining('Chưa có nội dung phù hợp'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
