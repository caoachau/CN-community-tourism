part of 'app.dart';

class PublicDetail extends StatefulWidget {
  const PublicDetail({
    super.key,
    required this.api,
    required this.kind,
    required this.id,
  });
  final TourismApi api;
  final PublicKind kind;
  final String id;
  @override
  State<PublicDetail> createState() => _PublicDetailState();
}

class _PublicDetailState extends State<PublicDetail> {
  late Future<Json> future;
  int tab = 0;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    future = widget.api.request(
      'GET',
      '/public/${widget.kind.path}/${widget.id}',
      authenticated: false,
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: FutureBuilder<Json>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return SafeArea(
            child: Column(
              children: [
                Align(alignment: Alignment.centerLeft, child: BackButton()),
                ErrorPanel(snapshot.error!, retry: () => setState(load)),
              ],
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final item = _Listing(
          widget.kind,
          object(snapshot.data![widget.kind.root]),
        );
        return Column(
          children: [
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  Stack(
                    children: [
                      _ListingPhoto(
                        item,
                        height: 300,
                        favorite: false,
                        image: item.kind == PublicKind.room ? 'detail' : null,
                      ),
                      SafeArea(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(10, 10, 10, 0),
                          child: Row(
                            children: [
                              _RoundButton(
                                Icons.arrow_back_ios_new,
                                'Quay lại',
                                () => Navigator.pop(context),
                              ),
                              const Spacer(),
                              _RoundButton(
                                Icons.favorite_border,
                                'Lưu yêu thích',
                                () => featureAlert(
                                  context,
                                  MissingFeature.favorites,
                                ),
                              ),
                              const SizedBox(width: 8),
                              _RoundButton(Icons.ios_share, 'Chia sẻ thông tin', () async {
                                await Clipboard.setData(
                                  ClipboardData(
                                    text:
                                        '${item.title}\n${item.locality}\n${item.price == null ? 'Liên hệ hộ' : '${money(item.price!)} /${item.unit}'}',
                                  ),
                                );
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Đã sao chép thông tin giới thiệu.',
                                      ),
                                    ),
                                  );
                                }
                              }),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 18, 16, 6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 22,
                            height: 1.3,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const CircleAvatar(
                              radius: 19,
                              backgroundColor: uiMint,
                              child: Icon(
                                Icons.cottage_outlined,
                                size: 22,
                                color: uiGreen,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Hộ gia đình: ${item.data['householdName'] ?? 'Chưa cập nhật'}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item.locality,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: uiMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        _Price(item, large: true),
                        const SizedBox(height: 18),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: item.tags
                              .map(
                                (s) => Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 7,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFFAF0),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: const Color(0xFFFFE4B4),
                                    ),
                                  ),
                                  child: Text(
                                    s,
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: Color(0xFFB7681D),
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      for (final (i, name) in [
                        'Giới thiệu',
                        item.kind == PublicKind.service
                            ? 'Phương thức'
                            : 'Tiện nghi',
                        'Đánh giá',
                        'Vị trí',
                      ].indexed)
                        Expanded(
                          child: InkWell(
                            onTap: () => i == 2
                                ? featureAlert(context, MissingFeature.reviews)
                                : setState(() => tab = i),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    color: tab == i ? uiGreen : uiBorder,
                                    width: tab == i ? 2 : 1,
                                  ),
                                ),
                              ),
                              child: Text(
                                name,
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: tab == i
                                      ? FontWeight.w700
                                      : FontWeight.w400,
                                  color: tab == i ? uiGreen : uiMuted,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (tab == 0) ...[
                          Text(
                            item.data['body']?.toString() ??
                                'Chủ hộ chưa bổ sung mô tả.',
                            style: const TextStyle(
                              fontSize: 12,
                              height: 1.9,
                              color: Color(0xFF52617A),
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              for (final (i, image) in [
                                'bedroom',
                                'valley',
                                'woodhouse',
                              ].indexed) ...[
                                if (i > 0) const SizedBox(width: 8),
                                Expanded(
                                  child: InkWell(
                                    onTap: () => showDialog<void>(
                                      context: context,
                                      builder: (context) => Dialog(
                                        child: Column(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Photo(
                                              image,
                                              height: 280,
                                              width: double.infinity,
                                            ),
                                            const Padding(
                                              padding: EdgeInsets.all(12),
                                              child: Text(
                                                'Ảnh minh họa từ bộ thiết kế',
                                                style: TextStyle(fontSize: 12),
                                              ),
                                            ),
                                            TextButton(
                                              onPressed: () =>
                                                  Navigator.pop(context),
                                              child: const Text('Đóng'),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                    child: Photo(image, height: 92, radius: 12),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Ảnh minh họa · Ảnh thực tế của hộ sẽ được cập nhật sau.',
                            style: TextStyle(fontSize: 9, color: uiMuted),
                          ),
                        ],
                        if (tab == 1) ...[
                          if (item.kind == PublicKind.service)
                            for (final offer in item.offers)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: _Surface(
                                  child: OfferSummary(offer: offer),
                                ),
                              )
                          else ...[
                            for (final s in _strings(
                              object(item.data['details'])['amenities'],
                            ))
                              ListTile(
                                dense: true,
                                leading: const Icon(
                                  Icons.check_circle_outline,
                                  color: uiGreen,
                                ),
                                title: Text(s),
                              ),
                            if (_strings(
                              object(item.data['details'])['amenities'],
                            ).isEmpty)
                              const Text(
                                'Chưa công khai danh sách tiện nghi.',
                                style: TextStyle(color: uiMuted),
                              ),
                            const SizedBox(height: 12),
                            if (item.kind == PublicKind.room)
                              Text(
                                'Nhận phòng ${item.data['checkInTime']} · Trả phòng ${item.data['checkOutTime']}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            for (final s in _strings(
                              object(item.data['details'])['houseRules'],
                            ))
                              Padding(
                                padding: const EdgeInsets.only(top: 10),
                                child: Text(
                                  '• $s',
                                  style: const TextStyle(fontSize: 12),
                                ),
                              ),
                          ],
                        ],
                        if (tab == 3) ...[
                          Text(
                            item.place['title']?.toString() ?? item.title,
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            [
                              item.location['address'],
                              item.location['locality'],
                            ].whereType<String>().join(', '),
                            style: const TextStyle(fontSize: 12, height: 1.7),
                          ),
                          if (item.location['directions'] != null)
                            Text(item.location['directions'].toString()),
                          const SizedBox(height: 14),
                          OutlinedButton.icon(
                            onPressed: () => featureAlert(
                              context,
                              MissingFeature.map,
                              preview: () => _push(
                                context,
                                _ReferenceMap(api: widget.api, selected: item),
                              ),
                            ),
                            icon: const Icon(Icons.map_outlined),
                            label: const Text('Xem bản đồ'),
                          ),
                        ],
                        const _FeatureNote(
                          'Đặt chỗ, lịch trống và đánh giá chưa khả dụng. Bạn có thể liên hệ trực tiếp với hộ.',
                          feature: MissingFeature.booking,
                        ),
                        TextButton.icon(
                          onPressed: () => _contact(context, item),
                          icon: const Icon(Icons.phone_outlined, size: 17),
                          label: const Text('Thông tin liên hệ hộ dân'),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            _BottomActions(
              child: Row(
                children: [
                  _SmallAction(
                    Icons.chat_bubble_outline,
                    'Nhắn tin',
                    () => featureAlert(context, MissingFeature.messages),
                  ),
                  _SmallAction(
                    Icons.favorite_border,
                    'Yêu thích',
                    () => featureAlert(context, MissingFeature.favorites),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _PrimaryButton(
                      item.kind == PublicKind.place ? 'Liên hệ' : 'Đặt ngay',
                      onTap: () => item.kind == PublicKind.place
                          ? _contact(context, item)
                          : featureAlert(
                              context,
                              MissingFeature.booking,
                              preview: () => _push(
                                context,
                                ReferenceBooking(
                                  api: widget.api,
                                  kind: item.kind,
                                  data: item.data,
                                ),
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    ),
  );
}

class _RoundButton extends StatelessWidget {
  const _RoundButton(this.icon, this.title, this.onTap);
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: title,
    onPressed: onTap,
    style: IconButton.styleFrom(
      backgroundColor: Colors.white.withValues(alpha: .95),
      minimumSize: const Size(38, 38),
    ),
    icon: Icon(icon, color: uiInk, size: 20),
  );
}

class _SmallAction extends StatelessWidget {
  const _SmallAction(this.icon, this.title, this.onTap);
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(10),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20, color: uiGreen),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(fontSize: 9, color: uiMuted)),
        ],
      ),
    ),
  );
}

class _BottomActions extends StatelessWidget {
  const _BottomActions({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(
      color: Colors.white,
      border: Border(top: BorderSide(color: uiBorder)),
    ),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: child,
      ),
    ),
  );
}

Future<void> _contact(BuildContext context, _Listing item) => showDialog<void>(
  context: context,
  builder: (context) {
    final phone = item.location['contactPhone']?.toString();
    return AlertDialog(
      title: const Text('Liên hệ hộ dân'),
      content: Text(
        phone == null
            ? 'Hộ chưa công khai số liên hệ.'
            : '${item.data['householdName'] ?? item.title}\n\n$phone\n\nTrao đổi trực tiếp về lịch và điều kiện phục vụ.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Đóng'),
        ),
        if (phone != null)
          FilledButton(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: phone));
              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã sao chép số liên hệ.')),
                );
              }
            },
            child: const Text('Sao chép số liên hệ'),
          ),
      ],
    );
  },
);

class ReferenceBooking extends StatefulWidget {
  const ReferenceBooking({
    super.key,
    required this.api,
    required this.kind,
    required this.data,
  });
  final TourismApi api;
  final PublicKind kind;
  final Json data;
  @override
  State<ReferenceBooking> createState() => _ReferenceBookingState();
}

class _ReferenceBookingState extends State<ReferenceBooking> {
  late final item = _Listing(widget.kind, widget.data);
  late final DateTime today;
  late DateTime month;
  DateTime? start, end;
  int guests = 1, offerIndex = 0, units = 1;
  Json get offer => item.offers.isEmpty ? {} : item.offers[offerIndex];
  int get maxGuests =>
      (item.kind == PublicKind.room
              ? item.data['maxGuests']
              : offer['maxParticipants'])
          as int? ??
      1;
  int get minGuests => (offer['minParticipants'] as int?) ?? 1;
  @override
  void initState() {
    super.initState();
    final now = DateTime.now().toUtc().add(const Duration(hours: 7));
    today = DateTime(now.year, now.month, now.day);
    month = DateTime(today.year, today.month);
    guests = minGuests;
  }

  void selectDate(DateTime date) => setState(() {
    if (item.kind != PublicKind.room) {
      start = date;
      end = date;
    } else if (start == null || end != null || !date.isAfter(start!)) {
      start = date;
      end = null;
    } else {
      end = date;
    }
  });
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        item.kind == PublicKind.room ? 'Đặt phòng' : 'Đặt trải nghiệm',
      ),
    ),
    body: ListView(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
      children: [
        _SummaryCard(item),
        const _FeatureNote(
          'Bản xem bố cục · Chưa kiểm tra còn chỗ và chưa gửi yêu cầu đặt.',
          feature: MissingFeature.availability,
        ),
        _Surface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.kind == PublicKind.room
                    ? 'Chọn ngày lưu trú'
                    : 'Chọn ngày trải nghiệm',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Tháng ${month.month}, ${month.year}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Tháng trước',
                    onPressed: month.isAfter(DateTime(today.year, today.month))
                        ? () => setState(
                            () => month = DateTime(month.year, month.month - 1),
                          )
                        : null,
                    icon: const Icon(Icons.chevron_left, size: 20),
                  ),
                  IconButton(
                    tooltip: 'Tháng sau',
                    onPressed: () => setState(
                      () => month = DateTime(month.year, month.month + 1),
                    ),
                    icon: const Icon(Icons.chevron_right, size: 20),
                  ),
                ],
              ),
              Row(
                children: [
                  for (final s in ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])
                    Expanded(
                      child: Text(
                        s,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 10, color: uiMuted),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7,
                  mainAxisExtent: 42,
                ),
                itemCount:
                    ((month.weekday -
                                1 +
                                DateTime(month.year, month.month + 1, 0).day) /
                            7)
                        .ceil() *
                    7,
                itemBuilder: (context, index) {
                  final day = index - month.weekday + 2,
                      last = DateTime(month.year, month.month + 1, 0).day;
                  if (day < 1 || day > last) return const SizedBox();
                  final date = DateTime(month.year, month.month, day),
                      past = date.isBefore(today);
                  final selected =
                      start != null &&
                      !date.isBefore(start!) &&
                      (end == null ? date == start : !date.isAfter(end!));
                  return Semantics(
                    button: true,
                    selected: selected,
                    label: 'Ngày ${dateText(date)}',
                    child: InkWell(
                      onTap: past ? null : () => selectDate(date),
                      borderRadius: BorderRadius.circular(24),
                      child: Container(
                        alignment: Alignment.center,
                        margin: const EdgeInsets.symmetric(vertical: 3),
                        decoration: BoxDecoration(
                          color: selected ? uiGreen : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '$day',
                          style: TextStyle(
                            fontSize: 11,
                            color: selected
                                ? Colors.white
                                : past
                                ? const Color(0xFFBEC8D4)
                                : uiInk,
                            fontWeight: selected
                                ? FontWeight.w700
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
              const Divider(color: uiBorder),
              const Row(
                children: [
                  Icon(Icons.circle, size: 8, color: uiGreen),
                  SizedBox(width: 6),
                  Text(
                    'Đã chọn',
                    style: TextStyle(fontSize: 9, color: uiMuted),
                  ),
                  Spacer(),
                  Text(
                    'Chưa kiểm tra chỗ trống',
                    style: TextStyle(fontSize: 9, color: uiMuted),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _Surface(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Số lượng khách',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      'Tối đa $maxGuests khách${item.kind == PublicKind.room ? '/phòng' : ''}',
                      style: const TextStyle(fontSize: 10, color: uiMuted),
                    ),
                  ],
                ),
              ),
              _Counter(
                value: guests,
                min: minGuests,
                max: maxGuests,
                onChange: (v) => setState(() => guests = v),
                label: 'Số khách',
              ),
            ],
          ),
        ),
        _SectionTitle(
          item.kind == PublicKind.room
              ? 'Phòng đã chọn'
              : 'Chọn phương thức tham gia',
          action: 'Xem chi tiết',
          onTap: () => Navigator.pop(context),
        ),
        if (item.kind == PublicKind.room)
          _Surface(
            child: Row(
              children: [
                const Photo('room', height: 58, width: 60, radius: 10),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tối đa $maxGuests khách',
                        style: const TextStyle(fontSize: 10, color: uiMuted),
                      ),
                      const SizedBox(height: 5),
                      _Price(item),
                    ],
                  ),
                ),
                const Icon(
                  Icons.radio_button_checked,
                  color: uiGreen,
                  size: 22,
                ),
              ],
            ),
          )
        else
          for (final (i, o) in item.offers.indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _Surface(
                onTap: () => setState(() {
                  offerIndex = i;
                  guests = minGuests;
                  units = 1;
                }),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            o['name'].toString(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${money((o['unitPriceVnd'] as num).toInt())} /${_unit(o)}',
                            style: const TextStyle(
                              color: uiGreen,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${label(o['participationMode'])} · ${o['minParticipants']}–${o['maxParticipants']} khách',
                            style: const TextStyle(
                              fontSize: 10,
                              color: uiMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      i == offerIndex
                          ? Icons.radio_button_checked
                          : Icons.radio_button_unchecked,
                      color: uiGreen,
                      size: 22,
                    ),
                  ],
                ),
              ),
            ),
        if (offer['pricingType'] == 'PER_UNIT')
          _Surface(
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Số ${offer['unitLabel']}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
                _Counter(
                  value: units,
                  min: 1,
                  max: offer['maxUnits'] as int? ?? 1,
                  onChange: (v) => setState(() => units = v),
                  label: 'Số đơn vị',
                ),
              ],
            ),
          ),
      ],
    ),
    bottomNavigationBar: _BottomActions(
      child: _PrimaryButton(
        'Tiếp tục',
        icon: Icons.arrow_forward,
        onTap: () {
          if (start == null || end == null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  item.kind == PublicKind.room
                      ? 'Chọn ngày nhận và ngày trả phòng.'
                      : 'Chọn ngày trải nghiệm.',
                ),
              ),
            );
            return;
          }
          featureAlert(
            context,
            MissingFeature.payment,
            preview: () => _push(
              context,
              ReferenceCheckout(
                api: widget.api,
                kind: item.kind,
                data: item.data,
                start: start!,
                end: end!,
                guests: guests,
                offer: offer,
                units: units,
              ),
            ),
          );
        },
      ),
    ),
  );
}

