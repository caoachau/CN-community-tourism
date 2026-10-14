import 'package:flutter/material.dart';

import 'data.dart';
import 'widgets.dart';
import 'motion.dart';
import 'editorial.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.store});
  final TourismStore store;
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final input = TextEditingController(), scroll = ScrollController();
  @override
  void dispose() {
    input.dispose();
    scroll.dispose();
    super.dispose();
  }

  void send() {
    widget.store.send(input.text);
    input.clear();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scroll.hasClients) {
        scroll.animateTo(
          scroll.position.maxScrollExtent,
          duration: motionTime(context, 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(
          children: [
            const Photo('host', height: 34, width: 34, radius: 40),
            const SizedBox(width: 9),
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Vàng Thị Pao',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '● Tin nhắn minh họa',
                    style: TextStyle(fontSize: 11, color: green),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Gọi chủ hộ',
            onPressed: () => contactInfo(context),
            icon: const Icon(Icons.call_outlined, size: 20),
          ),
          IconButton(
            tooltip: 'Tùy chọn hội thoại',
            onPressed: () => message(
              context,
              'Hội thoại lưu trong phiên demo, chưa gửi đến chủ hộ.',
            ),
            icon: const Icon(Icons.more_vert, size: 20),
          ),
        ],
      ),
      body: ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 25),
        children: [
          const Padding(
            padding: EdgeInsets.only(bottom: 20),
            child: Center(child: Tag('Cuộc trò chuyện của bạn · Demo')),
          ),
          for (final m in widget.store.messages)
            Reveal(key: ObjectKey(m), child: _MessageBubble(m)),
          Padding(
            padding: const EdgeInsets.only(left: 42, top: 12),
            child: Panel(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Photo('pao', width: 66, height: 66, radius: 9),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Homestay Nhà của Pao',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              '${dateText(widget.store.checkIn)} – ${dateText(widget.store.checkOut)}',
                              style: const TextStyle(color: gray, fontSize: 12),
                            ),
                            Text(
                              '${widget.store.guests} khách · ${widget.store.nights} đêm',
                              style: const TextStyle(color: gray, fontSize: 12),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              money(widget.store.trips.first.amount),
                              style: const TextStyle(
                                color: green,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Tag('● Yêu cầu đặt minh họa'),
                  const Divider(),
                  SizedBox(
                    width: double.infinity,
                    child: TextButton(
                      onPressed: () => Navigator.pushNamed(context, '/trips'),
                      child: const Text(
                        'Xem chi tiết ›',
                        style: TextStyle(fontSize: 14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final q in [
                    'Còn phòng không ạ?',
                    'Có bữa tối không?',
                    'Địa chỉ như thế nào?',
                  ])
                    Padding(
                      padding: const EdgeInsets.only(right: 7),
                      child: ActionChip(
                        label: Text(q, style: const TextStyle(fontSize: 12)),
                        onPressed: () {
                          input.text = q;
                          send();
                        },
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                IconButton(
                  tooltip: 'Gửi ảnh minh họa',
                  onPressed: () =>
                      widget.store.send('[Ảnh phong cảnh Sa Pa · minh họa]'),
                  icon: const Icon(Icons.image_outlined, color: gray),
                ),
                Expanded(
                  child: TextField(
                    controller: input,
                    onSubmitted: (_) => send(),
                    decoration: const InputDecoration(
                      hintText: 'Nhập tin nhắn…',
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 12,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  tooltip: 'Gửi tin nhắn demo',
                  onPressed: send,
                  icon: const Icon(Icons.send_rounded, size: 19),
                ),
              ],
            ),
            const SizedBox(height: 9),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => contactInfo(context),
                    icon: const Icon(Icons.call_outlined, size: 17),
                    label: const Text(
                      'Gọi điện',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      widget.store.select(widget.store.offers.first);
                      go(context, 6);
                    },
                    icon: const Icon(Icons.calendar_month_outlined, size: 17),
                    label: const Text(
                      'Đặt ngay',
                      style: TextStyle(fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble(this.message);
  final ChatMessage message;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: message.mine
          ? MainAxisAlignment.end
          : MainAxisAlignment.start,
      children: [
        if (!message.mine) ...[
          const Photo('host', width: 26, height: 26, radius: 30),
          const SizedBox(width: 10),
        ],
        Flexible(
          child: Padding(
            padding: EdgeInsets.only(
              left: message.mine ? 52 : 0,
              right: message.mine ? 0 : 42,
            ),
            child: Column(
              crossAxisAlignment: message.mine
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(
                    color: message.mine ? green : Colors.white,
                    border: Border.all(color: message.mine ? green : line),
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(message.mine ? 16 : 4),
                      topRight: Radius.circular(message.mine ? 4 : 16),
                      bottomLeft: const Radius.circular(16),
                      bottomRight: const Radius.circular(16),
                    ),
                  ),
                  child: Text(
                    message.text,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.8,
                      color: message.mine ? Colors.white : ink,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${message.time}${message.mine ? ' ✓' : ''}',
                  style: const TextStyle(color: gray, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

Future<void> contactInfo(BuildContext context) => showDialog<void>(
  context: context,
  builder: (d) => AlertDialog(
    title: const Text('Liên hệ chủ hộ'),
    content: const Text(
      'Hồ sơ và hội thoại đang dùng dữ liệu minh họa. Bản thật sẽ hiển thị số điện thoại và liên kết Zalo do hộ cung cấp.',
    ),
    actions: [
      TextButton(onPressed: () => Navigator.pop(d), child: const Text('Đóng')),
    ],
  ),
);

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.store});
  final TourismStore store;
  @override
  Widget build(BuildContext context) => Scaffold(
    bottomNavigationBar: const CustomerNav(selected: 4),
    body: SafeArea(
      bottom: false,
      child: ListenableBuilder(
        listenable: store,
        builder: (context, _) {
          final upcoming = store.customerTrips
                  .where(
                    (t) =>
                        t.status == TripStatus.pending ||
                        t.status == TripStatus.confirmed,
                  )
                  .toList(),
              completed = store.customerTrips
                  .where((t) => t.status == TripStatus.completed)
                  .toList();
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 25),
            children: [
              const Eyebrow('Nhật ký hành trình'),
              const SizedBox(height: 9),
              Text(
                'Mang những điều\nđẹp đẽ trở về.',
                style: editorial.copyWith(fontSize: 32),
              ),
              const SizedBox(height: 22),
              Reveal(
                child: ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(26),
                    topRight: Radius.circular(80),
                    bottomLeft: Radius.circular(26),
                    bottomRight: Radius.circular(26),
                  ),
                  child: const Photo(
                    'valley',
                    height: 160,
                    width: double.infinity,
                    label: 'Kỷ niệm thung lũng Sa Pa',
                  ),
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  const Photo('customer', height: 58, width: 58, radius: 60),
                  const SizedBox(width: 13),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          store.customerName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 4),
                        TextButton(
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.zero,
                            alignment: Alignment.centerLeft,
                          ),
                          onPressed: () => editContact(context, store),
                          child: const Text(
                            'Chỉnh sửa hồ sơ ›',
                            style: TextStyle(color: gray, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Cài đặt',
                    onPressed: () => appMenu(context, store),
                    icon: const Icon(Icons.settings_outlined, size: 21),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Panel(
                child: Row(
                  children: [
                    _ProfileStat('${store.customerTrips.length}', 'Chuyến đi'),
                    const SizedBox(height: 32, child: VerticalDivider()),
                    _ProfileStat(
                      '${store.trips.where((t) => t.stars != null).length}',
                      'Đánh giá',
                    ),
                    const SizedBox(height: 32, child: VerticalDivider()),
                    _ProfileStat('${store.likes.length}', 'Địa điểm yêu thích'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Panel(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Column(
                  children: [
                    _AccountRow(
                      Icons.favorite,
                      'Địa điểm yêu thích',
                      const Color(0xFFFF557F),
                      () => Navigator.pushNamed(context, '/favorites'),
                    ),
                    const Divider(height: 1),
                    _AccountRow(
                      Icons.history,
                      'Lịch sử đặt dịch vụ',
                      const Color(0xFF0EA5E9),
                      () => Navigator.pushNamed(context, '/trips'),
                    ),
                    const Divider(height: 1),
                    _AccountRow(
                      Icons.rate_review_outlined,
                      'Đánh giá của tôi',
                      const Color(0xFFFF557F),
                      () => reviews(context, store),
                    ),
                    const Divider(height: 1),
                    _AccountRow(
                      Icons.local_offer_outlined,
                      'Mã giảm giá',
                      const Color(0xFF10B981),
                      () => message(
                        context,
                        'Mã minh họa NHAPMA giảm 10% ở màn thanh toán.',
                      ),
                    ),
                    const Divider(height: 1),
                    _AccountRow(
                      Icons.settings_outlined,
                      'Cài đặt tài khoản',
                      gray,
                      () => appMenu(context, store),
                    ),
                  ],
                ),
              ),
              Section(
                'Chuyến đi sắp tới',
                action: 'Xem tất cả',
                onTap: () => Navigator.pushNamed(context, '/trips'),
              ),
              if (upcoming.isEmpty)
                const Panel(
                  child: Text(
                    'Chưa có chuyến đi sắp tới.',
                    style: TextStyle(color: gray),
                  ),
                ),
              for (final t in upcoming.take(2))
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TripCard(trip: t, store: store),
                ),
              Section(
                'Chuyến đi đã hoàn thành',
                action: 'Xem tất cả',
                onTap: () => Navigator.pushNamed(context, '/trips'),
              ),
              for (final t in completed)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: TripCard(trip: t, store: store),
                ),
              const SizedBox(height: 16),
              const Text(
                'Tài khoản và dữ liệu minh họa · đặt lại khi mở ứng dụng.',
                style: TextStyle(color: gray, fontSize: 12),
              ),
            ],
          );
        },
      ),
    ),
  );
}

class _ProfileStat extends StatelessWidget {
  const _ProfileStat(this.value, this.label);
  final String value, label;
  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(color: gray, fontSize: 11),
        ),
      ],
    ),
  );
}

class _AccountRow extends StatelessWidget {
  const _AccountRow(this.icon, this.title, this.color, this.action);
  final IconData icon;
  final String title;
  final Color color;
  final VoidCallback action;
  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: CircleAvatar(
      radius: 16,
      backgroundColor: color.withValues(alpha: .07),
      child: Icon(icon, color: color, size: 17),
    ),
    title: Text(title, style: const TextStyle(fontSize: 14)),
    trailing: const Icon(Icons.chevron_right, size: 18, color: gray),
    onTap: action,
  );
}

Future<void> appMenu(BuildContext context, TourismStore store) =>
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(18),
          children: [
            const Text(
              'Cài đặt & bản demo',
              style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.travel_explore),
              title: const Text('Giao diện khách'),
              onTap: () {
                Navigator.pop(sheet);
                Navigator.pushNamedAndRemoveUntil(context, '/m2', (_) => false);
              },
            ),
            ListTile(
              leading: const Icon(Icons.home_work_outlined),
              title: const Text('Giao diện chủ hộ · Demo'),
              onTap: () {
                Navigator.pop(sheet);
                go(context, 10);
              },
            ),
            ListTile(
              leading: const Icon(Icons.grid_view),
              title: const Text('Xem 10 màn hình Stitch'),
              onTap: () {
                Navigator.pop(sheet);
                Navigator.pushNamed(context, '/screens');
              },
            ),
            ListTile(
              leading: const Icon(Icons.person_outline),
              title: const Text('Thông tin liên hệ'),
              onTap: () {
                Navigator.pop(sheet);
                editContact(context, store);
              },
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Bản demo giao diện theo thiết kế m1–m10. Dữ liệu chỉ lưu trong phiên. Chưa phát sinh tài khoản, tin nhắn, đặt chỗ hoặc thanh toán thực tế.',
                style: TextStyle(color: gray, fontSize: 13, height: 1.7),
              ),
            ),
          ],
        ),
      ),
    );

class TripCard extends StatelessWidget {
  const TripCard({
    super.key,
    required this.trip,
    required this.store,
    this.managing = false,
  });
  final Trip trip;
  final TourismStore store;
  final bool managing;
  @override
  Widget build(BuildContext context) => Panel(
    padding: const EdgeInsets.all(12),
    child: Column(
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Photo(trip.offer.image, width: 66, height: 66, radius: 11),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    managing ? trip.customer : trip.offer.name,
                    maxLines: 2,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${dateText(trip.start)} – ${dateText(trip.end)}',
                    style: const TextStyle(color: gray, fontSize: 12),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${trip.guests} khách',
                    style: const TextStyle(color: gray, fontSize: 12),
                  ),
                  const SizedBox(height: 7),
                  Tag(
                    trip.status.label,
                    color: trip.status == TripStatus.pending
                        ? const Color(0xFFB77915)
                        : green,
                    fill: trip.status == TripStatus.pending
                        ? const Color(0xFFFFF8E5)
                        : mint,
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
              child: OutlinedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => TripDetail(
                      store: store,
                      trip: trip,
                      managing: managing,
                    ),
                  ),
                ),
                child: const Text(
                  'Xem chi tiết',
                  style: TextStyle(fontSize: 12),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton(
                onPressed: () => go(context, 8),
                child: Text(
                  managing ? 'Liên hệ khách' : 'Liên hệ chủ nhà',
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            ),
          ],
        ),
        if (trip.status == TripStatus.completed &&
            trip.stars == null &&
            !managing)
          TextButton.icon(
            onPressed: () => review(context, store, trip),
            icon: const Icon(Icons.star_outline, size: 18),
            label: const Text('Đánh giá ngay', style: TextStyle(fontSize: 13)),
          ),
      ],
    ),
  );
}

class TripsScreen extends StatelessWidget {
  const TripsScreen({super.key, required this.store, this.managing = false});
  final TourismStore store;
  final bool managing;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: store,
    builder: (context, _) => PageFrame(
      title: managing ? 'Đơn đặt của hộ' : 'Đặt chỗ của tôi',
      children: [
        const Text(
          'Lịch và trạng thái yêu cầu đặt',
          style: TextStyle(fontSize: 13, color: gray),
        ),
        const SizedBox(height: 16),
        for (final t in managing ? store.ownTrips : store.customerTrips)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: TripCard(trip: t, store: store, managing: managing),
          ),
      ],
    ),
  );
}

