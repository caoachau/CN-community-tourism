import 'package:flutter/material.dart';

import 'account.dart';
import 'data.dart';
import 'widgets.dart';
import 'motion.dart';
import 'editorial.dart';

class HouseholdScreen extends StatelessWidget {
  const HouseholdScreen({super.key, required this.store});
  final TourismStore store;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: ListenableBuilder(
        listenable: store,
        builder: (context, _) {
          final pending = store.ownTrips
              .where((t) => t.status == TripStatus.pending)
              .length;
          final confirmed = store.ownTrips
              .where(
                (t) =>
                    t.status == TripStatus.confirmed ||
                    t.status == TripStatus.completed,
              )
              .toList();
          final revenue = confirmed.fold(0, (n, t) => n + t.amount);
          final guests = confirmed.fold(0, (n, t) => n + t.guests);
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 30),
            children: [
              Row(
                children: [
                  const Photo('host', width: 44, height: 44, radius: 50),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Xin chào,',
                          style: TextStyle(color: gray, fontSize: 12),
                        ),
                        const SizedBox(height: 3),
                        const Text(
                          'Hộ gia đình Nhà của Pao',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const Meta(
                          Icons.location_on_outlined,
                          'Bản Tả Van, Sa Pa',
                          size: 10,
                        ),
                      ],
                    ),
                  ),
                  const Tag('Chủ hộ'),
                  IconButton(
                    tooltip: 'Cài đặt chủ hộ',
                    onPressed: () => appMenu(context, store),
                    icon: const Icon(Icons.settings_outlined, size: 20),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Reveal(
                child: ScenicCard(
                  image: 'pao_landscape',
                  title: 'Chăm chút ngôi nhà.\nĐón những niềm vui.',
                  caption: 'Không gian chủ hộ',
                  height: 235,
                  photoSpace: 24,
                  action: 'Quản lý dịch vụ của bạn',
                  onTap: () => services(context, store),
                ),
              ),
              const SizedBox(height: 20),
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => Navigator.pushNamed(context, '/host-trips'),
                child: HelpfulNote(
                  '$pending yêu cầu cần phản hồi',
                  'Xem và xác nhận để khách an tâm chuẩn bị chuyến đi.',
                  icon: Icons.pending_actions_rounded,
                ),
              ),
              const SizedBox(height: 18),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Quick(
                    Icons.home_outlined,
                    'Quản lý dịch vụ',
                    green,
                    () => services(context, store),
                  ),
                  _Quick(
                    Icons.calendar_month_outlined,
                    'Lịch đặt',
                    const Color(0xFFF97316),
                    () => calendar(context, store),
                  ),
                  _Quick(
                    Icons.chat_bubble_outline,
                    'Tin nhắn',
                    const Color(0xFF3B82F6),
                    () => go(context, 8),
                  ),
                  _Quick(
                    Icons.edit_outlined,
                    'Cập nhật thông tin',
                    green,
                    () => contactInfo(context),
                  ),
                ],
              ),

              const Section('Hôm nay ở nhà mình'),
              PairGrid(
                children: [
                  _Stat(
                    Icons.receipt_long_outlined,
                    const Color(0xFF3B82F6),
                    '$pending',
                    'Đơn đặt mới',
                    () => Navigator.pushNamed(context, '/host-trips'),
                  ),
                  _Stat(
                    Icons.groups_outlined,
                    const Color(0xFF10B981),
                    '$guests',
                    'Lượt khách đã xác nhận',
                    () => Navigator.pushNamed(context, '/host-trips'),
                  ),
                  _Stat(
                    Icons.payments_outlined,
                    const Color(0xFFF59E0B),
                    '${(revenue / 1000000).toStringAsFixed(1)} triệu',
                    'Giá trị đơn xác nhận',
                    () => finance(context, store),
                  ),
                  _Stat(
                    Icons.star_outline,
                    const Color(0xFFA855F7),
                    '4.9',
                    'Đánh giá minh họa',
                    () => message(
                      context,
                      'Điểm đánh giá đang dùng dữ liệu thiết kế mẫu.',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Panel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Tổng quan đơn đặt',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        Tag(
                          'Tháng ${today().month}/${today().year}',
                          fill: bg,
                          color: gray,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${(revenue / 1000000).toStringAsFixed(1)} triệu đồng',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Giá trị đơn xác nhận · dữ liệu demo',
                      style: TextStyle(color: gray, fontSize: 12),
                    ),
                    const SizedBox(height: 24),
                    Reveal(
                      child: const SizedBox(
                        height: 152,
                        width: double.infinity,
                        child: CustomPaint(painter: _RevenueChart()),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('01', style: TextStyle(color: gray, fontSize: 11)),
                        Text('07', style: TextStyle(color: gray, fontSize: 11)),
                        Text('14', style: TextStyle(color: gray, fontSize: 11)),
                        Text('21', style: TextStyle(color: gray, fontSize: 11)),
                        Text('28', style: TextStyle(color: gray, fontSize: 11)),
                      ],
                    ),
                  ],
                ),
              ),
              Section(
                'Đơn đặt sắp tới',
                action: 'Xem tất cả',
                onTap: () => Navigator.pushNamed(context, '/host-trips'),
              ),
              Panel(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Column(
                  children: [
                    for (final (i, t) in store.ownTrips.take(3).indexed) ...[
                      if (i > 0) const Divider(height: 1),
                      ListTile(
                        contentPadding: const EdgeInsets.symmetric(vertical: 5),
                        leading: Photo(
                          ['customer', 'guest2', 'guest3'][i],
                          height: 37,
                          width: 37,
                          radius: 40,
                        ),
                        title: Text(
                          t.customer,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Text(
                          '${dateText(t.start)} – ${dateText(t.end)}\n${t.guests} khách',
                          style: const TextStyle(
                            fontSize: 11,
                            color: gray,
                            height: 1.7,
                          ),
                        ),
                        trailing: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 92),
                          child: Tag(
                            t.status.label,
                            color: t.status == TripStatus.pending
                                ? const Color(0xFFCA8A04)
                                : green,
                            fill: t.status == TripStatus.pending
                                ? const Color(0xFFFFFBEB)
                                : mint,
                          ),
                        ),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => TripDetail(
                              store: store,
                              trip: t,
                              managing: true,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 18),
              OutlinedButton.icon(
                onPressed: () => Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/m2',
                  (_) => false,
                ),
                icon: const Icon(Icons.travel_explore, size: 19),
                label: const Text('Khám phá như khách du lịch'),
              ),
              const SizedBox(height: 12),
              const Text(
                'Giao diện quản lý minh họa. Chưa kết nối dữ liệu hộ dân thực tế.',
                style: TextStyle(fontSize: 12, color: gray),
              ),
            ],
          );
        },
      ),
    ),
  );
}

