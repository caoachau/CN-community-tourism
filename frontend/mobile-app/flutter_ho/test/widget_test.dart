import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_ho/main.dart';

void main() {
  testWidgets('App opens the correct Stitch entry screen', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();
    expect(find.text('Hộ gia đình Nhà của Pao'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
