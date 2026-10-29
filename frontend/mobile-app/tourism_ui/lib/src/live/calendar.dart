import 'package:flutter/material.dart';

import 'api.dart';
import 'common.dart';

const calendarRoot = '/households/me/calendar';

class _CalendarAccess extends StatelessWidget {
  const _CalendarAccess({
    required this.api,
    required this.epoch,
    required this.page,
  });
  final TourismApi api;
  final int epoch;
  final Widget Function() page;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: api,
    builder: (context, _) {
      if (!api.isHousehold || api.epoch != epoch) {
        return Scaffold(
          appBar: AppBar(title: const Text('Lịch và sức chứa')),
          body: const EmptyPanel(
            'Phiên đã thay đổi. Đăng nhập bằng tài khoản hộ dân và mở lại lịch để tiếp tục.',
          ),
        );
      }
      return page();
    },
  );
}

String calendarDay(DateTime day) =>
    '${day.year}-${day.month.toString().padLeft(2, '0')}-${day.day.toString().padLeft(2, '0')}';
String calendarTime(dynamic value) {
  if (value == null) return 'Không giới hạn';
  final day = DateTime.parse(value.toString())
      .toUtc()
      .add(const Duration(hours: 7));
  return '${calendarDay(day)} ${day.hour.toString().padLeft(2, '0')}:${day.minute.toString().padLeft(2, '0')}';
}

String localInstant(Json value, String prefix) {
  final day = value['${prefix}Day'] as String,
      time = value['${prefix}Time'] as String;
  final date = DateTime.tryParse('${day}T$time:00+07:00');
  if (date == null ||
      calendarDay(date.toUtc().add(const Duration(hours: 7))) != day) {
    throw const ApiFailure('VALIDATION_ERROR');
  }
  return date.toUtc().toIso8601String();
}

Json timeInitial(Json value) {
  final now = DateTime.now().toUtc().add(const Duration(hours: 7));
  final next = DateTime.utc(now.year, now.month, now.day, now.hour + 1),
      later = next.add(const Duration(hours: 2));
  final start = value['startsAt'] == null
      ? '${calendarDay(next)} ${next.hour.toString().padLeft(2, '0')}:00'
      : calendarTime(value['startsAt']);
  final end = value['endsAt'] == null
      ? '${calendarDay(later)} ${later.hour.toString().padLeft(2, '0')}:00'
      : calendarTime(value['endsAt']);
  return {
    'startDay': start.substring(0, 10),
    'startTime': start.substring(11),
    'endDay': end.substring(0, 10),
    'endTime': end.substring(11),
  };
}

const calendarTimeFields = [
  FieldSpec(
    'startDay',
    'Ngày bắt đầu',
    required: true,
    pattern: r'^\d{4}-\d{2}-\d{2}$',
    hint: 'Năm-tháng-ngày, ví dụ 2026-11-01.',
  ),
  FieldSpec('startTime', 'Giờ bắt đầu', kind: InputKind.time, required: true),
  FieldSpec(
    'endDay',
    'Ngày kết thúc',
    required: true,
    pattern: r'^\d{4}-\d{2}-\d{2}$',
  ),
  FieldSpec('endTime', 'Giờ kết thúc', kind: InputKind.time, required: true),
];
const calendarReason = FieldSpec(
  'reason',
  'Lý do thay đổi',
  required: true,
  maxLength: 1000,
);
Json calendarConfiguration(Json slot) => {
  for (final key in [
    'serviceId',
    'placeId',
    'startsAt',
    'endsAt',
    'personCapacity',
    'visibility',
    'salesStatus',
    'readinessStatus',
    'readinessNote',
    'offers',
    'assignments',
  ])
    key: slot[key],
};

class CalendarPage extends StatefulWidget {
  const CalendarPage({super.key, required this.api});
  final TourismApi api;
  @override
  State<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends State<CalendarPage> {
  late final int sessionEpoch = widget.api.epoch;
  int tab = 0, page = 1;
  bool history = false;
  DateTime from = DateTime.now().toUtc().add(const Duration(hours: 7));
  late DateTime to = from.add(const Duration(days: 30));
  late Future<Json> future;
  String get kind => ['slots', 'resources', 'blocks'][tab];
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    if (!widget.api.isHousehold) {
      future = Future.value({'items': [], 'total': 0});
      return;
    }
    future = widget.api.request(
      'GET',
      '$calendarRoot/$kind',
      query: {
        'page': page,
        'pageSize': 20,
        if (tab != 1) ...{
          'from': '${calendarDay(from)}T00:00:00+07:00',
          'to':
              '${calendarDay(to.add(const Duration(days: 1)))}T00:00:00+07:00',
        },
        tab == 2 ? 'includeReleased' : 'includeArchived': history,
      },
    );
  }

