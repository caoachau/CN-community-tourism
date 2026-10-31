import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

import '../data.dart' show money;
import 'api.dart';
import 'common.dart';
import 'calendar.dart';

const bookingStates = {
  'PENDING': 'Chờ hộ xác nhận',
  'CANCEL_REQUESTED': 'Chờ xử lý hủy',
  'CONFIRMED': 'Đã xác nhận',
  'REJECTED': 'Hộ từ chối',
  'EXPIRED': 'Hết hạn giữ chỗ',
  'CANCELLED': 'Đã hủy',
  'COMPLETED': 'Đã hoàn thành',
  'NO_SHOW': 'Khách vắng mặt',
  'INTERRUPTED': 'Dừng phục vụ',
};
const entryLabels = {
  'RECEIPT': 'Thu tiền',
  'REFUND_AGREEMENT': 'Thỏa thuận hoàn',
  'REFUND': 'Thực hoàn tiền',
  'REFUND_ADJUSTMENT': 'Điều chỉnh khoản hoàn',
};
String bookingKey() => List.generate(
  24,
  (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
).join();
String bookingNow() => DateTime.now().toUtc().toIso8601String().replaceFirst(
  RegExp(r'\.\d+Z$'),
  'Z',
);

class _BookingAccess extends StatelessWidget {
  const _BookingAccess({
    required this.api,
    required this.epoch,
    required this.page,
    this.host = false,
  });
  final TourismApi api;
  final int epoch;
  final bool host;
  final Widget Function() page;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: api,
    builder: (context, _) {
      if (!api.signedIn || api.epoch != epoch || (host && !api.isHousehold)) {
        return Scaffold(
          appBar: AppBar(title: const Text('Đặt chỗ')),
          body: const EmptyPanel(
            'Phiên đã thay đổi. Đăng nhập và mở lại màn hình để tiếp tục.',
          ),
        );
      }
      return page();
    },
  );
}

Future<void> selectBookingItem(
  BuildContext context,
  TourismApi api,
  String kind,
  Json data,
) async {
  if (kind == 'rooms') {
    final next = DateTime.now().toUtc().add(const Duration(hours: 7, days: 1));
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: api,
          title: 'Thêm phòng vào giỏ',
          action: 'Thêm phòng',
          description: 'Mỗi phòng là một hạng mục. Bạn có thể thêm phòng và dịch vụ khác của cùng hộ trước khi giữ chỗ.',
          fields: [
            const FieldSpec(
              'checkInDate',
              'Ngày nhận phòng',
              required: true,
              pattern: r'^\d{4}-\d{2}-\d{2}$',
              hint: 'Năm-tháng-ngày',
            ),
            const FieldSpec(
              'checkOutDate',
              'Ngày trả phòng',
              required: true,
              pattern: r'^\d{4}-\d{2}-\d{2}$',
            ),
            FieldSpec(
              'participants',
              'Số khách ở phòng',
              kind: InputKind.integer,
              required: true,
              min: 1,
              max: (data['maxGuests'] as num?) ?? 1000,
            ),
          ],
          initial: {
            'checkInDate': calendarDay(next),
            'checkOutDate': calendarDay(next.add(const Duration(days: 1))),
            'participants': 1,
          },
          save: (input) async {
            final payload = <String, dynamic>{
              'kind': 'ROOM',
              'roomId': data['id'],
              ...input,
            };
            await api.request(
              'POST',
              '/bookings/quote',
              body: {
                'householdId': data['householdId'],
                'items': [payload],
              },
            );
            api.addBookingItem(
              data['householdId'].toString(),
              data['title'].toString(),
              payload,
            );
            return {};
          },
        ),
      ),
    );
    if (result != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'Đã thêm phòng. Bạn có thể chọn thêm hoặc mở giỏ.',
          ),
          action: SnackBarAction(
            label: 'Xem giỏ',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => BookingCheckoutPage(api: api)),
            ),
          ),
        ),
      );
    }
  } else {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => _ServiceSelection(api: api, data: data),
      ),
    );
  }
}

class _ServiceSelection extends StatefulWidget {
  const _ServiceSelection({required this.api, required this.data});
  final TourismApi api;
  final Json data;
  @override
  State<_ServiceSelection> createState() => _ServiceSelectionState();
}

