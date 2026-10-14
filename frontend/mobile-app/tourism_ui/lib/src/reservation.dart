import 'package:flutter/material.dart';

import 'data.dart';
import 'widgets.dart';
import 'motion.dart';
import 'editorial.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key, required this.store});
  final TourismStore store;
  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  late DateTime month = DateTime(
    widget.store.checkIn.year,
    widget.store.checkIn.month,
  );
  bool choosingEnd = false;
  void day(DateTime value) {
    final s = widget.store;
    if (s.selected.unit != PriceUnit.night) {
      s.checkIn = value;
      s.checkOut = value.add(const Duration(days: 1));
    } else if (choosingEnd && value.isAfter(s.checkIn)) {
      s.checkOut = value;
      choosingEnd = false;
    } else {
      s.checkIn = value;
      s.checkOut = value.add(const Duration(days: 1));
      choosingEnd = true;
    }
    s.submitted = null;
    s.changed();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) {
      final s = widget.store, isRoom = s.selected.unit == PriceUnit.night;
      final days = DateTime(month.year, month.month + 1, 0).day,
          offset = month.weekday - 1;
      final maxGuests = isRoom ? (s.privateRoom ? 2 : 4) : s.selected.limit;
      return PageFrame(
        title: isRoom ? 'Đặt phòng' : 'Đặt trải nghiệm',
        bottom: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Chi phí dự kiến',
                      style: TextStyle(fontSize: 12, color: gray),
                    ),
                  ),
                  Text(
                    money(s.total),
                    style: const TextStyle(
                      fontSize: 20,
                      color: green,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
            PrimaryAction(
              label: 'Tiếp tục',
              onPressed: () {
                if (s.guests > maxGuests) {
                  message(context, 'Số khách vượt sức chứa đã chọn.');
                  return;
                }
                go(context, 7);
              },
            ),
          ],
        ),
        children: [
          const JourneySteps(current: 0),
          OfferSummary(store: s),
          const SizedBox(height: 16),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRoom ? 'Chọn ngày lưu trú' : 'Chọn ngày tham gia',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  isRoom
                      ? (choosingEnd
                            ? 'Tiếp theo, chọn ngày trả phòng.'
                            : 'Chọn ngày nhận phòng, sau đó chọn ngày trả.')
                      : 'Chọn ngày bạn muốn trải nghiệm.',
                  style: const TextStyle(
                    fontSize: 12,
                    color: gray,
                    height: 1.6,
                  ),
                ),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Tháng ${month.month}, ${month.year}',
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Tháng trước',
                      onPressed:
                          month.isAfter(DateTime(today().year, today().month))
                          ? () => setState(
                              () =>
                                  month = DateTime(month.year, month.month - 1),
                            )
                          : null,
                      icon: const Icon(
                        Icons.chevron_left,
                        size: 19,
                        color: gray,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Tháng sau',
                      onPressed: () => setState(
                        () => month = DateTime(month.year, month.month + 1),
                      ),
                      icon: const Icon(
                        Icons.chevron_right,
                        size: 19,
                        color: gray,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    for (final d in ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])
                      Expanded(
                        child: Text(
                          d,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: gray, fontSize: 12),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: ((days + offset) / 7).ceil() * 7,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 7,
                    mainAxisExtent: 48,
                    mainAxisSpacing: 4,
                  ),
                  itemBuilder: (context, index) {
                    final n = index - offset + 1;
                    if (n < 1 || n > days) return const SizedBox();
                    final value = DateTime(month.year, month.month, n),
                        disabled = value.isBefore(today());
                    final start = DateUtils.isSameDay(value, s.checkIn),
                        end = isRoom && DateUtils.isSameDay(value, s.checkOut);
                    final inRange = isRoom
                        ? !value.isBefore(s.checkIn) &&
                              !value.isAfter(s.checkOut)
                        : start;
                    return Semantics(
                      button: true,
                      selected: inRange,
                      enabled: !disabled,
                      label:
                          '${dateText(value)}${start
                              ? ', nhận phòng'
                              : end
                              ? ', trả phòng'
                              : ''}',
                      child: InkWell(
                        key: ValueKey('day-${dateText(value)}'),
                        borderRadius: BorderRadius.circular(30),
                        onTap: disabled ? null : () => day(value),
                        child: AnimatedContainer(
                          duration: motionTime(context, 180),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: inRange
                                ? green
                                : disabled
                                ? Colors.transparent
                                : mint,
                            borderRadius: inRange
                                ? BorderRadius.horizontal(
                                    left: Radius.circular(start ? 24 : 0),
                                    right: Radius.circular(
                                      end || !isRoom ? 24 : 0,
                                    ),
                                  )
                                : BorderRadius.circular(30),
                          ),
                          child: Text(
                            '$n',
                            style: TextStyle(
                              fontSize: 13,
                              color: inRange
                                  ? Colors.white
                                  : disabled
                                  ? const Color(0xFFBDC6CF)
                                  : ink,
                              fontWeight: inRange
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 14),
                const Divider(),
                Wrap(
                  spacing: 12,
                  runSpacing: 6,
                  children: [
                    _Legend(const Color(0xFF5EE1BB), 'Còn trống'),
                    _Legend(green, 'Đã chọn'),
                    _Legend(const Color(0xFFCBD5E1), 'Ngày đã qua'),
                  ],
                ),
                const SizedBox(height: 14),
                Text(
                  isRoom
                      ? '${dateText(s.checkIn)} → ${dateText(s.checkOut)} · ${s.nights} đêm'
                      : '${dateText(s.checkIn)} · 08:00 – 11:00',
                  style: const TextStyle(
                    color: green,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                if (choosingEnd)
                  const Padding(
                    padding: EdgeInsets.only(top: 6),
                    child: Text(
                      'Chọn ngày trả phòng sau ngày nhận.',
                      style: TextStyle(color: gray, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Panel(
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Số lượng khách',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        'Tối đa $maxGuests khách${isRoom ? '/phòng' : ''}',
                        style: const TextStyle(color: gray, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                StepperField(
                  value: s.guests,
                  max: maxGuests,
                  onChanged: (v) {
                    s.guests = v;
                    s.submitted = null;
                    s.changed();
                  },
                ),
              ],
            ),
          ),
          if (isRoom) ...[
            Section(
              'Chọn loại phòng',
              action: 'Xem chi tiết',
              onTap: () => showDialog<void>(
                context: context,
                builder: (d) => AlertDialog(
                  title: const Text('Loại phòng'),
                  content: const Text(
                    'Phòng cộng đồng: tối đa 4 khách.\n\nPhòng riêng: tối đa 2 khách, có ban công và view núi.\n\nThông tin phòng và khả dụng là dữ liệu demo.',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(d),
                      child: const Text('Đóng'),
                    ),
                  ],
                ),
              ),
            ),
            for (final private in [false, true])
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: TouchFeedback(
                  child: InkWell(
                    onTap: () {
                      s.privateRoom = private;
                      s.guests = s.guests.clamp(1, private ? 2 : 4);
                      s.submitted = null;
                      s.changed();
                    },
                    borderRadius: BorderRadius.circular(14),
                    child: AnimatedContainer(
                      duration: motionTime(context, 180),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: s.privateRoom == private
                            ? const Color(0xFFF6FCF8)
                            : Colors.white,
                        border: Border.all(
                          color: s.privateRoom == private ? green : line,
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Photo(
                            private ? 'private_room' : 'room',
                            height: 60,
                            width: 60,
                            radius: 10,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  private ? 'Phòng riêng' : 'Phòng cộng đồng',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  private
                                      ? '2 khách · View núi, ban công'
                                      : '2–4 khách · Phù hợp nhóm bạn',
                                  style: const TextStyle(
                                    color: gray,
                                    fontSize: 12,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '${money(s.selected.price + (private ? 200000 : 0))}/đêm',
                                  style: const TextStyle(
                                    color: green,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Icon(
                            s.privateRoom == private
                                ? Icons.radio_button_checked
                                : Icons.radio_button_off,
                            size: 19,
                            color: s.privateRoom == private ? green : gray,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ] else ...[
            const Section('Thông tin hoạt động'),
            Panel(
              child: Column(
                children: [
                  Meta(
                    Icons.people_outline,
                    'Tối đa ${s.selected.limit} người',
                  ),
                  Meta(
                    Icons.payments_outlined,
                    '${money(s.selected.price)} /${s.selected.unitLabel}',
                  ),
                  const Meta(
                    Icons.event_outlined,
                    'Lịch và sức chứa là dữ liệu minh họa.',
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          const Text(
            'Khả dụng minh họa · chưa giữ phòng hoặc tài nguyên thực tế.',
            style: TextStyle(color: gray, fontSize: 12),
          ),
        ],
      );
    },
  );
}

class _Legend extends StatelessWidget {
  const _Legend(this.color, this.text);
  final Color color;
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      CircleAvatar(radius: 3, backgroundColor: color),
      const SizedBox(width: 5),
      Text(text, style: const TextStyle(fontSize: 11, color: gray)),
    ],
  );
}

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.store});
  final TourismStore store;
  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final coupon = TextEditingController();
  bool busy = false;
  @override
  void dispose() {
    coupon.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    if (busy) return;
    final s = widget.store;
    if (!s.signedIn) {
      final accepted = await showDialog<bool>(
        context: context,
        builder: (d) => AlertDialog(
          title: const Text('Tài khoản khách'),
          content: const Text(
            'Tiếp tục bằng tài khoản minh họa để gửi yêu cầu đặt trong phiên demo.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(d, false),
              child: const Text('Để sau'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(d, true),
              child: const Text('Tiếp tục demo'),
            ),
          ],
        ),
      );
      if (accepted != true || !mounted) return;
      s.signedIn = true;
    }
    setState(() => busy = true);
    try {
      final trip = s.submit();
      if (!mounted) return;
      setState(() => busy = false);
      await showDialog<void>(
        context: context,
        builder: (d) => AlertDialog(
          icon: const Icon(Icons.check_circle_outline, color: green, size: 42),
          title: const Text('Đã gửi yêu cầu đặt'),
          content: Text(
            '${trip.code}\n\nYêu cầu đang chờ hộ dân xác nhận. Bản demo chưa phát sinh giao dịch hoặc chuyển tiền.',
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(d),
              child: const Text('Xem đơn đặt'),
            ),
          ],
        ),
      );
      if (mounted) Navigator.pushReplacementNamed(context, '/trips');
    } on StateError catch (e) {
      if (mounted) message(context, e.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) {
      final s = widget.store, isRoom = s.selected.unit == PriceUnit.night;
      return PageFrame(
        title: 'Thanh toán',
        bottom: PrimaryAction(
          label: busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt',
          onPressed: submit,
          busy: busy,
          icon: Icons.lock_outline_rounded,
        ),
        children: [
          const JourneySteps(current: 1),
          const HelpfulNote(
            'Kiểm tra một lần, an tâm cả chuyến',
            'Xác nhận thông tin bên dưới trước khi gửi yêu cầu đến hộ dân.',
            icon: Icons.fact_check_outlined,
          ),
          Section(
            isRoom ? 'Thông tin đặt phòng' : 'Thông tin đặt dịch vụ',
            action: 'Chỉnh sửa',
            onTap: () => go(context, 6),
          ),
          Panel(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Photo(s.selected.image, width: 86, height: 86, radius: 12),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        s.selected.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Meta(
                        Icons.location_on_outlined,
                        s.selected.location,
                        size: 10,
                      ),
                      Meta(
                        Icons.calendar_today_outlined,
                        '${dateText(s.checkIn)}${isRoom ? ' – ${dateText(s.checkOut)}' : ''}',
                        size: 10,
                      ),
                      Text(
                        '${isRoom ? '${s.nights} đêm · ' : ''}${s.guests} khách',
                        style: const TextStyle(color: gray, fontSize: 12),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isRoom
                            ? s.privateRoom
                                  ? 'Phòng riêng'
                                  : 'Phòng cộng đồng'
                            : s.selected.category,
                        style: const TextStyle(fontSize: 12),
                      ),
                      Text(
                        '${money(s.unitPrice)} /${s.selected.unitLabel}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Section('Thông tin khách hàng'),
          Panel(
            padding: const EdgeInsets.all(4),
            child: ListTile(
              leading: const CircleAvatar(
                radius: 20,
                backgroundColor: Color(0xFFF1F4F6),
                child: Icon(Icons.person, color: gray),
              ),
              title: Text(s.customerName, style: const TextStyle(fontSize: 13)),
              subtitle: Text(
                s.phone,
                style: const TextStyle(color: gray, fontSize: 12),
              ),
              trailing: const Icon(Icons.chevron_right, color: gray, size: 18),
              onTap: () => editContact(context, s),
            ),
          ),
          const Section('Mã giảm giá · Minh họa'),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: coupon,
                  decoration: const InputDecoration(hintText: 'NHAPMA'),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton(
                onPressed: () {
                  if (coupon.text.trim().toUpperCase() != 'NHAPMA') {
                    message(context, 'Mã minh họa: NHAPMA (giảm 10%).');
                    return;
                  }
                  s.coupon = true;
                  s.submitted = null;
                  s.changed();
                  message(context, 'Đã áp dụng mã minh họa.');
                },
                child: const Text('Áp dụng', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
          const Section('Phương thức thanh toán'),
          Panel(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _PayOption(
                  'Ví điện tử (MoMo, ZaloPay)',
                  const Color(0xFFA50064),
                  Icons.account_balance_wallet_outlined,
                  false,
                  'Chưa hỗ trợ trong MVP',
                ),
                const Divider(height: 1),
                _PayOption(
                  'Thẻ ngân hàng',
                  const Color(0xFF00ADEF),
                  Icons.credit_card,
                  false,
                  'Chưa hỗ trợ trong MVP',
                ),
                const Divider(height: 1),
                _PayOption(
                  'Thanh toán khi đến nơi',
                  const Color(0xFF059669),
                  Icons.payments_outlined,
                  true,
                  'Giao dịch trực tiếp với hộ',
                ),
              ],
            ),
          ),
          const Section('Chi tiết thanh toán'),
          Panel(
            child: Column(
              children: [
                _PriceRow(
                  'Tạm tính${isRoom ? ' (${s.nights} đêm)' : ''}',
                  money(s.subtotal),
                ),
                _PriceRow(
                  'Giảm giá minh họa',
                  '− ${money(s.discount)}',
                  discount: true,
                ),
                const _PriceRow('Phí nền tảng', '0đ'),
                const Divider(height: 26),
                _PriceRow('Tổng dự kiến', money(s.total), bold: true),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const Text(
            'Tiền do khách và hộ giao dịch trực tiếp. Gửi yêu cầu không thực hiện thanh toán hoặc giữ chỗ thật trong bản demo.',
            style: TextStyle(fontSize: 12, color: gray, height: 1.7),
          ),
        ],
      );
    },
  );
}

class _PayOption extends StatelessWidget {
  const _PayOption(
    this.title,
    this.color,
    this.icon,
    this.selected,
    this.subtitle,
  );
  final String title, subtitle;
  final Color color;
  final IconData icon;
  final bool selected;
  @override
  Widget build(BuildContext context) => ListTile(
    leading: Container(
      width: 34,
      height: 34,
      decoration: BoxDecoration(
        color: color.withValues(alpha: selected ? 1 : .6),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: Colors.white, size: 20),
    ),
    title: Text(
      title,
      style: TextStyle(fontSize: 13, color: selected ? ink : gray),
    ),
    subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: gray)),
    trailing: Icon(
      selected ? Icons.radio_button_checked : Icons.radio_button_off,
      color: selected ? green : line,
      size: 19,
    ),
  );
}

class _PriceRow extends StatelessWidget {
  const _PriceRow(
    this.title,
    this.price, {
    this.bold = false,
    this.discount = false,
  });
  final String title, price;
  final bool bold, discount;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: bold ? 13 : 11,
              color: bold ? ink : gray,
              fontWeight: bold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          price,
          style: TextStyle(
            fontSize: bold ? 18 : 12,
            color: discount || bold ? green : ink,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
          ),
        ),
      ],
    ),
  );
}
