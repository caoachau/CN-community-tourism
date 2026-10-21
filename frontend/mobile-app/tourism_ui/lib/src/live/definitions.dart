import 'api.dart';
import 'common.dart';

enum ResourceKind {
  place('places', 'place', 'Điểm phục vụ'),
  room('rooms', 'room', 'Phòng lưu trú'),
  service('services', 'service', 'Dịch vụ / trải nghiệm');

  const ResourceKind(this.path, this.root, this.title);
  final String path, root, title;
  String get endpoint => '/households/me/$path';
}

const profileFields = [
  FieldSpec('title', 'Tên giới thiệu', required: true, maxLength: 200),
  FieldSpec(
    'body',
    'Mô tả',
    kind: InputKind.paragraph,
    maxLength: 20000,
    hint: 'Khi gửi duyệt: tên ít nhất 3 ký tự, mô tả ít nhất 20 ký tự.',
  ),
];
const householdFields = [
  ...profileFields,
  FieldSpec('details.address', 'Địa chỉ', maxLength: 500),
  FieldSpec('details.locality', 'Địa phương', maxLength: 200),
  FieldSpec(
    'details.contactPhone',
    'Số liên hệ',
    kind: InputKind.phone,
    maxLength: 32,
  ),
  FieldSpec('details.zaloContact', 'Liên hệ Zalo', maxLength: 200),
  FieldSpec(
    'details.introductionSections',
    'Các phần giới thiệu',
    kind: InputKind.sections,
    maxItems: 20,
  ),
];
List<FieldSpec> resourceFields(ResourceKind kind, {bool create = false}) => [
  ...profileFields,
  if (kind == ResourceKind.place) ...const [
    FieldSpec('details.address', 'Địa chỉ', maxLength: 500),
    FieldSpec('details.locality', 'Địa phương', maxLength: 200),
    FieldSpec(
      'details.contactPhone',
      'Số liên hệ',
      kind: InputKind.phone,
      maxLength: 32,
    ),
    FieldSpec(
      'details.directions',
      'Chỉ dẫn đường đi',
      kind: InputKind.paragraph,
      maxLength: 4000,
    ),
    FieldSpec(
      'latitude',
      'Vĩ độ',
      kind: InputKind.decimal,
      min: -90,
      max: 90,
      hint: 'Để trống cả vĩ độ và kinh độ nếu chưa xác định.',
    ),
    FieldSpec(
      'longitude',
      'Kinh độ',
      kind: InputKind.decimal,
      min: -180,
      max: 180,
    ),
  ],
  if (kind == ResourceKind.room) ...[
    const FieldSpec(
      'placeId',
      'Điểm lưu trú',
      kind: InputKind.reference,
      source: ReferenceSource('/households/me/places', root: 'place'),
      hint: 'Khi gửi duyệt, điểm phải được duyệt và đang cung cấp.',
    ),
    const FieldSpec(
      'maxGuests',
      'Số khách tối đa mỗi phòng',
      kind: InputKind.integer,
      required: true,
      min: 1,
      max: 1000,
    ),
    if (create)
      const FieldSpec(
        'nightlyPriceVnd',
        'Giá một phòng / một đêm (VND)',
        kind: InputKind.integer,
        required: true,
      ),
    const FieldSpec(
      'checkInTime',
      'Giờ nhận phòng',
      kind: InputKind.time,
      required: true,
      hint: 'Giờ Việt Nam, định dạng HH:mm.',
    ),
    const FieldSpec(
      'checkOutTime',
      'Giờ trả phòng',
      kind: InputKind.time,
      required: true,
    ),
    const FieldSpec(
      'details.amenities',
      'Tiện nghi',
      kind: InputKind.lines,
      maxItems: 50,
      hint: 'Mỗi tiện nghi một dòng.',
    ),
    const FieldSpec('details.houseRules', 'Nội quy', kind: InputKind.lines),
    const FieldSpec(
      'terms.includedItems',
      'Đã bao gồm trong giá',
      kind: InputKind.lines,
    ),
    const FieldSpec(
      'terms.excludedItems',
      'Chưa bao gồm',
      kind: InputKind.lines,
    ),
  ],
  if (kind == ResourceKind.service) ...const [
    FieldSpec(
      'categoryId',
      'Danh mục dịch vụ',
      kind: InputKind.reference,
      required: true,
      source: ReferenceSource(
        '/public/categories',
        query: {'kind': 'SERVICE'},
        public: true,
      ),
    ),
    FieldSpec(
      'defaultPlaceId',
      'Điểm tổ chức',
      kind: InputKind.reference,
      source: ReferenceSource('/households/me/places', root: 'place'),
      hint: 'Khi gửi duyệt, điểm phải được duyệt và đang cung cấp.',
    ),
    FieldSpec(
      'defaultDurationMinutes',
      'Thời lượng dự kiến (phút)',
      kind: InputKind.integer,
      required: true,
      min: 1,
      max: 10080,
    ),
    FieldSpec(
      'details.participationConditions',
      'Điều kiện tham gia',
      kind: InputKind.lines,
      maxItems: 20,
      itemLength: 1000,
    ),
    FieldSpec(
      'details.preparationNotes',
      'Khách cần chuẩn bị',
      kind: InputKind.lines,
      maxItems: 20,
      itemLength: 1000,
    ),
  ],
];
Json profileDefaults(ResourceKind kind) => {
  if (kind == ResourceKind.room) ...{
    'maxGuests': 2,
    'nightlyPriceVnd': 0,
    'checkInTime': '14:00',
    'checkOutTime': '12:00',
  },
  if (kind == ResourceKind.service) 'defaultDurationMinutes': 120,
};
Json profilePayload(ResourceKind kind, Json input) {
  if (kind != ResourceKind.place) return input;
  final data = {...input},
      latitude = data.remove('latitude'),
      longitude = data.remove('longitude');
  final details = object(data['details']);
  details['coordinates'] = latitude == null && longitude == null
      ? null
      : {'latitude': latitude, 'longitude': longitude};
  data['details'] = details;
  return data;
}