  Future<void> range() async {
    final result = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2099),
      initialDateRange: DateTimeRange(start: from, end: to),
    );
    if (result != null && mounted) {
      setState(() {
        from = result.start;
        to = result.end;
        page = 1;
        load();
      });
    }
  }

  Future<void> form(
    String title,
    List<FieldSpec> fields,
    Json initial,
    Future<Json> Function(Json) save,
  ) async {
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: title,
          action: 'Lưu thay đổi',
          fields: fields,
          initial: initial,
          save: save,
          description: 'Thời gian theo giờ Việt Nam. Các cam kết đã xác nhận và giữ chỗ còn hạn được giữ nguyên.',
        ),
      ),
    );
    if (result != null && mounted) setState(load);
  }

  Future<void> edit(Json? row) async {
    if (tab == 0) {
      if (row != null) {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                CalendarSlotPage(api: widget.api, id: row['id'] as String),
          ),
        );
        if (mounted) setState(load);
        return;
      }
      await form(
        'Tạo khung giờ',
        [
          const FieldSpec(
            'serviceId',
            'Dịch vụ',
            kind: InputKind.reference,
            required: true,
            source: ReferenceSource('/households/me/services', root: 'service'),
          ),
          ...calendarTimeFields,
          const FieldSpec(
            'personCapacity',
            'Sức chứa (người)',
            kind: InputKind.integer,
            required: true,
            min: 1,
            max: 100000,
          ),
        ],
        {...timeInitial({}), 'personCapacity': 10},
        (input) => widget.api.request(
          'POST',
          '$calendarRoot/slots',
          body: {
            'serviceId': input['serviceId'],
            'startsAt': localInstant(input, 'start'),
            'endsAt': localInstant(input, 'end'),
            'personCapacity': input['personCapacity'],
          },
        ),
      );
    } else if (tab == 1) {
      await form(
        row == null ? 'Thêm tài nguyên' : 'Sửa tài nguyên',
        [
          if (row == null) ...const [
            FieldSpec('code', 'Mã tài nguyên', required: true, maxLength: 40),
            FieldSpec(
              'resourceType',
              'Loại tài nguyên',
              kind: InputKind.choice,
              required: true,
              choices: {
                'POOL': 'Nhóm thiết bị',
                'SINGLE': 'Một tài nguyên riêng',
              },
            ),
          ],
          const FieldSpec(
            'name',
            'Tên tài nguyên',
            required: true,
            maxLength: 150,
          ),
          const FieldSpec(
            'totalQuantity',
            'Tổng số lượng',
            kind: InputKind.integer,
            required: true,
            min: 1,
            max: 100000,
          ),
          const FieldSpec(
            'maxPeoplePerUnit',
            'Số người tối đa mỗi đơn vị',
            kind: InputKind.integer,
            min: 1,
            max: 1000,
          ),
          const FieldSpec(
            'supplyContact',
            'Thông tin liên hệ',
            maxLength: 1000,
          ),
          if (row != null) calendarReason,
        ],
        row ??
            {
              'code': 'RES_${DateTime.now().millisecondsSinceEpoch}',
              'resourceType': 'POOL',
              'totalQuantity': 1,
            },
        (input) => widget.api.request(
          row == null ? 'POST' : 'PUT',
          '$calendarRoot/resources${row == null ? '' : '/${row['id']}'}',
          body: {
            ...input,
            'maxPeoplePerUnit': input['maxPeoplePerUnit'],
            'supplyContact': input['supplyContact'],
            if (row != null) 'expectedToken': row['token'],
          },
        ),
      );
    } else {
      await form(
        row == null ? 'Thêm lịch chặn' : 'Sửa lịch chặn',
        [
          if (row == null) ...const [
            FieldSpec(
              'target',
              'Chặn cho',
              kind: InputKind.choice,
              required: true,
              choices: {'ROOM': 'Phòng lưu trú', 'RESOURCE': 'Tài nguyên'},
            ),
            FieldSpec(
              'roomId',
              'Phòng lưu trú',
              kind: InputKind.reference,
              source: ReferenceSource('/households/me/rooms', root: 'room'),
              required: true,
              showWhenKey: 'target',
              showWhenValue: 'ROOM',
            ),
            FieldSpec(
              'resourceId',
              'Tài nguyên',
              kind: InputKind.reference,
              source: ReferenceSource('$calendarRoot/resources'),
              required: true,
              showWhenKey: 'target',
              showWhenValue: 'RESOURCE',
            ),
          ],
          ...calendarTimeFields,
          const FieldSpec(
            'indefinite',
            'Chặn đến khi được gỡ',
            kind: InputKind.toggle,
          ),
          const FieldSpec(
            'quantity',
            'Số lượng chặn',
            kind: InputKind.integer,
            required: true,
            min: 1,
            max: 100000,
          ),
          calendarReason,
        ],
        {
          ...row ?? {},
          ...timeInitial(row ?? {}),
          'target': row?['roomId'] != null ? 'ROOM' : 'RESOURCE',
          'quantity': row?['quantity'] ?? 1,
          'indefinite': row != null && row['endsAt'] == null,
        },
        (input) => widget.api.request(
          row == null ? 'POST' : 'PUT',
          '$calendarRoot/blocks${row == null ? '' : '/${row['id']}'}',
          body: {
            'roomId': row?['roomId'] ?? input['roomId'],
            'resourceId': row?['resourceId'] ?? input['resourceId'],
            'startsAt': localInstant(input, 'start'),
            'endsAt': input['indefinite'] == true
                ? null
                : localInstant(input, 'end'),
            'quantity': input['quantity'],
            'reason': input['reason'],
            if (row != null) 'expectedToken': row['token'],
          },
        ),
      );
    }
  }

  Future<void> remove(Json row) async {
    final reason = await askReason(
      context,
      tab == 2 ? 'Gỡ lịch chặn' : 'Lưu trữ tài nguyên',
    );
    if (reason == null) return;
    try {
      await widget.api.request(
        'DELETE',
        '$calendarRoot/$kind/${row['id']}',
        body: {'expectedToken': row['token'], 'reason': reason},
      );
      if (mounted) setState(load);
    } catch (error) {
      if (mounted) {
        showDialog<void>(
          context: context,
          builder: (_) => AlertDialog(content: ErrorPanel(error)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => _CalendarAccess(
    api: widget.api,
    epoch: sessionEpoch,
    page: () => buildPage(context),
  );
  Widget buildPage(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Lịch và sức chứa'),
      actions: [
        IconButton(
          tooltip: 'Tải lại lịch',
          onPressed: () => setState(load),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: SegmentedButton<int>(
            segments: const [
              ButtonSegment(value: 0, label: Text('Khung giờ')),
              ButtonSegment(value: 1, label: Text('Tài nguyên')),
              ButtonSegment(value: 2, label: Text('Lịch chặn')),
            ],
            selected: {tab},
            onSelectionChanged: (value) => setState(() {
              tab = value.first;
              page = 1;
              history = false;
              load();
            }),
          ),
        ),
        if (tab != 1)
          TextButton.icon(
            onPressed: range,
            icon: const Icon(Icons.date_range),
            label: Text('${calendarDay(from)} → ${calendarDay(to)}'),
          ),
        SwitchListTile(
          title: Text(
            tab == 2 ? 'Hiện lịch chặn đã gỡ' : 'Hiện mục đã lưu trữ',
          ),
          value: history,
          onChanged: (value) => setState(() {
            history = value;
            page = 1;
            load();
          }),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: FilledButton.icon(
            onPressed: () => edit(null),
            icon: const Icon(Icons.add),
            label: Text(
              ['Tạo khung giờ', 'Thêm tài nguyên', 'Thêm lịch chặn'][tab],
            ),
          ),
        ),
        Expanded(
          child: FutureBuilder<Json>(
            future: future,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return ErrorPanel(snapshot.error!, retry: () => setState(load));
              }
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final data = snapshot.data!, rows = records(data['items']);
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (rows.isEmpty)
                    const EmptyPanel(
                      'Chưa có dữ liệu trong khoảng thời gian đã chọn.',
                    ),
                  for (final row in rows)
                    Card(
                      child: ListTile(
                        title: Text(
                          tab == 0
                              ? '${calendarTime(row['startsAt'])} · ${row['personCapacity']} người'
                              : tab == 1
                              ? '${row['name']} · ${row['totalQuantity']} đơn vị'
                              : '${row['roomId'] != null ? 'Phòng #${row['roomId']}' : 'Tài nguyên #${row['resourceId']}'} · ${row['quantity']} đơn vị',
                        ),
                        subtitle: Text(
                          tab == 0
                              ? 'Đến ${calendarTime(row['endsAt'])} · ${calendarStatus(row['salesStatus'])}'
                              : tab == 1
                              ? 'Mã: ${row['code']}${row['archivedAt'] != null ? ' · Đã lưu trữ' : ''}'
                              : '${calendarTime(row['startsAt'])} → ${calendarTime(row['endsAt'])}\n${row['reason']}${row['releasedAt'] != null ? ' · Đã gỡ' : ''}',
                        ),
                        isThreeLine: tab == 2,
                        onTap:
                            tab != 0 &&
                                (row['archivedAt'] != null ||
                                    row['releasedAt'] != null)
                            ? null
                            : () => edit(row),
                        trailing: tab == 0
                            ? const Icon(Icons.chevron_right)
                            : IconButton(
                                tooltip: tab == 2
                                    ? 'Gỡ lịch chặn'
                                    : 'Lưu trữ tài nguyên',
                                onPressed:
                                    row['archivedAt'] != null ||
                                        row['releasedAt'] != null
                                    ? null
                                    : () => remove(row),
                                icon: const Icon(Icons.delete_outline),
                              ),
                      ),
                    ),
                  PageButtons(
                    page: page,
                    total: data['total'] as int,
                    onPage: (value) => setState(() {
                      page = value;
                      load();
                    }),
                  ),
                ],
              );
            },
          ),
        ),
      ],
    ),
  );
}