class TripDetail extends StatelessWidget {
  const TripDetail({
    super.key,
    required this.store,
    required this.trip,
    this.managing = false,
  });
  final TourismStore store;
  final Trip trip;
  final bool managing;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: store,
    builder: (context, _) => PageFrame(
      title: trip.code,
      children: [
        Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Tag(trip.status.label),
              const SizedBox(height: 14),
              Text(
                trip.offer.name,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Meta(Icons.person_outline, trip.customer),
              Meta(
                Icons.calendar_month_outlined,
                '${dateText(trip.start)} → ${dateText(trip.end)}',
              ),
              Meta(Icons.people_outline, '${trip.guests} khách · ${trip.room}'),
              const SizedBox(height: 14),
              Text(
                money(trip.amount),
                style: const TextStyle(
                  color: green,
                  fontWeight: FontWeight.bold,
                  fontSize: 24,
                ),
              ),
              if (trip.reason.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 14),
                  child: Text(trip.reason, style: const TextStyle(color: gray)),
                ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        const Text(
          'Đây là đơn demo. Trạng thái và số tiền chỉ lưu trong phiên, chưa tạo giao dịch thực tế.',
          style: TextStyle(color: gray, fontSize: 13, height: 1.7),
        ),
        if (managing && trip.status == TripStatus.pending) ...[
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () {
                trip.status = TripStatus.confirmed;
                store.notices.insert(0, '${trip.code} đã được hộ xác nhận.');
                store.changed();
              },
              child: const Text('Xác nhận đơn · Demo'),
            ),
          ),
        ],
        if ((trip.status == TripStatus.pending ||
                trip.status == TripStatus.confirmed) &&
            DateTime.now().isBefore(trip.start))
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: OutlinedButton(
              onPressed: () async {
                final reason = await cancelReason(context);
                if (reason == null) return;
                trip.status = TripStatus.cancelled;
                trip.reason = reason;
                store.changed();
              },
              child: const Text('Hủy toàn đơn · Demo'),
            ),
          ),
        if (trip.status == TripStatus.completed && !managing)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: trip.stars == null
                ? FilledButton(
                    onPressed: () => review(context, store, trip),
                    child: const Text('Viết đánh giá'),
                  )
                : Panel(child: Text('${'★' * trip.stars!}\n${trip.review}')),
          ),
      ],
    ),
  );
}