class _ServiceSelectionState extends State<_ServiceSelection> {
  late final epoch = widget.api.epoch;
  Json? result;
  Future<void> find() async {
    final next = DateTime.now().toUtc().add(const Duration(hours: 7, days: 1));
    final value = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: 'Chọn ngày trải nghiệm',
          action: 'Tìm khung giờ',
          fields: const [
            FieldSpec(
              'from',
              'Từ ngày',
              required: true,
              pattern: r'^\d{4}-\d{2}-\d{2}$',
            ),
            FieldSpec(
              'to',
              'Đến ngày',
              required: true,
              pattern: r'^\d{4}-\d{2}-\d{2}$',
            ),
            FieldSpec(
              'participants',
              'Số người tham gia',
              kind: InputKind.integer,
              required: true,
              min: 1,
              max: 1000,
            ),
            FieldSpec(
              'units',
              'Số đơn vị thuê',
              kind: InputKind.integer,
              required: true,
              min: 1,
              max: 100000,
              hint: 'Chỉ dùng cho phương thức theo đơn vị; các phương thức khác chọn 1.',
            ),
          ],
          initial: {
            'from': calendarDay(next),
            'to': calendarDay(next.add(const Duration(days: 30))),
            'participants': 1,
            'units': 1,
          },
          save: (input) async {
            final response = await widget.api.request(
              'GET',
              '/public/services/${widget.data['id']}/slots',
              authenticated: false,
              query: {
                'from': '${input['from']}T00:00:00+07:00',
                'to': '${input['to']}T23:59:59+07:00',
                'participants': input['participants'],
                'units': input['units'],
                'pageSize': 100,
              },
            );
            return {
              ...response,
              'participants': input['participants'],
              'units': input['units'],
            };
          },
        ),
      ),
    );
    if (value != null && mounted) setState(() => result = value);
  }

  Future<void> add(Json slot, Json offer) async {
    final addons = records(offer['addons']);
    final value = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: 'Chọn ${offer['name']}',
          action: 'Thêm dịch vụ',
          description:
              '${calendarTime(slot['startsAt'])} → ${calendarTime(slot['endsAt'])}\n${object(offer['terms'])['scopeDescription'] ?? ''}',
          fields: [
            FieldSpec(
              'participants',
              'Số người tham gia',
              kind: InputKind.integer,
              required: true,
              min: (offer['minParticipants'] as num?) ?? 1,
              max: (offer['maxParticipants'] as num?) ?? 1000,
            ),
            if (offer['pricingType'] == 'PER_UNIT')
              FieldSpec(
                'units',
                'Số đơn vị thuê',
                kind: InputKind.integer,
                required: true,
                min: 1,
                max: (offer['maxUnits'] as num?) ?? 100000,
              ),
            for (final addon in addons)
              FieldSpec(
                'extras.${addon['key']}',
                '${addon['name']} (${money(addon['unitPriceVnd'] as int)})',
                kind: InputKind.integer,
                min: 0,
                max: (addon['maxQuantity'] as num?) ?? 1,
                required: true,
              ),
          ],
          initial: {
            'participants': result?['participants'] ?? 1,
            'units': result?['units'] ?? 1,
            'extras': {for (final addon in addons) addon['key']: 0},
          },
          save: (input) async {
            final payload = <String, dynamic>{
              'kind': 'SERVICE',
              'slotId': slot['id'],
              'offerId': offer['id'],
              'participants': input['participants'],
              'units': offer['pricingType'] == 'PER_UNIT' ? input['units'] : 1,
              'addons': [
                for (final addon in addons)
                  if ((object(input['extras'])[addon['key']] as num? ?? 0) > 0)
                    {
                      'key': addon['key'],
                      'quantity': object(input['extras'])[addon['key']],
                    },
              ],
            };
            await widget.api.request(
              'POST',
              '/bookings/quote',
              body: {
                'householdId': widget.data['householdId'],
                'items': [payload],
              },
            );
            widget.api.addBookingItem(
              widget.data['householdId'].toString(),
              '${widget.data['title']} · ${offer['name']}',
              payload,
            );
            return {};
          },
        ),
      ),
    );
    if (value != null && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đã thêm dịch vụ vào giỏ.')));
    }
  }

  @override
  Widget build(BuildContext context) => _BookingAccess(
    api: widget.api,
    epoch: epoch,
    page: () => Scaffold(
      appBar: AppBar(
        title: const Text('Chọn dịch vụ'),
        actions: [
          IconButton(
            tooltip: 'Mở giỏ đặt chỗ',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BookingCheckoutPage(api: widget.api),
              ),
            ),
            icon: const Icon(Icons.shopping_bag_outlined),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            widget.data['title'].toString(),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: find,
            icon: const Icon(Icons.search),
            label: const Text('Tìm khung giờ'),
          ),
          if (result != null && records(result!['items']).isEmpty)
            const EmptyPanel('Không có khung giờ phù hợp trong khoảng này.'),
          if (result != null)
            for (final slot in records(result!['items']))
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${calendarTime(slot['startsAt'])} → ${calendarTime(slot['endsAt'])}',
                      ),
                      for (final current in records(slot['offers']))
                        for (final offer in records(
                          widget.data['offers'],
                        ).where((o) => o['id'] == current['offerId']))
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              '${offer['name']} · ${money(current['unitPriceVnd'] as int)} / ${offer['unitLabel']}',
                            ),
                            subtitle: Text(
                              'Còn ${current['remainingCapacity']} chỗ',
                            ),
                            trailing: TextButton(
                              onPressed: current['available'] == true
                                  ? () => add(slot, offer)
                                  : null,
                              child: const Text('Chọn'),
                            ),
                          ),
                    ],
                  ),
                ),
              ),
          if (result != null && (result!['total'] as int) > 100)
            const Notice(
              'Có hơn 100 khung giờ. Thu hẹp khoảng ngày để xem đầy đủ.',
            ),
        ],
      ),
    ),
  );
}

class BookingCheckoutPage extends StatefulWidget {
  const BookingCheckoutPage({super.key, required this.api});
  final TourismApi api;
  @override
  State<BookingCheckoutPage> createState() => _BookingCheckoutPageState();
}

class _BookingCheckoutPageState extends State<BookingCheckoutPage> {
  late final epoch = widget.api.epoch;
  late int revision = widget.api.bookingCartRevision;
  final form = GlobalKey<FormState>(),
      name = TextEditingController(),
      phone = TextEditingController(),
      email = TextEditingController();
  Json? quote, pending;
  Object? error;
  bool busy = false, accepted = false;
  @override
  void initState() {
    super.initState();
    pending = widget.api.pendingBookingRequest;
    quote = widget.api.pendingBookingQuote;
    accepted = pending != null;
    name.text =
        object(pending?['contact'])['name']?.toString() ??
        widget.api.user?['displayName']?.toString() ??
        '';
    phone.text =
        object(pending?['contact'])['phone']?.toString() ??
        widget.api.user?['phone']?.toString() ??
        '';
    email.text =
        object(pending?['contact'])['email']?.toString() ??
        widget.api.user?['email']?.toString() ??
        '';
    widget.api.addListener(changed);
  }

  void changed() {
    if (mounted && revision != widget.api.bookingCartRevision) {
      setState(() {
        revision = widget.api.bookingCartRevision;
        quote = null;
        accepted = false;
      });
    }
  }

  @override
  void dispose() {
    widget.api.removeListener(changed);
    name.dispose();
    phone.dispose();
    email.dispose();
    super.dispose();
  }

