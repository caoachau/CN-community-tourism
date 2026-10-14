import 'package:flutter_test/flutter_test.dart';
import 'package:tourism_ui/src/data.dart';

void main() {
  late TourismStore store;
  setUp(() => store = TourismStore());
  tearDown(() => store.dispose());
  test('Nightly pricing uses checkout minus checkin, and keeps the accepted amount', () {
    store.checkIn = today(3);
    store.checkOut = today(5);
    expect(store.subtotal, 900000);
    store.privateRoom = true;
    store.coupon = true;
    expect(store.total, 1170000);
    final trip = store.submit();
    expect(trip.amount, 1170000);
    store.selected.price = 900000;
    expect(trip.amount, 1170000);
  });
  test('Per-person and per-group quantities are independent of nights', () {
    store.select(store.offers[1]);
    store.guests = 3;
    expect(store.subtotal, 750000);
    store.select(store.offers[6]);
    store.guests = 5;
    expect(store.subtotal, 500000);
  });
  test('Repeated submit returns one request, and a new selection starts a new request', () {
    final count = store.trips.length;
    final trip = store.submit();
    expect(identical(store.submit(), trip), isTrue);
    expect(store.trips.length, count + 1);
    store.select(store.offers[1]);
    expect(identical(store.submit(), trip), isFalse);
    expect(store.trips.length, count + 2);
  });
  test(
    'Household management excludes bookings belonging to other households',
    () {
      final external = store.customerTrips.firstWhere(
        (t) => t.offer.household != 1,
      );
      expect(store.ownTrips.contains(external), isFalse);
      expect(store.ownTrips.every((t) => t.offer.household == 1), isTrue);
    },
  );
}