String? validateProfile(ResourceKind kind, Json input) =>
    kind == ResourceKind.place &&
        ((input['latitude'] == null) != (input['longitude'] == null))
    ? 'Cần nhập cả vĩ độ và kinh độ, hoặc để trống cả hai.'
    : null;

const offerFields = [
  FieldSpec('name', 'Tên phương thức bán', required: true, maxLength: 150),
  FieldSpec(
    'participationMode',
    'Cách tham gia',
    kind: InputKind.choice,
    required: true,
    choices: {'SHARED': 'Bán ghép', 'EXCLUSIVE': 'Thuê riêng'},
  ),
  FieldSpec(
    'pricingType',
    'Cách tính tiền',
    kind: InputKind.choice,
    required: true,
    choices: {
      'PER_PERSON': 'Theo người',
      'PER_GROUP': 'Theo nhóm',
      'PER_TRIP': 'Theo chuyến',
      'FIXED_PACKAGE': 'Gói cố định',
      'PER_HOUR': 'Theo giờ',
      'PER_UNIT': 'Theo đơn vị',
    },
  ),
  FieldSpec(
    'unitPriceVnd',
    'Đơn giá VND',
    kind: InputKind.integer,
    required: true,
  ),
  FieldSpec(
    'minParticipants',
    'Số người tối thiểu',
    kind: InputKind.integer,
    required: true,
    min: 1,
    max: 100000,
  ),
  FieldSpec(
    'maxParticipants',
    'Số người tối đa',
    kind: InputKind.integer,
    required: true,
    min: 1,
    max: 100000,
  ),
  FieldSpec(
    'unitLabel',
    'Đơn vị tính, ví dụ xe',
    required: true,
    maxLength: 60,
    showWhenKey: 'pricingType',
    showWhenValue: 'PER_UNIT',
  ),
  FieldSpec(
    'maxUnits',
    'Số đơn vị tối đa',
    kind: InputKind.integer,
    required: true,
    min: 1,
    max: 100000,
    showWhenKey: 'pricingType',
    showWhenValue: 'PER_UNIT',
  ),
  FieldSpec(
    'participantsPerUnit',
    'Số người tối đa mỗi đơn vị',
    kind: InputKind.integer,
    required: true,
    min: 1,
    max: 100000,
    showWhenKey: 'pricingType',
    showWhenValue: 'PER_UNIT',
  ),
  FieldSpec(
    'terms.scopeDescription',
    'Phạm vi phục vụ',
    kind: InputKind.paragraph,
    maxLength: 2000,
    hint: 'Nêu rõ giá bao gồm những gì. Cần ít nhất 10 ký tự trước khi gửi dịch vụ để duyệt.',
  ),
  FieldSpec('terms.includedItems', 'Bao gồm', kind: InputKind.lines),
  FieldSpec('terms.excludedItems', 'Không bao gồm', kind: InputKind.lines),
  FieldSpec(
    'addons',
    'Phụ phí không cần giữ tài nguyên',
    kind: InputKind.addons,
    maxItems: 32,
  ),
  FieldSpec('isActive', 'Đang mở bán', kind: InputKind.toggle),
];
String? validateOffer(Json input) {
  if ((input['maxParticipants'] as int) < (input['minParticipants'] as int)) {
    return 'Số người tối đa phải lớn hơn hoặc bằng tối thiểu.';
  }
  if (input['pricingType'] == 'PER_UNIT' &&
      (input['maxParticipants'] as int) >
          (input['maxUnits'] as int) * (input['participantsPerUnit'] as int)) {
    return 'Số người tối đa vượt khả năng phục vụ của số đơn vị đã cấu hình.';
  }
  return null;
}