Future<String?> cancelReason(BuildContext context) async {
  final text = TextEditingController(), form = GlobalKey<FormState>();
  final result = await showDialog<String>(
    context: context,
    builder: (d) => AlertDialog(
      title: const Text('Lý do hủy đơn'),
      content: Form(
        key: form,
        child: TextFormField(
          controller: text,
          maxLines: 3,
          validator: (v) =>
              v == null || v.trim().isEmpty ? 'Nhập lý do hủy' : null,
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(d),
          child: const Text('Đóng'),
        ),
        FilledButton(
          onPressed: () {
            if (form.currentState!.validate()) {
              Navigator.pop(d, text.text.trim());
            }
          },
          child: const Text('Hủy đơn'),
        ),
      ],
    ),
  );
  await Future<void>.delayed(const Duration(milliseconds: 300));
  text.dispose();
  return result;
}

Future<void> review(BuildContext context, TourismStore store, Trip trip) async {
  int stars = 5;
  final text = TextEditingController();
  await showDialog<void>(
    context: context,
    builder: (d) => StatefulBuilder(
      builder: (context, update) => AlertDialog(
        title: const Text('Đánh giá chuyến đi'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (int i = 1; i <= 5; i++)
                  Expanded(
                    child: IconButton(
                      tooltip: '$i sao',
                      padding: EdgeInsets.zero,
                      onPressed: () => update(() => stars = i),
                      icon: Icon(
                        i <= stars ? Icons.star : Icons.star_border,
                        color: const Color(0xFFF7B327),
                      ),
                    ),
                  ),
              ],
            ),
            TextField(
              controller: text,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Chia sẻ trải nghiệm của bạn',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(d),
            child: const Text('Đóng'),
          ),
          FilledButton(
            onPressed: () {
              if (text.text.trim().isEmpty) return;
              trip.stars = stars;
              trip.review = text.text.trim();
              store.changed();
              Navigator.pop(d);
            },
            child: const Text('Lưu đánh giá'),
          ),
        ],
      ),
    ),
  );
  await Future<void>.delayed(const Duration(milliseconds: 300));
  text.dispose();
}