class _Counter extends StatelessWidget {
  const _Counter({
    required this.value,
    required this.min,
    required this.max,
    required this.onChange,
    required this.label,
  });
  final int value, min, max;
  final ValueChanged<int> onChange;
  final String label;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      IconButton(
        tooltip: 'Giảm $label',
        onPressed: value > min ? () => onChange(value - 1) : null,
        icon: const Icon(Icons.remove_circle_outline, size: 23, color: uiMuted),
      ),
      Text(
        '$value',
        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
      ),
      IconButton(
        tooltip: 'Tăng $label',
        onPressed: value < max ? () => onChange(value + 1) : null,
        icon: const Icon(Icons.add_circle_outline, size: 23, color: uiGreen),
      ),
    ],
  );
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard(this.item, {this.extra});
  final _Listing item;
  final String? extra;
  @override
  Widget build(BuildContext context) => _Surface(
    padding: const EdgeInsets.all(12),
    child: Row(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Photo(
            item.kind == PublicKind.room ? 'pao' : item.image,
            width: 76,
            height: 78,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                item.locality,
                style: const TextStyle(fontSize: 10, color: uiMuted),
              ),
              const SizedBox(height: 6),
              if (extra != null)
                Text(
                  extra!,
                  style: const TextStyle(fontSize: 10, color: uiMuted),
                )
              else
                _Price(item),
            ],
          ),
        ),
      ],
    ),
  );
}