class _Stat extends StatelessWidget {
  const _Stat(this.icon, this.color, this.value, this.label, this.action);
  final IconData icon;
  final Color color;
  final String value, label;
  final VoidCallback action;
  @override
  Widget build(BuildContext context) => TouchFeedback(
    child: Panel(
      padding: const EdgeInsets.all(13),
      child: InkWell(
        onTap: action,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withValues(alpha: .07),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 23),
            ),
            const SizedBox(height: 10),
            Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  maxLines: 1,
                  style: const TextStyle(
                    fontSize: 23,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  label,
                  maxLines: 3,
                  style: const TextStyle(
                    color: gray,
                    fontSize: 11,
                    height: 1.6,
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

class _Quick extends StatelessWidget {
  const _Quick(this.icon, this.label, this.color, this.action);
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback action;
  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      onTap: action,
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: line),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 23),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, color: gray, height: 1.5),
          ),
        ],
      ),
    ),
  );
}

class _RevenueChart extends CustomPainter {
  const _RevenueChart();
  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = line
      ..strokeWidth = .7;
    for (int i = 0; i < 4; i++) {
      canvas.drawLine(
        Offset(0, size.height * i / 3),
        Offset(size.width, size.height * i / 3),
        grid,
      );
    }
    const values = [
      .12,
      .15,
      .08,
      .31,
      .25,
      .45,
      .22,
      .3,
      .64,
      .32,
      .18,
      .52,
      .38,
      .75,
      .48,
      .43,
      .29,
      .62,
      .54,
      .37,
      .49,
      .25,
      .31,
      .46,
      .23,
      .34,
      .32,
      .16,
    ];
    final step = size.width / values.length;
    for (int i = 0; i < values.length; i++) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(
            i * step + step * .25,
            size.height * (1 - values[i]),
            step * .42,
            size.height * values[i],
          ),
          const Radius.circular(2),
        ),
        Paint()..color = const Color(0xFF10B981),
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