String calendarStatus(dynamic value) =>
    const {
      'DRAFT': 'Bản nháp',
      'OPEN': 'Đang mở',
      'CLOSED': 'Đã đóng',
      'CANCELLED': 'Đã hủy',
      'CONFIRMED': 'Đã xác nhận',
      'AWAITING_CONFIRMATION': 'Chờ xác nhận',
      'UNAVAILABLE': 'Chưa sẵn sàng',
    }[value] ??
    '$value';

class CalendarSlotPage extends StatefulWidget {
  const CalendarSlotPage({super.key, required this.api, required this.id});
  final TourismApi api;
  final String id;
  @override
  State<CalendarSlotPage> createState() => _CalendarSlotPageState();
}

class _CalendarSlotPageState extends State<CalendarSlotPage> {
  late final int sessionEpoch = widget.api.epoch;
  late Future<Json> future;
  String get path => '$calendarRoot/slots/${widget.id}';
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    if (!widget.api.isHousehold) {
      future = Future.value({'slot': {}});
      return;
    }
    future = widget.api.request('GET', path);
  }

  Future<void> safe(Future<void> Function() work) async {
    try {
      await work();
    } catch (error) {
      if (mounted) {
        showDialog<void>(
          context: context,
          builder: (_) => AlertDialog(content: ErrorPanel(error)),
        );
      }
    }
  }

  Future<void> form(
    String title,
    Json slot,
    List<FieldSpec> fields,
    Json initial,
    Json Function(Json) configuration,
  ) async {
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: title,
          action: 'Lưu thay đổi',
          fields: [...fields, calendarReason],
          initial: initial,
          save: (input) => widget.api.request(
            'PUT',
            path,
            body: {
              ...calendarConfiguration(slot),
              ...configuration(input),
              'expectedToken': slot['token'],
              'reason': input['reason'],
            },
          ),
        ),
      ),
    );
    if (result != null && mounted) setState(load);
  }

  Future<void> settings(Json slot) => form(
    'Sửa khung giờ',
    slot,
    [
      ...calendarTimeFields,
      const FieldSpec(
        'personCapacity',
        'Sức chứa (người)',
        kind: InputKind.integer,
        required: true,
        min: 1,
        max: 100000,
      ),
      const FieldSpec(
        'visibility',
        'Hiển thị',
        kind: InputKind.choice,
        required: true,
        choices: {'PUBLIC': 'Công khai', 'PRIVATE': 'Lịch riêng'},
      ),
      const FieldSpec(
        'salesStatus',
        'Tình trạng mở bán',
        kind: InputKind.choice,
        required: true,
        choices: {
          'DRAFT': 'Bản nháp',
          'OPEN': 'Đang mở',
          'CLOSED': 'Đã đóng',
          'CANCELLED': 'Hủy khung giờ',
        },
      ),
      const FieldSpec(
        'readinessStatus',
        'Sẵn sàng phục vụ',
        kind: InputKind.choice,
        required: true,
        choices: {
          'AWAITING_CONFIRMATION': 'Chờ xác nhận',
          'CONFIRMED': 'Đã xác nhận',
          'UNAVAILABLE': 'Chưa sẵn sàng',
        },
      ),
      const FieldSpec(
        'readinessNote',
        'Ghi chú sẵn sàng',
        kind: InputKind.paragraph,
        maxLength: 1000,
      ),
    ],
    {...slot, ...timeInitial(slot)},
    (input) => {
      'startsAt': localInstant(input, 'start'),
      'endsAt': localInstant(input, 'end'),
      'personCapacity': input['personCapacity'],
      'visibility': input['visibility'],
      'salesStatus': input['salesStatus'],
      'readinessStatus': input['readinessStatus'],
      'readinessNote': input['readinessNote'],
    },
  );
  Future<void> offer(Json slot, [Json? current]) async {
    final data = await widget.api.request(
      'GET',
      '/households/me/services/${slot['serviceId']}',
    );
    if (!mounted) return;
    final offers = records(data['offers']);
    await form(
      'Phương thức bán theo lịch',
      slot,
      [
        FieldSpec(
          'offerId',
          'Phương thức bán',
          kind: InputKind.choice,
          required: true,
          choices: {
            for (final o in offers) o['id'] as String: o['name'] as String,
          },
        ),
        const FieldSpec(
          'isEnabled',
          'Cho phép bán trong lịch này',
          kind: InputKind.toggle,
        ),
        const FieldSpec(
          'priceOverrideVnd',
          'Giá riêng của khung giờ (VND)',
          kind: InputKind.integer,
          hint: 'Để trống để dùng giá hiện hành của dịch vụ.',
        ),
      ],
      current ?? {'isEnabled': true},
      (input) => {
        'offers': [
          ...records(slot['offers'])
              .where((o) => o['offerId'] != input['offerId']),
          {
            'offerId': input['offerId'],
            'isEnabled': input['isEnabled'] ?? false,
            'priceOverrideVnd': input['priceOverrideVnd'],
          },
        ],
      },
    );
  }

  Future<void> assignment(Json slot) async {
    await form(
      'Phân bổ tài nguyên',
      slot,
      const [
        FieldSpec(
          'resourceId',
          'Tài nguyên',
          kind: InputKind.reference,
          required: true,
          source: ReferenceSource('$calendarRoot/resources'),
        ),
        FieldSpec(
          'quantity',
          'Số lượng dành cho lịch',
          kind: InputKind.integer,
          required: true,
          min: 1,
          max: 100000,
        ),
        FieldSpec(
          'allocationMode',
          'Cách phân bổ',
          kind: InputKind.choice,
          required: true,
          choices: {
            'SESSION_SHARED': 'Dùng chung cả buổi',
            'PER_BOOKING_QUOTA': 'Chia theo từng đặt chỗ',
          },
        ),
        FieldSpec(
          'usageBasis',
          'Mức sử dụng',
          kind: InputKind.choice,
          required: true,
          choices: {
            'SHARED_ONCE': 'Dùng chung một lần',
            'PER_PERSON': 'Theo người',
            'PER_UNIT': 'Theo đơn vị bán',
            'FIXED': 'Cố định mỗi đặt chỗ',
          },
        ),
        FieldSpec(
          'unitsRequired',
          'Số đơn vị cần dùng',
          kind: InputKind.integer,
          required: true,
          min: 1,
          max: 100000,
        ),
        FieldSpec(
          'preparationMinutes',
          'Chuẩn bị trước (phút)',
          kind: InputKind.integer,
          required: true,
          min: 0,
          max: 10080,
        ),
        FieldSpec(
          'cleanupMinutes',
          'Dọn dẹp sau (phút)',
          kind: InputKind.integer,
          required: true,
          min: 0,
          max: 10080,
        ),
      ],
      {
        'quantity': 1,
        'unitsRequired': 1,
        'allocationMode': 'SESSION_SHARED',
        'usageBasis': 'SHARED_ONCE',
        'preparationMinutes': 0,
        'cleanupMinutes': 0,
      },
      (input) => {
        'assignments': [
          ...records(slot['assignments'])
              .where((a) => a['resourceId'] != input['resourceId']),
          {
            'resourceId': input['resourceId'],
            'quantity': input['quantity'],
            'allocationMode': input['allocationMode'],
            'preparationMinutes': input['preparationMinutes'],
            'cleanupMinutes': input['cleanupMinutes'],
            'note': null,
            'rules': [
              for (final o in records(
                slot['offers'],
              ).where((o) => o['isEnabled'] == true))
                {
                  'offerId': o['offerId'],
                  'usageBasis': input['usageBasis'],
                  'unitsRequired': input['unitsRequired'],
                  'maxPeoplePerUnit': null,
                },
            ],
          },
        ],
      },
    );
  }

  Future<void> remove(Json slot) async {
    final reason = await askReason(
      context,
      'Lưu trữ khung giờ',
      description:
          'Không thể lưu trữ khi còn cam kết phục vụ hoặc giữ chỗ còn hạn.',
    );
    if (reason == null) return;
    try {
      await widget.api.request(
        'DELETE',
        path,
        body: {'expectedToken': slot['token'], 'reason': reason},
      );
      if (mounted) setState(load);
    } catch (error) {
      if (mounted) {
        showDialog<void>(
          context: context,
          builder: (_) => AlertDialog(content: ErrorPanel(error)),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => _CalendarAccess(
    api: widget.api,
    epoch: sessionEpoch,
    page: () => buildPage(context),
  );
  Widget buildPage(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Chi tiết khung giờ'),
      actions: [
        IconButton(
          tooltip: 'Tải lại khung giờ',
          onPressed: () => setState(load),
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: FutureBuilder<Json>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return ErrorPanel(snapshot.error!, retry: () => setState(load));
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data!,
            slot = object(data['slot']),
            archived = slot['archivedAt'] != null,
            immutable = archived || slot['salesStatus'] == 'CANCELLED';
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              '${calendarTime(slot['startsAt'])}\n→ ${calendarTime(slot['endsAt'])}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            Text(
              '${calendarStatus(slot['salesStatus'])} · ${calendarStatus(slot['readinessStatus'])}',
            ),
            Text(
              'Sức chứa: ${slot['personCapacity']} người · Đang giữ/đã đặt: ${data['occupiedPeople']} người',
            ),
            if (data['hasExclusiveReservation'] == true)
              const Notice('Khung giờ đã có cam kết thuê riêng.'),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: immutable ? null : () => settings(slot),
              child: const Text('Sửa khung giờ và sức chứa'),
            ),
            OutlinedButton(
              onPressed: immutable ? null : () => safe(() => offer(slot)),
              child: const Text('Phương thức bán theo lịch'),
            ),
            for (final o in records(slot['offers']))
              ListTile(
                onTap: immutable ? null : () => safe(() => offer(slot, o)),
                title: Text('Phương thức #${o['offerId']}'),
                subtitle: Text(
                  '${o['isEnabled'] == true ? 'Đang bật' : 'Đã tắt'} · ${o['priceOverrideVnd'] ?? 'Giá hiện hành'}',
                ),
              ),
            OutlinedButton(
              onPressed: immutable ? null : () => assignment(slot),
              child: const Text('Phân bổ tài nguyên'),
            ),
            for (final a in records(slot['assignments']))
              ListTile(
                title: Text(
                  'Tài nguyên #${a['resourceId']} · ${a['quantity']} đơn vị',
                ),
                subtitle: Text(
                  'Chuẩn bị ${a['preparationMinutes']} phút · Dọn ${a['cleanupMinutes']} phút',
                ),
                trailing: IconButton(
                  tooltip: 'Gỡ phân bổ',
                  onPressed: immutable
                      ? null
                      : () => form(
                          'Gỡ phân bổ tài nguyên',
                          slot,
                          [],
                          {},
                          (_) => {
                            'assignments': records(slot['assignments'])
                                .where(
                                  (item) =>
                                      item['resourceId'] != a['resourceId'],
                                )
                                .toList(),
                          },
                        ),
                  icon: const Icon(Icons.remove_circle_outline),
                ),
              ),
            const Notice(
              'Để mở bán: dịch vụ và điểm phải được duyệt, có phương thức bán hợp lệ và đã xác nhận sẵn sàng. Thời gian chuẩn bị/dọn dẹp cũng giữ tài nguyên.',
            ),
            TextButton(
              onPressed: archived ? null : () => remove(slot),
              child: Text(archived ? 'Đã lưu trữ' : 'Lưu trữ khung giờ'),
            ),
          ],
        );
      },
    ),
  );
}