  Json get cart => {
    'householdId': widget.api.bookingHouseholdId,
    'items': [for (final row in widget.api.bookingCart) object(row['payload'])],
  };
  Future<void> getQuote() async {
    setState(() {
      busy = true;
      error = null;
      quote = null;
      accepted = false;
    });
    try {
      final response = await widget.api.request(
        'POST',
        '/bookings/quote',
        body: cart,
      );
      if (mounted) setState(() => quote = object(response['quote']));
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> hold() async {
    if (pending == null &&
        (quote == null ||
            quote!['canHold'] == false ||
            !form.currentState!.validate() ||
            !accepted)) {
      return;
    }
    pending ??= {
      ...cart,
      'contact': {
        'name': name.text.trim(),
        'phone': phone.text.trim(),
        'email': email.text.trim().isEmpty ? null : email.text.trim(),
      },
      'expectedQuoteToken': quote!['token'],
      'idempotencyKey': bookingKey(),
    };
    widget.api.pendingBookingRequest = pending;
    widget.api.pendingBookingQuote = quote;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final response = await widget.api.request(
        'POST',
        '/bookings',
        body: pending,
      );
      if (!mounted) return;
      widget.api.clearBookingCart();
      await Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => BookingDetailPage(
            api: widget.api,
            id: object(response['booking'])['id'].toString(),
          ),
        ),
      );
    } catch (e) {
      if (widget.api.epoch != epoch) return;
      if (mounted) {
        setState(() {
          error = e;
          if (e is ApiFailure &&
              [
                'QUOTE_CHANGED',
                'AVAILABILITY_CONFLICT',
                'INVALID_REQUEST',
                'VALIDATION_ERROR',
                'HOLD_LIMIT',
                'HOLD_WINDOW_TOO_SHORT',
                'IDEMPOTENCY_CONFLICT',
                'FORBIDDEN',
                'HOUSEHOLD_NOT_APPROVED',
              ].contains(e.code)) {
            pending = null;
            widget.api.pendingBookingRequest = null;
            widget.api.pendingBookingQuote = null;
            quote = null;
            accepted = false;
          }
        });
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => _BookingAccess(
    api: widget.api,
    epoch: epoch,
    page: () => Scaffold(
      appBar: AppBar(title: const Text('Giỏ đặt chỗ')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Notice(
            'Một giỏ gồm phòng và dịch vụ của cùng một hộ. Báo giá chưa giữ chỗ; yêu cầu được giữ tối đa 15 phút để hộ xác nhận.',
          ),
          for (final (index, row) in widget.api.bookingCart.indexed)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(row['title'].toString()),
              subtitle: Text(
                '${object(row['payload'])['participants']} khách · ${object(row['payload'])['kind'] == 'ROOM' ? '${object(row['payload'])['checkInDate']} → ${object(row['payload'])['checkOutDate']}' : 'Khung giờ #${object(row['payload'])['slotId']}'}',
              ),
              trailing: IconButton(
                tooltip: 'Gỡ hạng mục',
                onPressed: busy || pending != null
                    ? null
                    : () => widget.api.removeBookingItem(index),
                icon: const Icon(Icons.close),
              ),
            ),
          if (widget.api.bookingCart.isEmpty)
            const EmptyPanel(
              'Giỏ đang trống. Mở chi tiết phòng hoặc dịch vụ để thêm.',
            ),
          if (error != null) ErrorPanel(error!),
          if (widget.api.bookingCart.isNotEmpty) ...[
            OutlinedButton(
              onPressed: busy || pending != null ? null : getQuote,
              child: const Text('Kiểm tra và lấy báo giá'),
            ),
            if (quote != null) ...[
              const Notice(
                'Giữ chỗ tối đa 24 giờ và kết thúc trước giờ sử dụng 2 giờ. Hộ cần ít nhất 30 phút để phản hồi.',
              ),
              if (quote!['canHold'] == false)
                const Notice(
                  'Đã quá thời gian nhận yêu cầu giữ chỗ cho lịch này. Vui lòng chọn lịch khác.',
                ),
              if (quote!['holdExpiresAt'] != null)
                Text('Hạn dự kiến: ${calendarTime(quote!['holdExpiresAt'])}'),
              Text(
                'Tổng: ${money(quote!['totalVnd'] as int)}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              for (final item in records(quote!['items']))
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${object(item['snapshot'])['title']} · ${money(item['totalVnd'] as int)}\n${calendarTime(item['startsAt'])} → ${calendarTime(item['endsAt'])}',
                      ),
                      _BookingConditions(snapshot: object(item['snapshot'])),
                      for (final addon in records(item['addons']))
                        Text(
                          '${addon['name']} ×${addon['quantity']} · ${money(addon['amount_vnd'] as int)}',
                        ),
                    ],
                  ),
                ),
              Form(
                key: form,
                child: Column(
                  children: [
                    TextFormField(
                      controller: name,
                      enabled: !busy && pending == null,
                      decoration: const InputDecoration(
                        labelText: 'Tên người liên hệ',
                      ),
                      maxLength: 150,
                      validator: (s) => s == null || s.trim().isEmpty
                          ? 'Nhập tên liên hệ'
                          : null,
                    ),
                    TextFormField(
                      controller: phone,
                      enabled: !busy && pending == null,
                      decoration: const InputDecoration(
                        labelText: 'Số điện thoại',
                      ),
                      keyboardType: TextInputType.phone,
                      validator: (s) =>
                          RegExp(r'^\+?[0-9][0-9 ()-]{6,30}$')
                              .hasMatch(s?.trim() ?? '')
                          ? null
                          : 'Nhập số điện thoại hợp lệ',
                    ),
                    TextFormField(
                      controller: email,
                      enabled: !busy && pending == null,
                      decoration: const InputDecoration(
                        labelText: 'Email liên hệ (tùy chọn)',
                      ),
                      keyboardType: TextInputType.emailAddress,
                    ),
                  ],
                ),
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: accepted,
                onChanged: busy || pending != null
                    ? null
                    : (v) => setState(() => accepted = v ?? false),
                title: const Text(
                  'Tôi đã kiểm tra hạng mục, thời gian, giá và điều kiện phục vụ.',
                ),
              ),
            ],
            if (pending != null)
              const Notice(
                'Máy chủ chưa xác nhận kết quả. Thử lại gửi cùng yêu cầu để tránh tạo đơn trùng.',
              ),
            FilledButton(
              onPressed:
                  busy ||
                      (pending == null &&
                          (!accepted || quote?['canHold'] == false))
                  ? null
                  : hold,
              child: Text(
                busy
                    ? 'Đang xử lý…'
                    : pending != null
                    ? 'Thử lại giữ chỗ'
                    : 'Gửi yêu cầu giữ chỗ',
              ),
            ),
          ],
        ],
      ),
    ),
  );
}

