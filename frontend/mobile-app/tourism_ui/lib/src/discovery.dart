import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'data.dart';
import 'widgets.dart';
import 'motion.dart';
import 'editorial.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({
    super.key,
    required this.store,
    this.category = 'Tất cả',
  });
  final TourismStore store;
  final String category;
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final searchController = TextEditingController();
  @override
  void dispose() {
    searchController.dispose();
    super.dispose();
  }

  late String category = widget.category;
  String query = '';
  RangeValues range = const RangeValues(0, 1000000);
  bool cheapest = false;
  void filters() {
    var draft = range;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => StatefulBuilder(
        builder: (context, update) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Khoảng giá',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 14),
                Text(
                  '${money(draft.start.round())} – ${money(draft.end.round())}',
                ),
                RangeSlider(
                  values: draft,
                  min: 0,
                  max: 1000000,
                  divisions: 20,
                  onChanged: (v) => update(() => draft = v),
                ),
                const Text(
                  'Giá theo đơn vị tính của từng dịch vụ.',
                  style: TextStyle(color: gray, fontSize: 13),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      setState(() => range = draft);
                      Navigator.pop(sheet);
                    },
                    child: const Text('Áp dụng bộ lọc'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    bottomNavigationBar: const CustomerNav(selected: 1, search: true),
    floatingActionButton: FloatingActionButton.extended(
      backgroundColor: green,
      foregroundColor: Colors.white,
      onPressed: () => go(context, 5),
      icon: const Icon(Icons.map_outlined, size: 19),
      label: const Text('Bản đồ'),
    ),
    body: SafeArea(
      bottom: false,
      child: ListenableBuilder(
        listenable: widget.store,
        builder: (context, _) {
          final results = widget.store.offers
              .where(
                (o) =>
                    o.available &&
                    (category == 'Tất cả' || o.category == category) &&
                    '${o.name} ${o.location}'.toLowerCase().contains(
                      query.toLowerCase(),
                    ) &&
                    o.price >= range.start &&
                    o.price <= range.end,
              )
              .toList();
          if (cheapest) results.sort((a, b) => a.price.compareTo(b.price));
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 70),
            children: [
              const Eyebrow('Một hành trình dành riêng cho bạn'),
              const SizedBox(height: 8),
              Text('Tìm một trải nghiệm.', style: editorial),
              const SizedBox(height: 22),
              Row(
                children: [
                  IconButton(
                    tooltip: 'Quay lại',
                    onPressed: () => backToExplore(context),
                    icon: const Icon(Icons.chevron_left),
                  ),
                  Expanded(
                    child: TextField(
                      controller: searchController,
                      textInputAction: TextInputAction.search,
                      onChanged: (v) => setState(() => query = v),
                      decoration: InputDecoration(
                        hintText: 'Tên dịch vụ, địa điểm…',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        suffixIcon: query.isEmpty
                            ? null
                            : IconButton(
                                tooltip: 'Xóa từ khóa',
                                onPressed: () {
                                  searchController.clear();
                                  setState(() => query = '');
                                },
                                icon: const Icon(Icons.close, size: 18),
                              ),
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Bộ lọc tìm kiếm',
                    onPressed: filters,
                    icon: const Icon(Icons.tune, color: green),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    for (final c in [
                      'Tất cả',
                      'Homestay',
                      'Ẩm thực',
                      'Trải nghiệm',
                      'Hướng dẫn',
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 7),
                        child: ChoiceChip(
                          label: Text(c),
                          selected: c == category,
                          onSelected: (_) => setState(() => category = c),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  OutlinedButton.icon(
                    onPressed: filters,
                    icon: const Icon(Icons.filter_alt_outlined, size: 15),
                    label: const Text('Lọc', style: TextStyle(fontSize: 13)),
                  ),
                  Tag(
                    '${(range.start / 1000).round()}k – ${(range.end / 1000).round()}k',
                    fill: const Color(0xFFF1F5F9),
                    color: gray,
                  ),
                  TextButton.icon(
                    onPressed: () => setState(() => cheapest = !cheapest),
                    icon: const Icon(Icons.swap_vert, size: 15),
                    label: Text(
                      cheapest ? 'Giá tăng dần' : 'Phổ biến',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'Tìm thấy ${results.length} kết quả tại Sa Pa',
                  style: const TextStyle(fontSize: 14, color: gray),
                ),
              ),
              if (results.isEmpty)
                Panel(
                  child: Column(
                    children: [
                      const CircleAvatar(
                        radius: 32,
                        backgroundColor: mint,
                        child: Icon(
                          Icons.travel_explore,
                          size: 32,
                          color: green,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Thử một hướng khác nhé.',
                        style: editorial.copyWith(fontSize: 23),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Chưa có dịch vụ phù hợp. Bạn có thể đổi từ khóa hoặc mở rộng khoảng giá.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: gray, height: 1.7),
                      ),
                      const SizedBox(height: 20),
                      PrimaryAction(
                        label: 'Xóa bộ lọc',
                        onPressed: () {
                          searchController.clear();
                          setState(() {
                            query = '';
                            category = 'Tất cả';
                            range = const RangeValues(0, 1000000);
                          });
                        },
                      ),
                    ],
                  ),
                ),
              for (final offer in results)
                Padding(
                  padding: const EdgeInsets.only(bottom: 18),
                  child: Reveal(
                    key: ValueKey(offer.id),
                    child: OfferTile(
                      store: widget.store,
                      offer: offer,
                      large: true,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    ),
  );
}

class DetailScreen extends StatefulWidget {
  const DetailScreen({super.key, required this.store});
  final TourismStore store;
  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  int tab = 0, photo = 0;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) {
      final store = widget.store, o = store.selected;
      final images = o.unit != PriceUnit.night
          ? [o.image, 'valley', 'host']
          : [o.id == 1 ? 'detail' : o.image, 'bedroom', 'valley', 'woodhouse'];
      return Scaffold(
        bottomNavigationBar: BottomArea(
          child: Row(
            children: [
              _DetailAction(
                Icons.chat_bubble_outline,
                'Nhắn tin',
                () => go(context, 8),
              ),
              _DetailAction(
                store.likes.contains(o.id)
                    ? Icons.favorite
                    : Icons.favorite_border,
                'Yêu thích',
                () => store.toggleLike(o.id),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () => go(context, 6),
                  child: const Text('Đặt ngay'),
                ),
              ),
            ],
          ),
        ),
        body: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  AnimatedSwitcher(
                    duration: motionTime(context, 350),
                    child: Photo(
                      images[photo],
                      key: ValueKey(images[photo]),
                      height: 320,
                      width: double.infinity,
                    ),
                  ),
                  SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          _RoundIcon(
                            Icons.chevron_left,
                            () => backToExplore(context),
                          ),
                          const Spacer(),
                          _RoundIcon(
                            store.likes.contains(o.id)
                                ? Icons.favorite
                                : Icons.favorite_border,
                            () => store.toggleLike(o.id),
                          ),
                          const SizedBox(width: 8),
                          _RoundIcon(Icons.ios_share, () {
                            Clipboard.setData(
                              const ClipboardData(
                                text: 'Du lịch cộng đồng · Bản demo giao diện',
                              ),
                            );
                            message(
                              context,
                              'Đã sao chép thông tin giới thiệu demo.',
                            );
                          }),
                        ],
                      ),
                    ),
                  ),
                  Positioned(
                    right: 16,
                    bottom: 12,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: .94),
                        foregroundColor: green,
                        minimumSize: const Size(48, 48),
                      ),
                      onPressed: () => showPhotoGallery(context, images, photo),
                      icon: const Icon(Icons.grid_view_rounded, size: 17),
                      label: Text(
                        '${photo + 1}/${images.length} ảnh',
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ),
                ],
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 18, 18, 28),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            o.name,
                            style: editorial.copyWith(fontSize: 27),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Stars(o),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Photo('host', height: 36, width: 36, radius: 36),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Hộ gia đình: ${o.household == 1 ? 'Vàng Thị Pao' : 'Chủ hộ địa phương'}',
                                style: const TextStyle(fontSize: 13),
                              ),
                              Meta(
                                Icons.location_on_outlined,
                                o.location,
                                size: 10,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),
                    Text.rich(
                      TextSpan(
                        text: money(o.price),
                        style: const TextStyle(
                          color: green,
                          fontSize: 23,
                          fontWeight: FontWeight.w800,
                        ),
                        children: [
                          TextSpan(
                            text: ' /${o.unitLabel}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: gray,
                              fontWeight: FontWeight.normal,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        Tag(
                          o.category,
                          fill: const Color(0xFFFCF8F2),
                          color: clay,
                        ),
                        for (final t in o.highlights.take(3))
                          Tag(t, fill: const Color(0xFFFCF8F2), color: clay),
                      ],
                    ),
                    const SizedBox(height: 14),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          for (final (i, t) in [
                            'Giới thiệu',
                            'Tiện nghi',
                            'Đánh giá',
                            'Vị trí',
                          ].indexed)
                            TextButton(
                              onPressed: () => setState(() => tab = i),
                              style: TextButton.styleFrom(
                                foregroundColor: tab == i ? green : gray,
                                backgroundColor: tab == i
                                    ? lime
                                    : Colors.transparent,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Text(
                                t,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: tab == i
                                      ? FontWeight.bold
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    const SizedBox(height: 14),
                    if (tab == 0)
                      Text(
                        o.description.isEmpty
                            ? 'Một không gian gần gũi để trải nghiệm cuộc sống và văn hóa địa phương cùng người dân.'
                            : o.description,
                        style: const TextStyle(
                          fontSize: 14,
                          color: gray,
                          height: 1.8,
                        ),
                      ),
                    if (tab == 1)
                      Column(
                        children: [
                          for (final h in o.highlights)
                            Meta(Icons.check_circle_outline, h, size: 12),
                        ],
                      ),
                    if (tab == 2)
                      const Panel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '★ 4.9 · Đánh giá minh họa',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            SizedBox(height: 10),
                            Text(
                              'Gia đình thân thiện, phong cảnh rất đẹp. Một trải nghiệm gần gũi và đáng nhớ.',
                              style: TextStyle(color: gray, height: 1.6),
                            ),
                          ],
                        ),
                      ),
                    if (tab == 3)
                      OutlinedButton.icon(
                        onPressed: () => go(context, 5),
                        icon: const Icon(Icons.map_outlined),
                        label: Text('Xem ${o.location} trên bản đồ demo'),
                      ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        for (int i = 0; i < images.length; i++)
                          Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(
                                right: i == images.length - 1 ? 0 : 8,
                              ),
                              child: Semantics(
                                button: true,
                                label: 'Xem ảnh ${i + 1}',
                                selected: photo == i,
                                child: InkWell(
                                  onTap: () => setState(() => photo = i),
                                  child: AnimatedContainer(
                                    duration: motionTime(context),
                                    padding: const EdgeInsets.all(3),
                                    decoration: BoxDecoration(
                                      border: Border.all(
                                        color: photo == i
                                            ? green
                                            : Colors.transparent,
                                        width: 2,
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                    child: Photo(
                                      images[i],
                                      height: 74,
                                      radius: 10,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                    Section(
                      o.unit == PriceUnit.night
                          ? 'Chọn ngày và số lượng khách'
                          : 'Lịch trải nghiệm',
                    ),
                    Panel(
                      padding: const EdgeInsets.all(8),
                      child: Column(
                        children: [
                          ListTile(
                            leading: const Icon(
                              Icons.calendar_today_outlined,
                              size: 19,
                              color: gray,
                            ),
                            title: Text(
                              o.unit == PriceUnit.night
                                  ? 'Ngày nhận – trả phòng'
                                  : 'Ngày tham gia',
                              style: const TextStyle(fontSize: 12, color: gray),
                            ),
                            subtitle: Text(
                              '${dateText(store.checkIn)}${o.unit == PriceUnit.night ? ' → ${dateText(store.checkOut)}' : ''}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            trailing: const Icon(Icons.chevron_right, size: 20),
                            onTap: () => go(context, 6),
                          ),
                          const Divider(),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Row(
                              children: [
                                const Expanded(
                                  child: Text(
                                    'Số lượng khách',
                                    style: TextStyle(fontSize: 14),
                                  ),
                                ),
                                StepperField(
                                  value: store.guests,
                                  max: o.limit,
                                  onChanged: (v) {
                                    store.guests = v;
                                    store.changed();
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Section('An tâm trước chuyến đi'),
                    const HelpfulNote(
                      'Đặt trực tiếp với hộ dân',
                      'Hộ dân xác nhận yêu cầu và cùng bạn thống nhất việc phục vụ, thanh toán. Hãy trao đổi nhu cầu đặc biệt trước chuyến đi.',
                      icon: Icons.handshake_outlined,
                    ),
                    const SizedBox(height: 14),
                    Panel(
                      padding: EdgeInsets.zero,
                      child: Column(
                        children: [
                          const ExpansionTile(
                            title: Text(
                              'Nếu kế hoạch thay đổi?',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            childrenPadding: EdgeInsets.fromLTRB(16, 0, 16, 20),
                            children: [
                              Text(
                                'Bạn có thể hủy toàn đơn trước khi hạng mục đầu tiên bắt đầu. Việc hoàn tiền được trao đổi riêng với hộ dân; hủy đơn không tự chuyển tiền hoàn.',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: gray,
                                  height: 1.7,
                                ),
                              ),
                            ],
                          ),
                          ExpansionTile(
                            title: const Text(
                              'Nên chuẩn bị những gì?',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            childrenPadding: const EdgeInsets.fromLTRB(
                              16,
                              0,
                              16,
                              20,
                            ),
                            children: [
                              Text(
                                o.unit == PriceUnit.night
                                    ? 'Mang giấy tờ cá nhân, đồ dùng cần thiết và hỏi hộ về giờ đến. Báo trước số người và nhu cầu ăn uống của bạn.'
                                    : 'Hỏi chủ hộ về thời tiết, trang phục và mức độ vận động. Thông báo trước nếu có dị ứng hoặc cần hỗ trợ di chuyển.',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: gray,
                                  height: 1.7,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}

class _DetailAction extends StatelessWidget {
  const _DetailAction(this.icon, this.label, this.tap);
  final IconData icon;
  final String label;
  final VoidCallback tap;
  @override
  Widget build(BuildContext context) => Container(
    width: 62,
    constraints: const BoxConstraints(minHeight: 56),
    child: InkWell(
      onTap: tap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: gray, size: 19),
          const SizedBox(height: 5),
          Text(label, style: const TextStyle(fontSize: 11, color: gray)),
        ],
      ),
    ),
  );
}

class _RoundIcon extends StatelessWidget {
  const _RoundIcon(this.icon, this.tap);
  final IconData icon;
  final VoidCallback tap;
  @override
  Widget build(BuildContext context) => IconButton.filledTonal(
    onPressed: tap,
    tooltip: icon == Icons.chevron_left
        ? 'Quay lại'
        : icon == Icons.ios_share
        ? 'Chia sẻ thông tin'
        : 'Lưu vào yêu thích',
    style: IconButton.styleFrom(
      backgroundColor: Colors.white.withValues(alpha: .94),
      minimumSize: const Size(48, 48),
    ),
    icon: Icon(icon, size: 19, color: green),
  );
}

class MapScreen extends StatefulWidget {
  const MapScreen({super.key, required this.store});
  final TourismStore store;
  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  String category = 'Homestay';
  late Offer selected = widget.store.selected;
  final transform = TransformationController();
  @override
  void dispose() {
    transform.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(
      children: [
        Positioned.fill(
          child: LayoutBuilder(
            builder: (context, size) => InteractiveViewer(
              transformationController: transform,
              minScale: 1,
              maxScale: 2.5,
              child: SizedBox(
                width: size.maxWidth,
                height: size.maxHeight,
                child: Stack(
                  children: [
                    const Positioned.fill(
                      child: CustomPaint(painter: _MapPainter()),
                    ),
                    for (final (i, o) in widget.store.offers.take(6).indexed)
                      if (category == 'Tất cả' || o.category == category)
                        Positioned(
                          left:
                              size.maxWidth *
                                  ([.62, .69, .34, .74, .35, .39][i]) -
                              20,
                          top:
                              size.maxHeight *
                                  ([.28, .6, .44, .22, .36, .61][i]) -
                              20,
                          child: IconButton.filled(
                            tooltip:
                                '${o.name}, ${money(o.price)} mỗi ${o.unitLabel}',
                            onPressed: () => setState(() => selected = o),
                            style: IconButton.styleFrom(
                              backgroundColor: o.category == 'Homestay'
                                  ? green
                                  : o.category == 'Ẩm thực'
                                  ? clay
                                  : const Color(0xFF47686C),
                              side: BorderSide(
                                color: Colors.white,
                                width: selected == o ? 4 : 2,
                              ),
                            ),
                            icon: Icon(
                              o.category == 'Homestay'
                                  ? Icons.home_outlined
                                  : o.category == 'Ẩm thực'
                                  ? Icons.restaurant
                                  : Icons.hiking,
                              size: selected == o ? 25 : 20,
                            ),
                          ),
                        ),
                    Positioned(
                      left: size.maxWidth * .46,
                      top: size.maxHeight * .40,
                      child: const Text(
                        'Sa Pa',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Positioned(
                      left: size.maxWidth * .59,
                      top: size.maxHeight * .31,
                      child: const Text(
                        'Bản Tả Van',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                    Positioned(
                      left: 18,
                      top: size.maxHeight * .47,
                      child: const Text(
                        'Bản Cát Cát',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                    Positioned(
                      right: 32,
                      top: size.maxHeight * .65,
                      child: const Text(
                        'Bản Tả Phìn',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        onSubmitted: (v) {
                          final matches = widget.store.offers
                              .where(
                                (o) => o.name.toLowerCase().contains(
                                  v.toLowerCase(),
                                ),
                              )
                              .toList();
                          if (matches.isEmpty) {
                            message(context, 'Chưa có địa điểm phù hợp.');
                            return;
                          }
                          setState(() {
                            selected = matches.first;
                            category = 'Tất cả';
                          });
                        },
                        decoration: const InputDecoration(
                          hintText: 'Tìm địa điểm trên bản đồ…',
                          prefixIcon: Icon(Icons.search, size: 19),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filledTonal(
                      tooltip: 'Đóng bản đồ',
                      onPressed: () => backToExplore(context),
                      icon: const Icon(Icons.close, size: 19),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      for (final c in [
                        'Homestay',
                        'Ẩm thực',
                        'Trải nghiệm',
                        'Tất cả',
                      ])
                        Padding(
                          padding: const EdgeInsets.only(right: 7),
                          child: ChoiceChip(
                            label: Text(c),
                            selected: category == c,
                            onSelected: (_) => setState(() {
                              category = c;
                              if (c != 'Tất cả' && selected.category != c) {
                                selected = widget.store.offers.firstWhere(
                                  (o) => o.category == c,
                                );
                              }
                            }),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          right: 16,
          top: 172,
          child: IconButton.filledTonal(
            tooltip: 'Về vị trí mặc định',
            onPressed: () => transform.value = Matrix4.identity(),
            style: IconButton.styleFrom(backgroundColor: Colors.white),
            icon: const Icon(Icons.my_location, size: 20),
          ),
        ),
        Positioned(
          left: 14,
          right: 14,
          bottom: 14,
          child: SafeArea(
            top: false,
            child: AnimatedSize(
              duration: motionTime(context),
              alignment: Alignment.bottomCenter,
              child: Panel(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AnimatedSwitcher(
                          duration: motionTime(context),
                          child: Photo(
                            selected.image,
                            key: ValueKey(selected.id),
                            height: 112,
                            width: 96,
                            radius: 18,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Stars(selected),
                              const SizedBox(height: 5),
                              Text(
                                selected.name,
                                maxLines: 2,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                              Meta(
                                Icons.location_on_outlined,
                                selected.location,
                                size: 10,
                              ),
                              Wrap(
                                spacing: 4,
                                runSpacing: 4,
                                children: [
                                  Tag(selected.category),
                                  if (selected.highlights.isNotEmpty)
                                    Tag(selected.highlights.first),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${money(selected.price)} /${selected.unitLabel}',
                            style: const TextStyle(
                              color: green,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        FilledButton(
                          onPressed: () {
                            widget.store.select(selected);
                            go(context, 4);
                          },
                          child: const Text(
                            'Xem chi tiết ›',
                            style: TextStyle(fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Bản đồ minh họa · không dùng để chỉ đường',
                      style: TextStyle(color: gray, fontSize: 11),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _MapPainter extends CustomPainter {
  const _MapPainter();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFFE9EEDE),
    );
    final grid = Paint()
      ..color = const Color(0xFFCBDBBC)
      ..strokeWidth = .9
      ..style = PaintingStyle.stroke;
    for (int i = -5; i < 25; i++) {
      final y = i * size.height / 20;
      final path = Path()
        ..moveTo(-40, y)
        ..cubicTo(
          size.width * .25,
          y - 120,
          size.width * .75,
          y + 130,
          size.width + 40,
          y + 5,
        );
      canvas.drawPath(path, grid);
    }
    for (final center in [
      Offset(size.width * .08, size.height * .35),
      Offset(size.width * .92, size.height * .58),
    ]) {
      canvas.drawOval(
        Rect.fromCenter(
          center: center,
          width: size.width * .65,
          height: size.height * .3,
        ),
        Paint()..color = const Color(0xFFD2E0C7).withValues(alpha: .65),
      );
      for (int i = 0; i < 8; i++) {
        canvas.drawOval(
          Rect.fromCenter(
            center: center,
            width: 30 + i * 22.0,
            height: 40 + i * 25.0,
          ),
          grid,
        );
      }
    }
    final river = Path()
      ..moveTo(size.width * .8, -20)
      ..cubicTo(
        size.width * .25,
        size.height * .27,
        size.width * .95,
        size.height * .35,
        size.width * .4,
        size.height * .55,
      )
      ..cubicTo(
        size.width * .1,
        size.height * .7,
        size.width * .45,
        size.height * .82,
        size.width * .1,
        size.height + 20,
      );
    canvas.drawPath(
      river,
      Paint()
        ..color = const Color(0xFFB9D6CF)
        ..strokeWidth = 13
        ..style = PaintingStyle.stroke,
    );
    canvas.drawPath(
      river,
      Paint()
        ..color = const Color(0xFFD9EAE2)
        ..strokeWidth = 5
        ..style = PaintingStyle.stroke,
    );
    final road = Path()
      ..moveTo(-30, size.height * .27)
      ..cubicTo(
        size.width * .25,
        size.height * .29,
        size.width * .59,
        size.height * .31,
        size.width * .60,
        size.height * .49,
      )
      ..cubicTo(
        size.width * .65,
        size.height * .6,
        size.width * .70,
        size.height * .69,
        size.width * .81,
        size.height,
      );
    canvas.drawPath(
      road,
      Paint()
        ..color = Colors.white
        ..strokeWidth = 7
        ..style = PaintingStyle.stroke,
    );
    canvas.drawPath(
      road,
      Paint()
        ..color = const Color(0xFFF6D59A)
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