class ReferenceCheckout extends StatelessWidget {
  const ReferenceCheckout({
    super.key,
    required this.api,
    required this.kind,
    required this.data,
    required this.start,
    required this.end,
    required this.guests,
    this.offer = const {},
    this.units = 1,
  });
  final TourismApi api;
  final PublicKind kind;
  final Json data, offer;
  final DateTime start, end;
  final int guests, units;
  int? get total {
    if (kind == PublicKind.room) {
      return (data['nightlyPriceVnd'] as int) * end.difference(start).inDays;
    }
    final quantity = switch (offer['pricingType']) {
      'PER_PERSON' => guests,
      'PER_GROUP' || 'PER_TRIP' || 'FIXED_PACKAGE' => 1,
      'PER_UNIT' => units,
      _ => null,
    };
    return quantity == null ? null : quantity * (offer['unitPriceVnd'] as int);
  }

  @override
  Widget build(BuildContext context) {
    final item = _Listing(kind, data);
    return Scaffold(
      appBar: AppBar(title: const Text('Thanh toán')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          _SectionTitle(
            'Thông tin đặt ${kind == PublicKind.room ? 'phòng' : 'dịch vụ'}',
            action: 'Chỉnh sửa',
            onTap: () => Navigator.pop(context),
          ),
          _SummaryCard(
            item,
            extra:
                '${dateText(start)}${kind == PublicKind.room ? ' – ${dateText(end)}' : ''}\n$guests khách',
          ),
          const _FeatureNote(
            'Thông tin xem thử · Chưa có booking và chưa phát sinh thanh toán.',
            feature: MissingFeature.payment,
          ),
          const _SectionTitle('Thông tin khách hàng'),
          ListenableBuilder(
            listenable: api,
            builder: (context, _) => _Surface(
              onTap: () => api.signedIn
                  ? featureAlert(context, MissingFeature.profile)
                  : openAuthentication(context, api),
              child: Row(
                children: [
                  const CircleAvatar(
                    backgroundColor: Color(0xFFE4EAF2),
                    child: Icon(Icons.person, color: uiMuted),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          api.user?['displayName']?.toString() ??
                              'Đăng nhập để cập nhật',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          api.user?['phone']?.toString() ??
                              'Chưa có số điện thoại',
                          style: const TextStyle(fontSize: 10, color: uiMuted),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 18, color: uiMuted),
                ],
              ),
            ),
          ),
          const _SectionTitle('Mã giảm giá'),
          Row(
            children: [
              Expanded(
                child: TextField(
                  readOnly: true,
                  onTap: () => featureAlert(context, MissingFeature.vouchers),
                  decoration: const InputDecoration(
                    hintText: 'NHẬP MÃ · Chưa hỗ trợ',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton(
                onPressed: () => featureAlert(context, MissingFeature.vouchers),
                style: OutlinedButton.styleFrom(
                  foregroundColor: uiGreen,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Áp dụng'),
              ),
            ],
          ),
          const _SectionTitle('Phương thức thanh toán'),
          _Surface(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                _paymentRow(
                  context,
                  'Ví điện tử (MoMo, ZaloPay)',
                  'Ngoài MVP',
                  Icons.account_balance_wallet,
                  const Color(0xFFAB0065),
                ),
                const Divider(height: 1, color: uiBorder),
                _paymentRow(
                  context,
                  'Thẻ ngân hàng',
                  'Ngoài MVP',
                  Icons.credit_card,
                  const Color(0xFF03ABE2),
                ),
                const Divider(height: 1, color: uiBorder),
                _paymentRow(
                  context,
                  'Thanh toán trực tiếp',
                  'Thỏa thuận với hộ dân',
                  Icons.payments,
                  const Color(0xFF009C73),
                  cash: true,
                ),
              ],
            ),
          ),
          const _SectionTitle('Chi tiết thanh toán'),
          _Surface(
            child: Column(
              children: [
                _amountRow(
                  'Giá dự kiến',
                  total == null ? 'Cần xác nhận thời lượng' : money(total!),
                ),
                const SizedBox(height: 12),
                _amountRow('Giảm giá', 'Chưa áp dụng'),
                const Divider(height: 26, color: uiBorder),
                _amountRow(
                  'Tổng dự kiến',
                  total == null ? 'Liên hệ hộ' : money(total!),
                  strong: true,
                ),
                const SizedBox(height: 10),
                const Text(
                  'Giá tham khảo theo cấu hình đang công khai, chưa phải báo giá được hộ xác nhận.',
                  style: TextStyle(fontSize: 10, color: uiMuted, height: 1.6),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _BottomActions(
        child: _PrimaryButton(
          'Thanh toán',
          icon: Icons.lock_outline,
          onTap: () => featureAlert(context, MissingFeature.payment),
        ),
      ),
    );
  }

  Widget _paymentRow(
    BuildContext context,
    String title,
    String subtitle,
    IconData icon,
    Color color, {
    bool cash = false,
  }) => ListTile(
    onTap: () => featureAlert(
      context,
      cash ? MissingFeature.payment : MissingFeature.gateway,
    ),
    leading: Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: Colors.white, size: 18),
    ),
    title: Text(title, style: const TextStyle(fontSize: 11)),
    subtitle: Text(
      subtitle,
      style: const TextStyle(fontSize: 9, color: uiMuted),
    ),
    trailing: Icon(
      cash ? Icons.radio_button_checked : Icons.radio_button_unchecked,
      size: 21,
      color: cash ? uiGreen : const Color(0xFFCCD7E6),
    ),
  );
  Widget _amountRow(String title, String value, {bool strong = false}) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: TextStyle(
            fontSize: 12,
            fontWeight: strong ? FontWeight.w700 : FontWeight.w400,
          ),
        ),
      ),
      Text(
        value,
        style: TextStyle(
          fontSize: strong ? 15 : 12,
          fontWeight: FontWeight.w700,
          color: strong ? uiGreen : uiInk,
        ),
      ),
    ],
  );
}