class BookingNotificationsPage extends StatefulWidget {
  const BookingNotificationsPage({super.key, required this.api});
  final TourismApi api;
  @override
  State<BookingNotificationsPage> createState() =>
      _BookingNotificationsPageState();
}

class _BookingNotificationsPageState extends State<BookingNotificationsPage> {
  late final epoch = widget.api.epoch;
  Json? data;
  Object? error;
  int page = 1;
  bool unreadOnly = false;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    if (!widget.api.signedIn || widget.api.epoch != epoch || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await widget.api.request(
        'GET',
        '/notifications',
        query: {
          'page': page,
          'pageSize': 20,
          'unreadOnly': unreadOnly.toString(),
        },
      );
      if (mounted && widget.api.epoch == epoch) setState(() => data = result);
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> open(Json notification) async {
    if (busy || widget.api.epoch != epoch || !widget.api.signedIn) return;
    try {
      await widget.api.request(
        'POST',
        '/notifications/${notification['id']}/read',
      );
      if (!mounted || widget.api.epoch != epoch) return;
      final navigation = object(notification['navigation']);
      if (navigation['screen'] == 'booking' &&
          navigation['bookingId'] != null) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => BookingDetailPage(
              api: widget.api,
              id: navigation['bookingId'].toString(),
              host: navigation['audience'] == 'host',
            ),
          ),
        );
      } else {
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(notification['title'].toString()),
            content: Text(notification['body'].toString()),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Đóng'),
              ),
            ],
          ),
        );
      }
      if (mounted) await load();
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  @override
  Widget build(BuildContext context) => _BookingAccess(
    api: widget.api,
    epoch: epoch,
    page: () => Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          IconButton(
            onPressed: busy ? null : load,
            tooltip: 'Tải lại',
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (data != null) Text('${data!['unreadCount']} thông báo chưa đọc'),
          SwitchListTile(
            title: const Text('Chỉ chưa đọc'),
            value: unreadOnly,
            onChanged: busy
                ? null
                : (v) {
                    setState(() {
                      unreadOnly = v;
                      page = 1;
                    });
                    load();
                  },
          ),
          if (busy) const LinearProgressIndicator(),
          if (error != null) ErrorPanel(error!, retry: load),
          if (data != null && records(data!['items']).isEmpty)
            const EmptyPanel('Chưa có thông báo trong bộ lọc này.'),
          for (final n in records(data?['items']))
            Card(
              child: ListTile(
                leading: Icon(
                  n['readAt'] == null
                      ? Icons.notifications_active_outlined
                      : Icons.notifications_none,
                ),
                title: Text(n['title'].toString()),
                subtitle: Text('${n['body']}\n${calendarTime(n['createdAt'])}'),
                onTap: busy ? null : () => open(n),
              ),
            ),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            children: [
              TextButton(
                onPressed: busy || page <= 1
                    ? null
                    : () {
                        setState(() => page--);
                        load();
                      },
                child: const Text('Trang trước'),
              ),
              Text('Trang $page'),
              TextButton(
                onPressed: busy || page * 20 >= (data?['total'] as int? ?? 0)
                    ? null
                    : () {
                        setState(() => page++);
                        load();
                      },
                child: const Text('Trang sau'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class BookingListPage extends StatefulWidget {
  const BookingListPage({
    super.key,
    required this.api,
    this.host = false,
    this.initialStatus,
  });
  final TourismApi api;
  final bool host;
  final String? initialStatus;
  @override
  State<BookingListPage> createState() => _BookingListPageState();
}

class _BookingListPageState extends State<BookingListPage> {
  late final epoch = widget.api.epoch;
  late String status = widget.initialStatus ?? '';
  int page = 1;
  Future<Json>? future;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    if (widget.api.signedIn && widget.api.epoch == epoch) {
      future = widget.api.request(
        'GET',
        widget.host ? '/households/me/bookings' : '/bookings',
        query: {
          'page': page,
          'pageSize': 20,
          if (status.isNotEmpty) 'status': status,
        },
      );
    }
  }

  @override
  Widget build(BuildContext context) => _BookingAccess(
    api: widget.api,
    epoch: epoch,
    host: widget.host,
    page: () => Scaffold(
      appBar: AppBar(
        title: Text(widget.host ? 'Đơn đặt của hộ' : 'Chuyến đi của tôi'),
        actions: [
          IconButton(
            tooltip: 'Thông báo',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => BookingNotificationsPage(api: widget.api),
              ),
            ),
            icon: const Icon(Icons.notifications_outlined),
          ),
          if (widget.host)
            IconButton(
              tooltip: 'Sổ tiền',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => BookingLedgerPage(api: widget.api),
                ),
              ),
              icon: const Icon(Icons.account_balance_wallet_outlined),
            ),
          IconButton(
            tooltip: 'Tải lại đơn đặt',
            onPressed: () => setState(load),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (!widget.host)
            ListenableBuilder(
              listenable: widget.api,
              builder: (context, _) => OutlinedButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => BookingCheckoutPage(api: widget.api),
                  ),
                ),
                icon: const Icon(Icons.shopping_bag_outlined),
                label: Text('Giỏ đặt chỗ (${widget.api.bookingCart.length})'),
              ),
            ),
          DropdownButtonFormField<String>(
            initialValue: status,
            decoration: const InputDecoration(labelText: 'Trạng thái đơn'),
            items: [
              const DropdownMenuItem(value: '', child: Text('Tất cả')),
              for (final state in bookingStates.entries)
                DropdownMenuItem(value: state.key, child: Text(state.value)),
            ],
            onChanged: (v) => setState(() {
              status = v ?? '';
              page = 1;
              load();
            }),
          ),
          FutureBuilder<Json>(
            future: future,
            builder: (context, s) {
              if (s.hasError) {
                return ErrorPanel(s.error!, retry: () => setState(load));
              }
              if (!s.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final data = s.data!;
              return Column(
                children: [
                  if (records(data['items']).isEmpty)
                    const EmptyPanel('Chưa có đơn đặt trong trạng thái này.'),
                  for (final b in records(data['items']))
                    Card(
                      child: ListTile(
                        title: Text(b['code'].toString()),
                        subtitle: Text(
                          '${bookingStates[b['displayStatus'] ?? b['status']] ?? b['status']} · ${money(b['totalVnd'] as int)}\n${calendarTime(b['firstStartsAt'])}',
                        ),
                        isThreeLine: true,
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () async {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => BookingDetailPage(
                                api: widget.api,
                                id: b['id'].toString(),
                                host: widget.host,
                              ),
                            ),
                          );
                          if (mounted) setState(load);
                        },
                      ),
                    ),
                  PageButtons(
                    page: page,
                    total: data['total'] as int,
                    onPage: (v) => setState(() {
                      page = v;
                      load();
                    }),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    ),
  );
}

class BookingDetailPage extends StatefulWidget {
  const BookingDetailPage({
    super.key,
    required this.api,
    required this.id,
    this.host = false,
  });
  final TourismApi api;
  final String id;
  final bool host;
  @override
  State<BookingDetailPage> createState() => _BookingDetailPageState();
}

class _BookingDetailPageState extends State<BookingDetailPage> {
  late final epoch = widget.api.epoch;
  Json? detail;
  Object? error;
  bool busy = false;
  Timer? timer;
  int loadVersion = 0;
  Json? cancellationRetry;
  DateTime serverAt = DateTime.now().toUtc();
  DateTime loadedAt = DateTime.now().toUtc();
  DateTime get currentTime =>
      serverAt.add(DateTime.now().toUtc().difference(loadedAt));
  void applyDetail(Json data) {
    detail = data;
    loadedAt = DateTime.now().toUtc();
    serverAt =
        DateTime.tryParse(data['serverNow']?.toString() ?? '') ?? loadedAt;
  }

  String get path =>
      '${widget.host ? '/households/me/bookings' : '/bookings'}/${widget.id}';
  @override
  void initState() {
    super.initState();
    load();
    timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if ((detail?['booking']?['status'] == 'PENDING' ||
              detail?['booking']?['pendingCancellation'] != null) &&
          !busy) {
        load();
      }
    });
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> load() async {
    if (!widget.api.signedIn || widget.api.epoch != epoch) return;
    final version = ++loadVersion;
    try {
      final data = await widget.api.request('GET', path);
      if (mounted && widget.api.epoch == epoch && version == loadVersion) {
        setState(() {
          applyDetail(data);
          error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  bool can(String action) =>
      detail?['allowedActions'] == null ||
      (detail!['allowedActions'] as List).contains(action);

  Future<void> transition(String action) async {
    final reason = await askReason(
      context,
      {
        'confirm': 'Xác nhận yêu cầu',
        'reject': 'Từ chối yêu cầu',
        'cancel': 'Hủy đơn đặt',
        'complete': 'Xác nhận đã phục vụ đầy đủ',
      }[action]!,
      description: action == 'cancel'
          ? 'Hủy giải phóng toàn bộ hạng mục. Khoản hoàn được ghi nhận riêng.'
          : action == 'complete'
          ? 'Chỉ hoàn thành sau khi tất cả hạng mục kết thúc và đã phục vụ đầy đủ.'
          : null,
    );
    if (reason == null ||
        !mounted ||
        widget.api.epoch != epoch ||
        !widget.api.signedIn) {
      return;
    }
    loadVersion++;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.api.request(
        'POST',
        '$path/$action',
        body: {
          'expectedToken': object(detail!['booking'])['token'],
          'reason': reason,
        },
      );
      if (mounted && widget.api.epoch == epoch) {
        setState(() => applyDetail(data));
      }
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> cancellationAction(String action) async {
    if (busy || cancellationRetry != null || detail == null) return;
    final b = object(detail!['booking']);
    final reason = await askReason(
      context,
      {
        'request': 'Gửi yêu cầu hủy',
        'withdraw': 'Rút yêu cầu hủy',
        'confirm': 'Xác nhận hủy',
      }[action]!,
      description: action == 'request'
          ? 'Yêu cầu được gửi ngay. Chỗ vẫn được giữ đến khi hộ xác nhận hủy; đơn chưa xác nhận vẫn hết hạn theo hạn cũ.'
          : action == 'confirm'
          ? 'Giải phóng chỗ của đơn này. Các khoản thu và hoàn tiền giữ nguyên để đối soát riêng.'
          : 'Tiếp tục booking theo thời hạn cũ, không gia hạn giữ chỗ.',
    );
    if (reason == null ||
        !mounted ||
        widget.api.epoch != epoch ||
        !widget.api.signedIn) {
      return;
    }
    final target = action == 'request'
        ? '/bookings/${widget.id}/cancellation-requests'
        : '$path/cancellation-requests/${object(b['pendingCancellation'])['id']}/$action';
    cancellationRetry = {
      'path': target,
      'body': {
        'expectedToken': b['token'],
        'idempotencyKey': bookingKey(),
        'reason': reason,
      },
    };
    await retryCancellation();
  }

  Future<void> retryCancellation() async {
    if (busy ||
        cancellationRetry == null ||
        widget.api.epoch != epoch ||
        !widget.api.signedIn) {
      return;
    }
    loadVersion++;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await widget.api.request(
        'POST',
        cancellationRetry!['path'].toString(),
        body: object(cancellationRetry!['body']),
      );
      if (!mounted || widget.api.epoch != epoch) return;
      setState(() {
        cancellationRetry = null;
        applyDetail(result);
      });
      // A replay returns the original decision; refresh to show subsequent changes.
      await load();
    } catch (e) {
      if (!mounted || widget.api.epoch != epoch) return;
      final definitive =
          e is ApiFailure &&
          [
            'STALE_VERSION',
            'HOLD_EXPIRED',
            'INVALID_STATE',
            'FORBIDDEN',
            'ACCOUNT_BLOCKED',
            'CANCELLATION_PENDING',
            'SERVICE_ALREADY_STARTED',
            'IDEMPOTENCY_CONFLICT',
            'INVALID_REQUEST',
            'VALIDATION_ERROR',
          ].contains(e.code);
      if (definitive) {
        cancellationRetry = null;
        await load();
      }
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> record(String type) async {
    final key = bookingKey(), b = object(detail!['booking']);
    String? occurred;
    final agreements = records(detail!['entries'])
        .where((e) => e['type'] == 'REFUND_AGREEMENT')
        .toList();
    await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: entryLabels[type]!,
          action: 'Ghi nhận',
          description: type == 'REFUND_AGREEMENT'
              ? 'Thỏa thuận hoàn ghi nghĩa vụ; chỉ thực hoàn mới làm giảm tiền đang giữ.'
              : 'Chỉ ghi khi tiền đã được thu hoặc hoàn thực tế.',
          fields: [
            FieldSpec(
              'amountVnd',
              'Số tiền (VND)',
              kind: InputKind.integer,
              required: true,
              min: type == 'REFUND_ADJUSTMENT' ? -999999999999999 : 1,
              hint: type == 'REFUND_ADJUSTMENT'
                  ? 'Nhập phần tăng (dương) hoặc giảm (âm), không nhập tổng mới.'
                  : null,
            ),
            if (!['REFUND_AGREEMENT', 'REFUND_ADJUSTMENT'].contains(type))
              const FieldSpec(
                'paymentMethod',
                'Hình thức',
                kind: InputKind.choice,
                choices: {
                  'CASH': 'Tiền mặt',
                  'BANK_TRANSFER': 'Chuyển khoản',
                  'OTHER': 'Khác',
                },
                required: true,
              ),
            if (type == 'RECEIPT')
              const FieldSpec(
                'receiptPurpose',
                'Mục đích thu',
                kind: InputKind.choice,
                choices: {'DEPOSIT': 'Đặt cọc', 'BALANCE': 'Thanh toán'},
                required: true,
              ),
            if (['REFUND', 'REFUND_ADJUSTMENT'].contains(type))
              FieldSpec(
                'agreementId',
                'Thỏa thuận hoàn',
                kind: InputKind.choice,
                choices: {
                  for (final e in agreements)
                    e['id'].toString():
                        '#${e['id']} · ${money(e['amountVnd'] as int)}',
                },
                required: true,
              ),
            const FieldSpec(
              'note',
              'Nội dung / chứng từ',
              required: true,
              maxLength: 2000,
            ),
          ],
          initial: {
            if (!['REFUND_AGREEMENT', 'REFUND_ADJUSTMENT'].contains(type))
              'paymentMethod': 'CASH',
            if (type == 'RECEIPT') 'receiptPurpose': 'DEPOSIT',
            if (['REFUND', 'REFUND_ADJUSTMENT'].contains(type) &&
                agreements.length == 1)
              'agreementId': agreements.single['id'],
          },
          save: (input) {
            occurred ??= bookingNow();
            return widget.api.request(
              'POST',
              '$path/financial-entries',
              body: {
                ...input,
                'expectedToken': b['token'],
                'idempotencyKey': key,
                'type': type,
                'occurredAt': occurred,
              },
            );
          },
        ),
      ),
    );
    if (mounted) await load();
  }

  Future<void> reverse(Json entry) async {
    final reason = await askReason(
      context,
      'Đảo chứng từ #${entry['id']}',
      description: 'Ghi một bút toán đảo, giữ nguyên chứng từ gốc.',
    );
    if (reason == null ||
        !mounted ||
        widget.api.epoch != epoch ||
        !widget.api.signedIn) {
      return;
    }
    final payload = {
      'expectedToken': object(detail!['booking'])['token'],
      'idempotencyKey': bookingKey(),
      'occurredAt': bookingNow(),
      'note': reason,
    };
    setState(() => busy = true);
    try {
      final response = await widget.api.request(
        'POST',
        '$path/financial-entries/${entry['id']}/reverse',
        body: payload,
      );
      if (mounted) setState(() => detail = response);
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> review() async {
    await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: 'Đánh giá chuyến đi',
          action: 'Gửi đánh giá',
          fields: const [
            FieldSpec(
              'rating',
              'Số sao (1–5)',
              kind: InputKind.integer,
              required: true,
              min: 1,
              max: 5,
            ),
            FieldSpec(
              'comment',
              'Cảm nhận của bạn',
              kind: InputKind.paragraph,
              required: true,
              maxLength: 4000,
            ),
          ],
          initial: const {'rating': 5},
          save: (input) => widget.api.request(
            'POST',
            '/bookings/${widget.id}/review',
            body: input,
          ),
        ),
      ),
    );
    if (mounted) await load();
  }

  @override
  Widget build(BuildContext context) => _BookingAccess(
    api: widget.api,
    epoch: epoch,
    host: widget.host,
    page: () => Scaffold(
      appBar: AppBar(
        title: const Text('Chi tiết đặt chỗ'),
        actions: [
          IconButton(
            tooltip: 'Tải lại chi tiết',
            onPressed: busy ? null : load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: detail == null
          ? (error == null
                ? const Center(child: CircularProgressIndicator())
                : ErrorPanel(error!, retry: load))
          : Builder(
              builder: (context) {
                final b = object(detail!['booking']),
                    summary = object(b['summary']),
                    pending = b['status'] == 'PENDING',
                    cancelPending = b['pendingCancellation'] != null,
                    confirmed = b['status'] == 'CONFIRMED',
                    future = DateTime.parse(b['firstStartsAt'].toString())
                        .isAfter(currentTime);
                return ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text(
                      b['code'].toString(),
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      bookingStates[b['displayStatus'] ?? b['status']] ??
                          b['status'].toString(),
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    Text('Tổng giá trị ${money(b['totalVnd'] as int)}'),
                    if (pending)
                      Notice(
                        'Giữ chỗ đến ${calendarTime(b['holdExpiresAt'])}. Hết hạn sẽ tự giải phóng nếu hộ chưa xác nhận.',
                      ),
                    if (cancelPending) ...[
                      Notice(
                        'Yêu cầu hủy lúc ${calendarTime(object(b['pendingCancellation'])['createdAt'])}. ${object(b['pendingCancellation'])['reason']}\nChỗ vẫn được giữ đến khi hộ xác nhận hủy. Khoản thu/hoàn được xử lý riêng.',
                      ),
                      if (widget.host && can('confirmCancellation'))
                        FilledButton(
                          onPressed: busy || cancellationRetry != null
                              ? null
                              : () => cancellationAction('confirm'),
                          child: const Text('Xác nhận hủy theo yêu cầu khách'),
                        ),
                      if (!widget.host && future && can('withdrawCancellation'))
                        OutlinedButton(
                          onPressed: busy || cancellationRetry != null
                              ? null
                              : () => cancellationAction('withdraw'),
                          child: const Text('Rút yêu cầu hủy'),
                        ),
                    ],
                    if (cancellationRetry != null) ...[
                      const Notice(
                        'Chưa xác định được kết quả. Thử lại cùng yêu cầu để tránh xử lý trùng.',
                      ),
                      FilledButton(
                        onPressed: busy ? null : retryCancellation,
                        child: const Text('Thử lại thao tác hủy'),
                      ),
                    ],
                    for (final request in records(
                      detail!['cancellations'],
                    ).where((r) => r['status'] != 'OPEN'))
                      ListTile(
                        title: Text(
                          {
                                'ACCEPTED': 'Hộ đã xác nhận hủy',
                                'WITHDRAWN': 'Khách đã rút yêu cầu hủy',
                                'CLOSED': 'Yêu cầu hủy đã đóng',
                              }[request['status']] ??
                              request['status'].toString(),
                        ),
                        subtitle: Text(
                          '${request['reason']}\n${request['closedReason'] ?? ''} · ${calendarTime(request['closedAt'])}',
                        ),
                      ),
                    if (b['closedReason'] != null)
                      Notice(b['closedReason'].toString()),
                    if (error != null) ErrorPanel(error!),
                    for (final item in records(detail!['items']))
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                object(item['snapshot'])['title'].toString(),
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Text(
                                '${calendarTime(item['startsAt'])} → ${calendarTime(item['endsAt'])}',
                              ),
                              Text(
                                '${item['participants']} khách · ${item['quantity']} ${label(item['pricingType'])} · ${money(item['totalVnd'] as int)}',
                              ),
                              _BookingConditions(
                                snapshot: object(item['snapshot']),
                              ),
                              for (final addon in records(item['addons']))
                                Text(
                                  '${addon['name']} ×${addon['quantity']} · ${money(addon['amount_vnd'] as int)}',
                                ),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 12),
                    Text(
                      'Liên hệ',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      '${object(b['contact'])['name']} · ${object(b['contact'])['phone']}',
                    ),
                    Text(object(b['contact'])['email']?.toString() ?? ''),
                    if (widget.host && pending && !cancelPending)
                      Wrap(
                        spacing: 8,
                        children: [
                          FilledButton(
                            onPressed: busy || !can('confirm')
                                ? null
                                : () => transition('confirm'),
                            child: const Text('Xác nhận'),
                          ),
                          OutlinedButton(
                            onPressed: busy || !can('reject')
                                ? null
                                : () => transition('reject'),
                            child: const Text('Từ chối'),
                          ),
                        ],
                      ),
                    if ((pending || confirmed) &&
                        future &&
                        !cancelPending &&
                        can(widget.host ? 'cancel' : 'requestCancellation'))
                      OutlinedButton(
                        onPressed: busy || cancellationRetry != null
                            ? null
                            : () => widget.host
                                  ? transition('cancel')
                                  : cancellationAction('request'),
                        child: Text(
                          widget.host
                              ? 'Hộ chủ động hủy đơn'
                              : 'Yêu cầu hủy đơn',
                        ),
                      ),
                    if (widget.host &&
                        can('complete') &&
                        !cancelPending &&
                        confirmed &&
                        DateTime.parse(b['lastEndsAt'].toString())
                            .isBefore(currentTime))
                      FilledButton(
                        onPressed: busy ? null : () => transition('complete'),
                        child: const Text('Hoàn thành phục vụ'),
                      ),
                    const Divider(height: 32),
                    Text(
                      'Sổ tiền',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      'Đã thu: ${money(summary['receivedVnd'] as int)}\nĐã hoàn: ${money(summary['refundedVnd'] as int)}\nĐang giữ: ${money(summary['netReceivedVnd'] as int)}\nCòn phải thu: ${money(summary['balanceDueVnd'] as int)}\nCòn phải hoàn: ${money(summary['refundDueVnd'] as int)}',
                    ),
                    if (widget.host &&
                        ![
                          'PENDING',
                          'REJECTED',
                          'EXPIRED',
                        ].contains(b['status']))
                      Wrap(
                        spacing: 8,
                        children: [
                          if (['CONFIRMED', 'COMPLETED'].contains(b['status']))
                            OutlinedButton(
                              onPressed: busy ? null : () => record('RECEIPT'),
                              child: const Text('Ghi thu tiền'),
                            ),
                          OutlinedButton(
                            onPressed: busy
                                ? null
                                : () => record('REFUND_AGREEMENT'),
                            child: const Text('Thỏa thuận hoàn'),
                          ),
                          if (records(detail!['entries'])
                              .any((e) => e['type'] == 'REFUND_AGREEMENT'))
                            OutlinedButton(
                              onPressed: busy
                                  ? null
                                  : () => record('REFUND_ADJUSTMENT'),
                              child: const Text('Điều chỉnh khoản hoàn'),
                            ),
                          if (records(detail!['entries'])
                              .any((e) => e['type'] == 'REFUND_AGREEMENT'))
                            OutlinedButton(
                              onPressed: busy ? null : () => record('REFUND'),
                              child: const Text('Ghi hoàn tiền'),
                            ),
                        ],
                      ),
                    for (final entry in records(detail!['entries']))
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          '${entryLabels[entry['type']] ?? entry['type']} ${entry['reversesEntryId'] != null ? '(đảo #${entry['reversesEntryId']})' : ''} · ${money(entry['amountVnd'] as int)}',
                        ),
                        subtitle: Text(
                          '${entry['note']}\n${calendarTime(entry['occurredAt'])}',
                        ),
                        trailing:
                            widget.host &&
                                entry['reversesEntryId'] == null &&
                                ['RECEIPT', 'REFUND'].contains(entry['type']) &&
                                !records(detail!['entries']).any(
                                  (e) => e['reversesEntryId'] == entry['id'],
                                )
                            ? IconButton(
                                tooltip: 'Đảo chứng từ',
                                onPressed: busy ? null : () => reverse(entry),
                                icon: const Icon(Icons.undo),
                              )
                            : null,
                      ),
                    const Divider(height: 32),
                    if (detail!['review'] != null)
                      Notice(
                        '${object(detail!['review'])['rating']}/5 · ${object(detail!['review'])['comment']}${object(detail!['review'])['hiddenAt'] != null ? '\nĐánh giá đang được ẩn để kiểm duyệt.' : ''}',
                      )
                    else if (!widget.host && b['status'] == 'COMPLETED')
                      FilledButton(
                        onPressed: review,
                        child: const Text('Viết đánh giá'),
                      ),
                    Text(
                      'Lịch sử',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    for (final h in records(detail!['history']))
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          bookingStates[h['to']] ?? h['to'].toString(),
                        ),
                        subtitle: Text(
                          '${calendarTime(h['createdAt'])} · ${h['reason'] ?? ''}',
                        ),
                      ),
                  ],
                );
              },
            ),
    ),
  );
}

class _BookingConditions extends StatelessWidget {
  const _BookingConditions({required this.snapshot});
  final Json snapshot;
  @override
  Widget build(BuildContext context) {
    final offer = object(snapshot['offer']),
        profile = object(snapshot['profile']),
        terms = object(offer['terms'] ?? profile['terms']),
        details = object(profile['details']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (offer['name'] != null)
          Text('${offer['name']} · ${label(offer['participationMode'])}'),
        if (terms['scopeDescription'] != null)
          Text(terms['scopeDescription'].toString()),
        if ((terms['includedItems'] as List? ?? []).isNotEmpty)
          Text('Bao gồm: ${(terms['includedItems'] as List).join(', ')}'),
        if ((terms['excludedItems'] as List? ?? []).isNotEmpty)
          Text('Không bao gồm: ${(terms['excludedItems'] as List).join(', ')}'),
        for (final key in [
          'houseRules',
          'participationConditions',
          'preparationNotes',
        ])
          if ((details[key] as List? ?? []).isNotEmpty)
            Text((details[key] as List).join('\n')),
      ],
    );
  }
}

class BookingLedgerPage extends StatefulWidget {
  const BookingLedgerPage({super.key, required this.api});
  final TourismApi api;
  @override
  State<BookingLedgerPage> createState() => _BookingLedgerPageState();
}

class _BookingLedgerPageState extends State<BookingLedgerPage> {
  late final epoch = widget.api.epoch;
  int page = 1;
  Future<Json>? future;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    if (widget.api.isHousehold && widget.api.epoch == epoch) {
      future = widget.api.request(
        'GET',
        '/households/me/financial-entries',
        query: {'page': page, 'pageSize': 20},
      );
    }
  }

  @override
  Widget build(BuildContext context) => _BookingAccess(
    api: widget.api,
    epoch: epoch,
    host: true,
    page: () => Scaffold(
      appBar: AppBar(
        title: const Text('Sổ tiền của hộ'),
        actions: [
          IconButton(
            tooltip: 'Tải lại sổ tiền',
            onPressed: () => setState(load),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: FutureBuilder<Json>(
        future: future,
        builder: (context, s) {
          if (s.hasError) {
            return ErrorPanel(s.error!, retry: () => setState(load));
          }
          if (!s.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Notice(
                'Thỏa thuận hoàn là nghĩa vụ, chưa phải tiền đã hoàn. Chứng từ đảo được tính ngược với chứng từ gốc.',
              ),
              if (records(s.data!['items']).isEmpty)
                const EmptyPanel('Chưa có chứng từ.'),
              for (final e in records(s.data!['items']))
                ListTile(
                  title: Text(
                    '${entryLabels[e['type']] ?? e['type']} · ${money(e['amountVnd'] as int)}',
                  ),
                  subtitle: Text(
                    'Đơn #${e['bookingId']} · ${calendarTime(e['occurredAt'])}\n${e['note']}${e['reversesEntryId'] != null ? ' · Đảo #${e['reversesEntryId']}' : ''}',
                  ),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => BookingDetailPage(
                        api: widget.api,
                        id: e['bookingId'].toString(),
                        host: true,
                      ),
                    ),
                  ),
                ),
              PageButtons(
                page: page,
                total: s.data!['total'] as int,
                onPage: (v) => setState(() {
                  page = v;
                  load();
                }),
              ),
            ],
          );
        },
      ),
    ),
  );
}

class PublicReviewsPanel extends StatefulWidget {
  const PublicReviewsPanel({
    super.key,
    required this.api,
    required this.householdId,
  });
  final TourismApi api;
  final String householdId;
  @override
  State<PublicReviewsPanel> createState() => _PublicReviewsPanelState();
}

class _PublicReviewsPanelState extends State<PublicReviewsPanel> {
  int page = 1;
  late Future<Json> future = load();
  Future<Json> load() => widget.api.request(
    'GET',
    '/public/households/${widget.householdId}/reviews',
    authenticated: false,
    query: {'page': page, 'pageSize': 20},
  );
  @override
  Widget build(BuildContext context) => FutureBuilder<Json>(
    future: future,
    builder: (context, s) {
      if (s.hasError) {
        return ErrorPanel(
          s.error!,
          retry: () => setState(() => future = load()),
        );
      }
      if (!s.hasData) return const SizedBox.shrink();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Đánh giá từ khách đã hoàn thành chuyến đi',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          Text(
            s.data!['averageRating'] == null
                ? 'Chưa có đánh giá'
                : '${(s.data!['averageRating'] as int).toStringAsFixed(1)}/5 · ${s.data!['total']} đánh giá của hộ',
          ),
          for (final r in records(s.data!['items']))
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${r['rating']}/5 · ${r['comment']}'),
              subtitle: Text(calendarTime(r['createdAt'])),
            ),
          if ((s.data!['total'] as int) > 20)
            PageButtons(
              page: page,
              total: s.data!['total'] as int,
              onPage: (v) => setState(() {
                page = v;
                future = load();
              }),
            ),
        ],
      );
    },
  );
}
