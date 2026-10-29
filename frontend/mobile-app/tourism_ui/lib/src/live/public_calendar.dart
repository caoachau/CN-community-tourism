import 'package:flutter/material.dart';

import 'api.dart';
import 'common.dart';
import 'calendar.dart';

class PublicCalendarPanel extends StatefulWidget {
  const PublicCalendarPanel({
    super.key,
    required this.api,
    required this.kind,
    required this.id,
  });
  final TourismApi api;
  final String kind, id;
  @override
  State<PublicCalendarPanel> createState() => _PublicCalendarPanelState();
}

class _PublicCalendarPanelState extends State<PublicCalendarPanel> {
  Json? result;
  bool get room => widget.kind == 'rooms';
  Future<void> check() async {
    final tomorrow = DateTime.now().toUtc().add(
      const Duration(hours: 7, days: 1),
    );
    final data = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: room ? 'Kiểm tra phòng trống' : 'Xem khung giờ phục vụ',
          action: 'Kiểm tra lịch',
          memberOnly: false,
          fields: [
            FieldSpec(
              'fromDay',
              room ? 'Ngày nhận phòng' : 'Từ ngày',
              required: true,
              pattern: r'^\d{4}-\d{2}-\d{2}$',
              hint: 'Năm-tháng-ngày, ví dụ 2026-11-01.',
            ),
            FieldSpec(
              'toDay',
              room ? 'Ngày trả phòng' : 'Đến ngày',
              required: true,
              pattern: r'^\d{4}-\d{2}-\d{2}$',
            ),
            FieldSpec(
              'participants',
              'Số khách',
              kind: InputKind.integer,
              required: true,
              min: 1,
              max: room ? 1000 : 100000,
            ),
            if (!room)
              const FieldSpec(
                'units',
                'Số đơn vị muốn thuê',
                kind: InputKind.integer,
                required: true,
                min: 1,
                max: 100000,
                hint: 'Dùng cho phương thức bán theo đơn vị, ví dụ xe hoặc thuyền.',
              ),
          ],
          initial: {
            'fromDay': calendarDay(tomorrow),
            'toDay': calendarDay(tomorrow.add(Duration(days: room ? 1 : 30))),
            'participants': 1,
            'units': 1,
          },
          description: 'Kết quả theo lịch hiện tại, chưa giữ chỗ. Hộ dân có thể cập nhật lịch trước khi xác nhận yêu cầu của bạn.',
          save: (input) => widget.api.request(
            'GET',
            '/public/${widget.kind}/${widget.id}/${room ? 'availability' : 'slots'}',
            authenticated: false,
            query: room
                ? {
                    'checkInDate': input['fromDay'],
                    'checkOutDate': input['toDay'],
                    'guests': input['participants'],
                  }
                : {
                    'from': localInstant({
                      'startDay': input['fromDay'],
                      'startTime': '00:00',
                    }, 'start'),
                    'to': localInstant({
                      'endDay': input['toDay'],
                      'endTime': '23:59',
                    }, 'end'),
                    'participants': input['participants'],
                    'units': input['units'],
                    'pageSize': 100,
                  },
          ),
        ),
      ),
    );
    if (data != null && mounted) setState(() => result = data);
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      OutlinedButton.icon(
        onPressed: check,
        icon: const Icon(Icons.calendar_month_outlined),
        label: const Text('Lịch trống và sức chứa'),
      ),
      if (result != null) ...[
        if (room)
          Notice(
            result!['available'] == true
                ? 'Phòng còn trống cho khoảng ngày đã chọn. Chưa giữ chỗ.'
                : switch (result!['reason']) {
                    'CAPACITY' => 'Số khách vượt sức chứa của phòng.',
                    'PAST' => 'Thời gian nhận phòng đã qua.',
                    _ => 'Phòng đang được sử dụng hoặc có lịch chặn trong khoảng ngày này.',
                  },
          )
        else ...[
          if (records(result!['items']).isEmpty)
            const Notice(
              'Chưa có khung giờ công khai trong khoảng ngày đã chọn.',
            ),
          for (final slot in records(result!['items']))
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                '${calendarTime(slot['startsAt'])} → ${calendarTime(slot['endsAt'])}',
              ),
              subtitle: Text(
                slot['available'] == true
                    ? 'Còn ${slot['remainingCapacity']} chỗ · Chưa giữ chỗ'
                    : 'Chưa đủ sức chứa hoặc điều kiện cho nhóm đã chọn',
              ),
            ),
        ],
      ],
    ],
  );
}
