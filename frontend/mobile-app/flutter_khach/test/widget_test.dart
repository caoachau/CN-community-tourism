import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_khach/main.dart';

void main() {
  testWidgets('App opens the correct Stitch entry screen', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pumpAndSettle();
    expect(find.text('Khám phá ngay'), findsOneWidget);
    await tester.ensureVisible(find.text('Khám phá ngay'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Khám phá ngay'));
    await tester.pumpAndSettle();
    expect(find.text('Sa Pa'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
