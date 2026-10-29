import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_ho/main.dart';
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
  testWidgets('Household app requires real sign-in before opening management', (
    tester,
  ) async {
    final api = GuestApi();
    addTearDown(api.dispose);
    await tester.pumpWidget(MyApp(api: api));
    await tester.pumpAndSettle();
    expect(find.text('Không gian hộ dân'), findsOneWidget);
    expect(find.text('Đăng nhập'), findsOneWidget);
    expect(find.text('Hộ gia đình Nhà của Pao'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