Future<void> services(
  BuildContext context,
  TourismStore store,
) => showModalBottomSheet<void>(
  context: context,
  showDragHandle: true,
  isScrollControlled: true,
  builder: (sheet) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: ListenableBuilder(
        listenable: store,
        builder: (context, _) => Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dịch vụ của hộ',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 14),
            for (final o in store.offers.where((o) => o.household == 1))
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Photo(o.image, width: 50, height: 50, radius: 10),
                title: Text(
                  o.name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                subtitle: Text(
                  '${money(o.price)}/${o.unitLabel}',
                  style: const TextStyle(color: green, fontSize: 13),
                ),
                trailing: Switch.adaptive(
                  value: o.available,
                  onChanged: (v) {
                    o.available = v;
                    store.changed();
                  },
                ),
                onTap: () async {
                  final value = await priceDialog(context, o.price);
                  if (value != null) {
                    o.price = value;
                    store.changed();
                  }
                },
              ),
            const SizedBox(height: 12),
            const Text(
              'Chạm dịch vụ để cập nhật giá demo. Đơn đã tạo giữ nguyên giá.',
              style: TextStyle(color: gray, fontSize: 12, height: 1.6),
            ),
          ],
        ),
      ),
    ),
  ),
);
Future<int?> priceDialog(BuildContext context, int initial) async {
  final input = TextEditingController(text: '$initial'),
      form = GlobalKey<FormState>();
  final result = await showDialog<int>(
    context: context,
    builder: (d) => AlertDialog(
      title: const Text('Đơn giá VND'),
      content: Form(
        key: form,
        child: TextFormField(
          controller: input,
          keyboardType: TextInputType.number,
          validator: (v) => (int.tryParse(v ?? '') ?? 0) <= 0
              ? 'Nhập số tiền lớn hơn 0'
              : null,
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
              Navigator.pop(d, int.parse(input.text));
            }
          },
          child: const Text('Lưu'),
        ),
      ],
    ),
  );
  await Future<void>.delayed(const Duration(milliseconds: 300));
  input.dispose();
  return result;
}

Future<void> calendar(
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
          'Lịch đặt của hộ',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        for (final t in store.ownTrips)
          ListTile(
            leading: const Icon(Icons.event_outlined, color: green),
            title: Text(t.customer, style: const TextStyle(fontSize: 13)),
            subtitle: Text(
              '${dateText(t.start)} → ${dateText(t.end)}\n${t.room} · ${t.guests} khách',
              style: const TextStyle(color: gray, fontSize: 13),
            ),
            trailing: Tag(t.status.label),
          ),
      ],
    ),
  ),
);
Future<void> finance(
  BuildContext context,
  TourismStore store,
) => showDialog<void>(
  context: context,
  builder: (d) => AlertDialog(
    title: const Text('Giá trị đơn đặt'),
    content: Text(
      'Đơn xác nhận: ${money(store.ownTrips.where((t) => t.status == TripStatus.confirmed || t.status == TripStatus.completed).fold(0, (n, t) => n + t.amount))}\n\nSố tiền này là giá trị đơn demo, chưa phải tiền thực thu. Bản demo chưa ghi nhận hoặc chuyển tiền.',
    ),
    actions: [
      TextButton(onPressed: () => Navigator.pop(d), child: const Text('Đóng')),
    ],
  ),
);
