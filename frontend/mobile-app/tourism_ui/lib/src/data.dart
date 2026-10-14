import 'package:flutter/foundation.dart';

String money(int value) =>
    '${value.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')}đ';
String dateText(DateTime d) =>
    '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
DateTime today([int days = 0]) {
  final n = DateTime.now();
  return DateTime(n.year, n.month, n.day + days);
}

enum PriceUnit { night, person, group }

enum TripStatus {
  pending('Chờ xác nhận'),
  confirmed('Đã xác nhận'),
  completed('Đã hoàn thành'),
  cancelled('Đã hủy');

  const TripStatus(this.label);
  final String label;
}

class Offer {
  Offer(
    this.id,
    this.name,
    this.image,
    this.category,
    this.location,
    this.price,
    this.unit, {
    this.rating = '4.9',
    this.reviews = 128,
    this.household = 1,
    this.limit = 6,
    this.description = '',
    this.highlights = const [],
  });
  final int id, household, limit, reviews;
  final String name, image, category, location, rating, description;
  final List<String> highlights;
  int price;
  final PriceUnit unit;
  bool available = true;
  String get unitLabel => switch (unit) {
    PriceUnit.night => 'đêm',
    PriceUnit.person => 'người',
    PriceUnit.group => 'nhóm',
  };
}

class Trip {
  Trip({
    required this.code,
    required this.offer,
    required this.start,
    required this.end,
    required this.guests,
    required this.customer,
    required this.amount,
    this.room = 'Phòng cộng đồng',
    this.status = TripStatus.pending,
    this.customerOwned = true,
  });
  final String code, customer, room;
  final Offer offer;
  final DateTime start, end;
  final int guests, amount;
  final bool customerOwned;
  TripStatus status;
  String reason = '';
  int? stars;
  String review = '';
}

class ChatMessage {
  ChatMessage(this.text, this.mine, this.time);
  final String text, time;
  final bool mine;
}

