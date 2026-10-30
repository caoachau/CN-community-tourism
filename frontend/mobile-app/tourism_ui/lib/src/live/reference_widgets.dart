part of 'app.dart';

const uiGreen = Color(0xFF075B46),
    uiInk = Color(0xFF172136),
    uiMuted = Color(0xFF748298),
    uiBg = Color(0xFFF6F9F8),
    uiBorder = Color(0xFFEBEFF4),
    uiMint = Color(0xFFECFCF5);

ThemeData referenceTheme() {
  final base = tourismTheme();
  return base.copyWith(
    scaffoldBackgroundColor: uiBg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: uiGreen,
      primary: uiGreen,
      surface: Colors.white,
      onSurface: uiInk,
    ),
    textTheme: base.textTheme.apply(bodyColor: uiInk, displayColor: uiInk),
    appBarTheme: base.appBarTheme.copyWith(
      backgroundColor: uiBg,
      foregroundColor: uiInk,
      titleTextStyle: const TextStyle(
        fontFamily: 'packages/tourism_ui/Jakarta',
        fontSize: 17,
        fontWeight: FontWeight.w700,
        color: uiInk,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: uiGreen,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 50),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: uiInk,
        minimumSize: const Size(48, 50),
        side: const BorderSide(color: Color(0xFFD2DAE5)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: uiGreen),
    ),
    inputDecorationTheme: base.inputDecorationTheme.copyWith(
      hintStyle: const TextStyle(color: uiMuted, fontSize: 12),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFDFE7F1)),
      ),
    ),
  );
}

enum MissingFeature {
  favorites(
    'Yêu thích',
    'Chức năng lưu địa điểm yêu thích chưa được triển khai. Thao tác này chưa lưu dữ liệu.',
  ),
  booking(
    'Đặt chỗ và lịch phục vụ',
    'Bạn có thể đặt phòng và dịch vụ từ trang chi tiết, hoặc quản lý chuyến đi ở mục Đặt chỗ.',
  ),
  payment(
    'Thanh toán trực tiếp',
    'Màn xem thử này không tạo giao dịch. Để đặt thật, thêm phòng/dịch vụ vào giỏ ở trang chi tiết; hộ ghi nhận khoản tiền trong đơn đặt.',
  ),
  gateway(
    'Thanh toán trực tuyến',
    'Ví điện tử và thẻ ngân hàng nằm ngoài MVP. Khách và hộ dân thỏa thuận thanh toán trực tiếp.',
  ),
  messages(
    'Tin nhắn',
    'Chat trong ứng dụng chưa được triển khai và nằm ngoài MVP. Bạn có thể lấy số liên hệ ở trang chi tiết.',
  ),
  notifications(
    'Thông báo',
    'Chưa có API danh sách thông báo dành cho ứng dụng.',
  ),
  reviews(
    'Đánh giá',
    'Mở chuyến đi đã hoàn thành trong mục Đặt chỗ để viết hoặc xem đánh giá.',
  ),
  vouchers(
    'Mã giảm giá',
    'Mã giảm giá chưa có trong phạm vi MVP. Hiện không có mã nào được áp dụng.',
  ),
  map(
    'Bản đồ',
    'Bản đồ tích hợp và định vị chưa có trong MVP. Sơ đồ xem thử không thể hiện vị trí thật, khoảng cách hay chỉ đường.',
  ),
  statistics(
    'Thống kê thu nhập',
    'Biểu đồ thống kê tổng hợp chưa triển khai. Các chứng từ thu/hoàn thực tế đã có trong mục Đơn đặt và sổ tiền.',
  ),
  profile(
    'Chỉnh sửa tài khoản',
    'Hiện đã có đăng ký, đăng nhập và kiểm tra tài khoản. Chỉnh sửa hồ sơ, ảnh đại diện và đổi mật khẩu chưa có API.',
  ),
  availability(
    'Khả năng phục vụ',
    'Ngày chọn chỉ dùng để xem bố cục. Chưa kiểm tra phòng trống, lịch dịch vụ, sức chứa hoặc tài nguyên.',
  ),
  sorting(
    'Sắp xếp phổ biến',
    'Chưa có dữ liệu đặt dịch vụ và đánh giá để xếp hạng phổ biến. Danh sách hiện theo thứ tự công khai từ hệ thống.',
  );

  const MissingFeature(this.title, this.description);
  final String title, description;
}

Future<void> featureAlert(
  BuildContext context,
  MissingFeature feature, {
  VoidCallback? preview,
}) async {
  final show = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      icon: const Icon(Icons.info_outline, color: uiGreen),
      title: Text(feature.title),
      content: Text('Chức năng chưa khả dụng\n\n${feature.description}'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Đã hiểu'),
        ),
        if (preview != null)
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xem bố cục'),
          ),
      ],
    ),
  );
  if (show == true && context.mounted) preview?.call();
}

void _push(BuildContext context, Widget page) =>
    Navigator.push(context, MaterialPageRoute<void>(builder: (_) => page));