Future<void> reviews(
  BuildContext context,
  TourismStore store,
) => showModalBottomSheet<void>(
  context: context,
  showDragHandle: true,
  builder: (_) => SafeArea(
    child: ListView(
      shrinkWrap: true,
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Đánh giá của tôi',
          style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        if (!store.customerTrips.any((t) => t.stars != null))
          const Text(
            'Bạn chưa có đánh giá. Có thể đánh giá chuyến đi đã hoàn thành.',
            style: TextStyle(color: gray),
          ),
        for (final t in store.customerTrips.where((t) => t.stars != null))
          ListTile(
            title: Text(t.offer.name),
            subtitle: Text('${'★' * t.stars!}\n${t.review}'),
          ),
      ],
    ),
  ),
);

class FavoritesScreen extends StatelessWidget {
  const FavoritesScreen({super.key, required this.store});
  final TourismStore store;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: store,
    builder: (context, _) => PageFrame(
      title: 'Địa điểm yêu thích',
      children: [
        if (store.likes.isEmpty)
          const Panel(
            child: Text(
              'Chạm biểu tượng trái tim để lưu dịch vụ bạn yêu thích.',
            ),
          ),
        for (final o in store.offers.where((o) => store.likes.contains(o.id)))
          Padding(
            padding: const EdgeInsets.only(bottom: 18),
            child: OfferTile(store: store, offer: o, large: true),
          ),
      ],
    ),
  );
}