/// Presentation state only. No network calls, real authentication or payments.
class TourismStore extends ChangeNotifier {
  TourismStore() {
    selected = offers.first;
    trips.addAll([
      Trip(
        code: 'CT-DEMO-001',
        offer: offers[0],
        start: today(5),
        end: today(7),
        guests: 2,
        customer: 'Nguyễn Thị Mai',
        amount: 900000,
        status: TripStatus.confirmed,
      ),
      Trip(
        code: 'CT-DEMO-002',
        offer: offers[0],
        start: today(9),
        end: today(10),
        guests: 3,
        customer: 'Trần Minh Đức',
        amount: 450000,
        customerOwned: false,
      ),
      Trip(
        code: 'CT-DEMO-003',
        offer: offers[0],
        start: today(12),
        end: today(14),
        guests: 2,
        customer: 'Lê Hoàng Anh',
        amount: 900000,
        status: TripStatus.confirmed,
        customerOwned: false,
      ),
      Trip(
        code: 'CT-DEMO-004',
        offer: offers[2],
        start: today(-20),
        end: today(-20),
        guests: 4,
        customer: 'Nguyễn Thị Mai',
        amount: 1200000,
        status: TripStatus.completed,
      ),
    ]);
  }
  final offers = <Offer>[
    Offer(
      1,
      'Homestay Nhà của Pao',
      'pao',
      'Homestay',
      'Bản Tả Van, Sa Pa',
      450000,
      PriceUnit.night,
      highlights: ['Phòng riêng', 'Bữa sáng miễn phí', 'View ruộng bậc thang'],
      description: 'Nhà của Pao là homestay do gia đình người Mông tự quản, nằm giữa thung lũng Tả Van với view ruộng bậc thang tuyệt đẹp. Đến đây, bạn sẽ được trải nghiệm cuộc sống bình dị, thưởng thức ẩm thực truyền thống và tìm hiểu văn hóa bản địa.',
    ),
    Offer(
      2,
      'Trải nghiệm ẩm thực cùng gia đình người Mông',
      'food',
      'Ẩm thực',
      'Bản Cát Cát, Sa Pa',
      250000,
      PriceUnit.person,
      rating: '4.8',
      reviews: 96,
      household: 2,
      limit: 8,
      highlights: ['Nấu ăn cùng chủ nhà', '2 – 4 giờ', 'Bao gồm nguyên liệu'],
      description: 'Cùng gia đình chuẩn bị bữa cơm vùng cao, khám phá nguyên liệu địa phương và thưởng thức các món ăn truyền thống. Bạn có thể đặt riêng trải nghiệm, không cần đặt phòng.',
    ),
    Offer(
      3,
      'Trekking bản làng Tả Phìn',
      'trek',
      'Trải nghiệm',
      'Bản Tả Phìn, Sa Pa',
      300000,
      PriceUnit.person,
      household: 3,
      limit: 10,
      reviews: 76,
      highlights: ['Nửa ngày', 'Hướng dẫn viên bản địa', 'Khám phá bản làng'],
      description: 'Đi bộ qua ruộng bậc thang, ghé thăm bản làng cùng người hướng dẫn địa phương. Bao gồm hướng dẫn và nước uống; chuẩn bị giày đi bộ phù hợp.',
    ),
    Offer(
      4,
      'Làm thổ cẩm truyền thống',
      'craft',
      'Trải nghiệm',
      'Bản Tả Van, Sa Pa',
      180000,
      PriceUnit.person,
      rating: '4.7',
      reviews: 54,
      highlights: ['Học cùng nghệ nhân', 'Dụng cụ có sẵn', '2 giờ'],
      description: 'Tìm hiểu nghề dệt thổ cẩm, thử các thao tác cơ bản và nghe câu chuyện văn hóa từ người dân.',
    ),
    Offer(
      5,
      'Tả Van Eco Homestay',
      'eco',
      'Homestay',
      'Thôn Tả Van Giáy, Sa Pa',
      380000,
      PriceUnit.night,
      household: 4,
      rating: '4.8',
      reviews: 95,
      highlights: ['Nhà sàn gỗ', 'Văn hóa Giáy', 'Gần suối Mường Hoa'],
    ),
    Offer(
      6,
      'Lá Dao Spa & Homestay Tả Van',
      'spa',
      'Homestay',
      'Bản Tả Van, Sa Pa',
      620000,
      PriceUnit.night,
      household: 5,
      rating: '4.9',
      reviews: 150,
      highlights: ['Tắm lá thuốc', 'Cafe ngắm mây', 'View thung lũng'],
    ),
    Offer(
      7,
      'Dạo bản cùng hướng dẫn viên',
      'trek',
      'Hướng dẫn',
      'Bản Tả Van, Sa Pa',
      500000,
      PriceUnit.group,
      household: 3,
      limit: 5,
      highlights: ['Một nhóm tối đa 5 khách', 'Hướng dẫn địa phương'],
    ),
  ];
  final likes = <int>{1, 3};
  final trips = <Trip>[];
  final messages = <ChatMessage>[
    ChatMessage(
      'Chào bạn! Bạn có thể tìm hiểu thêm về homestay của gia đình mình nhé! Mình rất vui được đón tiếp 😊',
      false,
      '09:12',
    ),
    ChatMessage(
      'Chào chị Pao, homestay còn phòng vào ngày em chọn không ạ? Nhà mình có dịch vụ ăn tối không?',
      true,
      '09:15',
    ),
    ChatMessage(
      'Dạ còn phòng bạn nhé! Gia đình có phục vụ bữa sáng và bữa tối với các món đặc sản của người Mông. Bạn muốn mình giữ phòng cho 2 người phải không ạ? 😊',
      false,
      '09:18',
    ),
  ];
  final notices = <String>[
    'Chào mừng bạn đến với bản demo du lịch cộng đồng.',
    'Đơn CT-DEMO-001 đã được hộ dân xác nhận.',
  ];
  late Offer selected;
  DateTime checkIn = today(5), checkOut = today(7);
  int guests = 2;
  bool privateRoom = false, signedIn = false, coupon = false;
  String customerName = 'Nguyễn Thị Mai', phone = '0912345678';
  Trip? submitted;
  int get nights => checkOut.difference(checkIn).inDays;
  int get unitPrice => selected.unit == PriceUnit.night && privateRoom
      ? selected.price + 200000
      : selected.price;
  int get subtotal =>
      unitPrice *
      switch (selected.unit) {
        PriceUnit.night => nights,
        PriceUnit.person => guests,
        PriceUnit.group => 1,
      };
  int get discount => coupon ? subtotal ~/ 10 : 0;
  int get total => subtotal - discount;
  List<Trip> get ownTrips =>
      trips.where((t) => t.offer.household == 1).toList();
  List<Trip> get customerTrips => trips.where((t) => t.customerOwned).toList();
  void changed() => notifyListeners();
  void select(Offer offer) {
    selected = offer;
    guests = 2;
    privateRoom = false;
    coupon = false;
    submitted = null;
    changed();
  }

  void toggleLike(int id) {
    if (!likes.add(id)) likes.remove(id);
    changed();
  }

  void send(String value) {
    if (value.trim().isEmpty) return;
    final n = DateTime.now();
    messages.add(
      ChatMessage(
        value.trim(),
        true,
        '${n.hour.toString().padLeft(2, '0')}:${n.minute.toString().padLeft(2, '0')}',
      ),
    );
    changed();
  }

  Trip submit() {
    if (submitted != null) return submitted!;
    if (selected.unit == PriceUnit.night && nights < 1 ||
        guests < 1 ||
        guests > selected.limit) {
      throw StateError('Kiểm tra lại lịch và số khách.');
    }
    final trip = Trip(
      code: 'CT-DEMO-${(trips.length + 1).toString().padLeft(3, '0')}',
      offer: selected,
      start: checkIn,
      end: selected.unit == PriceUnit.night ? checkOut : checkIn,
      guests: guests,
      customer: customerName,
      amount: total,
      room: selected.unit == PriceUnit.night
          ? privateRoom
                ? 'Phòng riêng'
                : 'Phòng cộng đồng'
          : selected.category,
    );
    trips.insert(0, trip);
    submitted = trip;
    notices.insert(0, 'Đã gửi ${trip.code}, đang chờ hộ xác nhận.');
    changed();
    return trip;
  }
}