class _FeatureNote extends StatelessWidget {
  const _FeatureNote(this.text, {this.feature});
  final String text;
  final MissingFeature? feature;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Material(
      color: const Color(0xFFFFF8E8),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: feature == null ? null : () => featureAlert(context, feature!),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.info_outline,
                size: 15,
                color: Color(0xFF91651F),
              ),
              const SizedBox(width: 7),
              Expanded(
                child: Text(
                  text,
                  style: const TextStyle(
                    fontSize: 10,
                    height: 1.5,
                    color: Color(0xFF805E28),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _Surface extends StatelessWidget {
  const _Surface({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
  });
  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(18),
      boxShadow: [
        BoxShadow(
          color: const Color(0xFF273A4A).withValues(alpha: .035),
          blurRadius: 7,
          offset: const Offset(0, 2),
        ),
      ],
    ),
    child: Material(
      color: Colors.white,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: uiBorder),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    ),
  );
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton(this.title, {required this.onTap, this.icon});
  final String title;
  final VoidCallback? onTap;
  final IconData? icon;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: FilledButton(
      onPressed: onTap,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Flexible(
            child: Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          if (icon != null) ...[
            const SizedBox(width: 10),
            Icon(icon, size: 18),
          ],
        ],
      ),
    ),
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {this.action = 'Xem tất cả', this.onTap});
  final String title, action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 16, bottom: 10),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
        ),
        if (onTap != null)
          InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(10),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Row(
                children: [
                  Text(
                    action,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: uiGreen,
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 17, color: uiGreen),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

class _Pill extends StatelessWidget {
  const _Pill(
    this.text, {
    this.active = false,
    this.icon,
    this.onTap,
    this.color,
  });
  final String text;
  final bool active;
  final IconData? icon;
  final VoidCallback? onTap;
  final Color? color;
  @override
  Widget build(BuildContext context) => Material(
    color: active ? uiGreen : color ?? const Color(0xFFF0F4F8),
    borderRadius: BorderRadius.circular(22),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(22),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 15, color: active ? Colors.white : uiGreen),
              const SizedBox(width: 5),
            ],
            Text(
              text,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: active ? Colors.white : uiInk,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _BottomNavigation extends StatelessWidget {
  const _BottomNavigation({required this.selected, required this.onSelect});
  final int selected;
  final ValueChanged<int> onSelect;
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: uiBorder)),
    ),
    child: SafeArea(
      top: false,
      child: Row(
        children: [
          for (final (i, item) in const [
            (Icons.explore_outlined, 'Khám phá'),
            (Icons.favorite_border, 'Yêu thích'),
            (Icons.event_available_outlined, 'Đặt chỗ'),
            (Icons.chat_bubble_outline, 'Tin nhắn'),
            (Icons.person_outline, 'Cá nhân'),
          ].indexed)
            Expanded(
              child: Semantics(
                button: true,
                selected: selected == i,
                label: item.$2,
                onTap: () => onSelect(i),
                child: ExcludeSemantics(
                  child: InkWell(
                    onTap: () => onSelect(i),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: selected == i
                                  ? uiMint
                                  : Colors.transparent,
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              item.$1,
                              size: 21,
                              color: selected == i
                                  ? uiGreen
                                  : const Color(0xFF95A3B8),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            item.$2,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: selected == i
                                  ? FontWeight.w700
                                  : FontWeight.w400,
                              color: selected == i ? uiGreen : uiMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

enum PublicKind {
  service('services', 'service', 'Trải nghiệm'),
  room('rooms', 'room', 'Lưu trú'),
  place('places', 'place', 'Điểm phục vụ');

  const PublicKind(this.path, this.root, this.title);
  final String path, root, title;
}

class _Listing {
  const _Listing(this.kind, this.data);
  final PublicKind kind;
  final Json data;
  String get id => data['id'].toString();
  String get title => titleOf(data);
  Json get place => kind == PublicKind.place ? data : object(data['place']);
  Json get location => object(place['details']);
  String get locality =>
      location['locality']?.toString() ?? 'Địa phương chưa cập nhật';
  List<Json> get offers => records(data['offers']);
  int? get price => kind == PublicKind.room
      ? (data['nightlyPriceVnd'] as num?)?.toInt()
      : offers.isEmpty
      ? null
      : offers.map((o) => (o['unitPriceVnd'] as num).toInt()).reduce(math.min);
  Json get firstOffer => offers.isEmpty
      ? {}
      : offers.reduce(
          (a, b) =>
              (a['unitPriceVnd'] as num) <= (b['unitPriceVnd'] as num) ? a : b,
        );
  String get unit => kind == PublicKind.room ? 'đêm' : _unit(firstOffer);
  String get image => kind == PublicKind.room
      ? 'pao_landscape'
      : kind == PublicKind.place
      ? 'eco'
      : '${data['title']}'.toLowerCase().contains('bánh') ||
            '${data['title']}'.toLowerCase().contains('ẩm')
      ? 'food'
      : 'trek';
  List<String> get tags => kind == PublicKind.room
      ? [
          'Tối đa ${data['maxGuests'] ?? '—'} khách',
          ..._strings(object(data['details'])['amenities']).take(2),
        ]
      : kind == PublicKind.place
      ? ['Điểm phục vụ']
      : [
          object(data['category'])['name']?.toString() ?? 'Trải nghiệm',
          '${data['defaultDurationMinutes'] ?? '—'} phút',
        ];
}

List<String> _strings(dynamic value) =>
    value is List ? value.whereType<String>().toList() : [];
String _unit(Json offer) => switch (offer['pricingType']) {
  'PER_PERSON' => 'người',
  'PER_GROUP' => 'nhóm',
  'PER_TRIP' => 'chuyến',
  'FIXED_PACKAGE' => 'gói',
  'PER_HOUR' => 'giờ',
  'PER_UNIT' => offer['unitLabel']?.toString() ?? 'đơn vị',
  _ => '',
};

class _ListingPhoto extends StatelessWidget {
  const _ListingPhoto(
    this.item, {
    required this.api,
    this.height = 150,
    this.favorite = true,
    this.image,
  });
  final _Listing item;
  final TourismApi api;
  final String? image;
  final double height;
  final bool favorite;
  @override
  Widget build(BuildContext context) => Stack(
    children: [
      if (item.kind == PublicKind.place)
        Photo(
          image ?? item.image,
          height: height,
          width: double.infinity,
          label: 'Ảnh minh họa du lịch cộng đồng',
        )
      else
        PublicCover(
          api: api,
          endpoint: '/public/${item.kind.path}/${item.id}/images',
          height: height,
          fallback: Photo(
            image ?? item.image,
            height: height,
            width: double.infinity,
            label: 'Ảnh minh họa du lịch cộng đồng',
          ),
        ),
      Positioned(
        left: 8,
        bottom: 8,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: .5),
            borderRadius: BorderRadius.circular(5),
          ),
          child: const Text(
            'Hình ảnh giới thiệu',
            style: TextStyle(color: Colors.white, fontSize: 8),
          ),
        ),
      ),
      if (favorite)
        Positioned(
          right: 4,
          top: 2,
          child: IconButton(
            tooltip: 'Lưu yêu thích',
            onPressed: () => featureAlert(context, MissingFeature.favorites),
            style: IconButton.styleFrom(
              backgroundColor: Colors.white.withValues(alpha: .92),
              minimumSize: const Size(36, 36),
            ),
            icon: const Icon(Icons.favorite_border, size: 19, color: uiMuted),
          ),
        ),
    ],
  );
}

class _Price extends StatelessWidget {
  const _Price(this.item, {this.large = false, this.red = false});
  final _Listing item;
  final bool large, red;
  @override
  Widget build(BuildContext context) => Text.rich(
    TextSpan(
      children: [
        TextSpan(
          text: item.price == null
              ? 'Liên hệ hộ'
              : '${item.kind == PublicKind.service ? 'Từ ' : ''}${money(item.price!)}',
          style: TextStyle(
            fontSize: large ? 21 : 13,
            fontWeight: FontWeight.w700,
            color: red ? const Color(0xFFE22F35) : uiGreen,
          ),
        ),
        if (item.price != null)
          TextSpan(
            text: ' /${item.unit}',
            style: const TextStyle(fontSize: 10, color: uiMuted),
          ),
      ],
    ),
  );
}

class _ListingCard extends StatelessWidget {
  const _ListingCard({
    required this.api,
    required this.item,
    this.compact = false,
  });
  final TourismApi api;
  final _Listing item;
  final bool compact;
  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    button: true,
    label: 'Xem chi tiết ${item.title}',
    onTap: () =>
        _push(context, PublicDetail(api: api, kind: item.kind, id: item.id)),
    child: _Surface(
      padding: EdgeInsets.zero,
      onTap: () =>
          _push(context, PublicDetail(api: api, kind: item.kind, id: item.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ListingPhoto(
            item,
            api: api,
            height: compact ? 115 : 178,
            image: compact && item.kind == PublicKind.room ? 'pao' : null,
          ),
          Padding(
            padding: EdgeInsets.all(compact ? 10 : 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: compact ? 2 : 3,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: compact ? 12 : 16,
                    height: 1.4,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 13,
                      color: uiGreen,
                    ),
                    const SizedBox(width: 3),
                    Expanded(
                      child: Text(
                        item.locality,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 10,
                          color: uiMuted,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (compact)
                  SizedBox(
                    height: 34,
                    child: Text(
                      item.data['body']?.toString() ?? item.tags.join(' · '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 9,
                        height: 1.7,
                        color: uiMuted,
                      ),
                    ),
                  )
                else
                  Wrap(
                    spacing: 5,
                    runSpacing: 5,
                    children: item.tags
                        .map(
                          (s) => Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 7,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: Text(
                              s,
                              style: const TextStyle(fontSize: 10),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                if (!compact) const Divider(height: 24, color: uiBorder),
                const SizedBox(height: 8),
                if (compact)
                  _Price(item, red: true)
                else
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.kind == PublicKind.room
                              ? 'Giá phòng mỗi đêm'
                              : 'Giá tham khảo',
                          style: const TextStyle(fontSize: 10, color: uiMuted),
                        ),
                      ),
                      Flexible(child: _Price(item, large: true)),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
