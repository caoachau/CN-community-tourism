import 'package:flutter/material.dart';

import '../data.dart' show money;
import '../widgets.dart' show Panel, Photo, green, gray;
import 'api.dart';
import 'common.dart';
import 'definitions.dart';
import 'media.dart';

class SignInRequired extends StatelessWidget {
  const SignInRequired({super.key, required this.api});
  final TourismApi api;
  @override
  Widget build(BuildContext context) => EmptyPanel(
    'Đăng nhập để mở hồ sơ hộ dân và quản lý hoạt động của gia đình.',
    action: Wrap(
      spacing: 12,
      children: [
        FilledButton(
          onPressed: () => openAuthentication(context, api),
          child: const Text('Đăng nhập'),
        ),
        TextButton(
          onPressed: () => openAuthentication(context, api, register: true),
          child: const Text('Tạo tài khoản'),
        ),
      ],
    ),
  );
}

Future<void> openAuthentication(
  BuildContext context,
  TourismApi api, {
  bool register = false,
}) async {
  await Navigator.push<Json>(
    context,
    MaterialPageRoute(
      builder: (_) => DataForm(
        api: api,
        title: register ? 'Tạo tài khoản' : 'Đăng nhập',
        action: register ? 'Tạo tài khoản' : 'Đăng nhập',
        memberOnly: false,
        description: register
            ? 'Tài khoản mới là khách thành viên. Sau đó bạn có thể mở hồ sơ hộ dân bằng chính tài khoản này.'
            : null,
        fields: [
          if (register)
            const FieldSpec(
              'displayName',
              'Họ và tên',
              required: true,
              maxLength: 150,
            ),
          const FieldSpec(
            'email',
            'Email',
            kind: InputKind.email,
            required: true,
            maxLength: 254,
          ),
          FieldSpec(
            'password',
            'Mật khẩu',
            kind: InputKind.password,
            required: true,
            minLength: register ? 15 : 1,
            maxLength: 128,
            hint: register ? 'Từ 15 đến 128 ký tự.' : null,
          ),
          if (register)
            const FieldSpec(
              'phone',
              'Số điện thoại',
              kind: InputKind.phone,
              maxLength: 32,
            ),
        ],
        save: (data) async {
          await api.authenticate(data, register: register);
          return {'signedIn': true};
        },
      ),
    ),
  );
}

class HouseholdHome extends StatefulWidget {
  const HouseholdHome({super.key, required this.api});
  final TourismApi api;
  @override
  State<HouseholdHome> createState() => _HouseholdHomeState();
}

class _HouseholdHomeState extends State<HouseholdHome> {
  late Future<Json?> future;
  late int epoch;
  bool busy = false;
  Object? error;
  @override
  void initState() {
    super.initState();
    epoch = widget.api.epoch;
    load();
    widget.api.addListener(changed);
  }

  @override
  void dispose() {
    widget.api.removeListener(changed);
    super.dispose();
  }

  void changed() {
    if (epoch != widget.api.epoch && mounted) {
      setState(() {
        epoch = widget.api.epoch;
        load();
      });
    }
  }

  Future<Json?> fetch() async {
    if (!widget.api.signedIn || widget.api.user?['role'] == 'ADMIN') {
      return null;
    }
    await widget.api.currentUser();
    try {
      return await widget.api.request('GET', '/households/me');
    } on ApiFailure catch (error) {
      if (error.code == 'NOT_FOUND') return null;
      rethrow;
    }
  }

  void load() {
    future = fetch();
    error = null;
  }

  Future<void> edit(Json? data) async {
    final profile = object(data?['profile']);
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: data == null ? 'Mở hồ sơ hộ dân' : 'Chỉnh sửa hồ sơ hộ',
          fields: householdFields,
          initial: profile,
          description: 'Lưu nháp để bổ sung dần. Khi gửi duyệt cần mô tả, địa chỉ, địa phương và số liên hệ đầy đủ. Bản đã duyệt vẫn hiển thị trong lúc chờ bản sửa.',
          save: (input) => widget.api.request(
            data == null ? 'POST' : 'PUT',
            data == null ? '/households' : '/households/me/profile',
            body: {
              ...input,
              if (data != null) ...{
                'revisionId': profile['revisionId'],
                'version': profile['version'],
              },
            },
          ),
        ),
      ),
    );
    if (result != null && mounted) setState(load);
  }

  Future<void> submit(Json data) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final p = object(data['profile']);
      await widget.api.request(
        'POST',
        '/households/me/submissions',
        body: {'revisionId': p['revisionId'], 'version': p['version']},
      );
      if (mounted) setState(load);
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.api,
    builder: (context, _) {
      if (!widget.api.signedIn) return SignInRequired(api: widget.api);
      if (widget.api.user?['role'] == 'ADMIN') {
        return const EmptyPanel(
          'Tài khoản quản trị sử dụng trang Admin web để xét duyệt và quản lý nền tảng.',
        );
      }
      return FutureBuilder<Json?>(
        future: future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return ErrorPanel(snapshot.error!, retry: () => setState(load));
          }
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          final data = snapshot.data;
          if (data == null) {
            return EmptyPanel(
              'Bạn chưa mở hồ sơ hộ dân. Không cần có phòng nghỉ để đăng ký cung cấp trải nghiệm.',
              action: FilledButton.icon(
                onPressed: () => edit(null),
                icon: const Icon(Icons.add_home_outlined),
                label: const Text('Mở hồ sơ hộ dân'),
              ),
            );
          }
          final household = object(data['household']),
              profile = object(data['profile']),
              published = object(data['publishedProfile']);
          final pending = profile['status'] == 'PENDING',
              archived = household['archivedAt'] != null,
              approved = household['approvalStatus'] == 'APPROVED';
          return RefreshIndicator(
            onRefresh: () async {
              setState(load);
              await future;
            },
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const ClipRRect(
                  borderRadius: BorderRadius.all(Radius.circular(24)),
                  child: Photo(
                    'pao_landscape',
                    height: 150,
                    width: double.infinity,
                    label: 'Phong cảnh du lịch cộng đồng',
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        profile['title']?.toString() ?? 'Hồ sơ hộ dân',
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: 'Tải lại hồ sơ và quyền',
                      onPressed: () => setState(load),
                      icon: const Icon(Icons.refresh),
                    ),
                  ],
                ),
                Wrap(
                  spacing: 8,
                  children: [
                    StatusBadge(household['approvalStatus']),
                    StatusBadge(profile['status']),
                    if (archived) const Chip(label: Text('Đã lưu trữ')),
                  ],
                ),
                if (archived)
                  const Notice(
                    'Hồ sơ đã lưu trữ. Các nội dung của hộ được ẩn khỏi danh mục công khai. Khôi phục để tiếp tục quản lý.',
                  ),
                if (!approved)
                  Notice(
                    household['approvalStatus'] == 'REVOKED'
                        ? 'Hộ đã ngừng nhận cam kết mới. Bạn vẫn được xem lịch sử, ẩn hoặc ngừng cung cấp các nội dung cũ; có thể bổ sung hồ sơ để xin duyệt lại.'
                        : 'Hoàn thiện hồ sơ và gửi Admin duyệt. Tài khoản vẫn dùng được các chức năng dành cho khách.',
                  ),
                if (error != null) ErrorPanel(error!),
                if (busy) const LinearProgressIndicator(),
                const SizedBox(height: 14),
                ContentSummary(profile: profile, kind: 'HOUSEHOLD'),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: busy
                      ? null
                      : () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => MediaManager(
                              api: widget.api,
                              path: '/households/me',
                              profile: profile,
                              editable:
                                  !archived && profile['status'] == 'DRAFT',
                            ),
                          ),
                        ),
                  icon: const Icon(Icons.photo_library_outlined),
                  label: const Text('Hình ảnh hồ sơ'),
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    FilledButton.icon(
                      onPressed: busy || pending || archived
                          ? null
                          : () => edit(data),
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Sửa hồ sơ'),
                    ),
                    if (profile['status'] == 'DRAFT')
                      OutlinedButton.icon(
                        onPressed: busy || archived ? null : () => submit(data),
                        icon: const Icon(Icons.send_outlined),
                        label: const Text('Gửi xét duyệt'),
                      ),
                    TextButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => RevisionHistory(
                            api: widget.api,
                            path: '/households/me/revisions',
                            kind: 'HOUSEHOLD',
                          ),
                        ),
                      ),
                      child: const Text('Lịch sử phiên bản'),
                    ),
                  ],
                ),
                if (published.isNotEmpty &&
                    published['revisionId'] != profile['revisionId'])
                  ExpansionTile(
                    title: const Text('Bản đang công khai'),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: ContentSummary(
                          profile: published,
                          kind: 'HOUSEHOLD',
                        ),
                      ),
                    ],
                  ),
                const SizedBox(height: 16),
                ArchiveAction(
                  api: widget.api,
                  path: '/households/me',
                  profile: profile,
                  archived: archived,
                  enabled: !busy,
                  onChanged: () => setState(load),
                ),
                if (widget.api.isHousehold) ...[
                  const Divider(height: 36),
                  const Text(
                    'Quản lý hoạt động',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  for (final kind in ResourceKind.values)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Panel(
                        padding: const EdgeInsets.all(4),
                        child: ListTile(
                          leading: Icon(switch (kind) {
                            ResourceKind.place => Icons.location_on_outlined,
                            ResourceKind.room => Icons.bed_outlined,
                            ResourceKind.service => Icons.explore_outlined,
                          }, color: green),
                          title: Text(kind.title),
                          subtitle: Text(
                            kind == ResourceKind.room
                                ? 'Tùy chọn; mỗi phòng có lịch và giá theo đêm riêng'
                                : 'Nội dung, phiên bản xét duyệt và trạng thái cung cấp',
                            style: const TextStyle(fontSize: 12, color: gray),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () async {
                            await Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    ResourceList(api: widget.api, kind: kind),
                              ),
                            );
                            if (mounted) setState(load);
                          },
                        ),
                      ),
                    ),
                ],
              ],
            ),
          );
        },
      );
    },
  );
}

class ResourceList extends StatefulWidget {
  const ResourceList({super.key, required this.api, required this.kind});
  final TourismApi api;
  final ResourceKind kind;
  @override
  State<ResourceList> createState() => _ResourceListState();
}

class _ResourceListState extends State<ResourceList> {
  int page = 1;
  late Future<Json> future;
  late final int sessionEpoch;
  @override
  void initState() {
    super.initState();
    sessionEpoch = widget.api.epoch;
    load();
  }

  Future<Json> fetch() async {
    await widget.api.currentUser();
    final h = await widget.api.request('GET', '/households/me');
    final rows = await widget.api.request(
      'GET',
      widget.kind.endpoint,
      query: {'page': page, 'pageSize': 20},
    );
    return {...rows, 'household': h['household']};
  }

  void load() {
    future = fetch();
  }

  Future<void> create() async {
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: 'Thêm ${widget.kind.title.toLowerCase()}',
          fields: resourceFields(widget.kind, create: true),
          initial: profileDefaults(widget.kind),
          description: widget.kind == ResourceKind.room
              ? 'Tạo một phòng cụ thể. Giá tính cho một phòng mỗi đêm, độc lập với số khách.'
              : 'Lưu nháp trước; bản gửi duyệt cần mô tả đầy đủ và điểm phục vụ đủ điều kiện.',
          validatePayload: (input) => validateProfile(widget.kind, input),
          save: (input) => widget.api.request(
            'POST',
            widget.kind.endpoint,
            body: profilePayload(widget.kind, input),
          ),
        ),
      ),
    );
    if (result != null && mounted) {
      setState(() => page = 1);
      await open(result);
    }
  }

  Future<void> open(Json data) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ResourceDetail(
          api: widget.api,
          kind: widget.kind,
          id: object(data[widget.kind.root])['id'].toString(),
        ),
      ),
    );
    if (mounted) setState(load);
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.api,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: Text(widget.kind.title),
        actions: [
          IconButton(
            tooltip: 'Tải lại',
            onPressed: () => setState(load),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: widget.api.epoch != sessionEpoch
          ? const EmptyPanel(
              'Phiên đăng nhập đã thay đổi. Hãy quay lại và mở lại màn hình này.',
            )
          : !widget.api.signedIn
          ? SignInRequired(api: widget.api)
          : FutureBuilder<Json>(
              future: future,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Padding(
                    padding: const EdgeInsets.all(20),
                    child: ErrorPanel(
                      snapshot.error!,
                      retry: () => setState(load),
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final data = snapshot.data!,
                    rows = records(data['items']),
                    household = object(data['household']),
                    approved =
                        household['approvalStatus'] == 'APPROVED' &&
                        household['archivedAt'] == null;
                return RefreshIndicator(
                  onRefresh: () async {
                    setState(load);
                    await future;
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      if (approved)
                        FilledButton.icon(
                          onPressed: create,
                          icon: const Icon(Icons.add),
                          label: Text(
                            'Thêm ${widget.kind.title.toLowerCase()}',
                          ),
                        )
                      else
                        const Notice(
                          'Hộ chưa được nhận cam kết mới. Bạn vẫn xem được nội dung và lịch sử đã có.',
                        ),
                      const SizedBox(height: 16),
                      if (rows.isEmpty)
                        const EmptyPanel(
                          'Chưa có nội dung. Hãy tạo bản nháp đầu tiên khi hộ đã được phê duyệt.',
                        ),
                      for (final row in rows)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Panel(
                            padding: const EdgeInsets.all(4),
                            child: ListTile(
                              title: Text(titleOf(row)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Wrap(
                                    spacing: 6,
                                    children: [
                                      StatusBadge(
                                        object(row['profile'])['status'],
                                      ),
                                      if (object(
                                            row[widget.kind.root],
                                          )['archivedAt'] !=
                                          null)
                                        const Chip(label: Text('Đã lưu trữ')),
                                      StatusBadge(
                                        object(
                                          row[widget.kind.root],
                                        )['supplyStatus'],
                                      ),
                                    ],
                                  ),
                                  if (widget.kind == ResourceKind.room)
                                    Text(
                                      '${money(object(row['room'])['nightlyPriceVnd'] as int)} / đêm',
                                    ),
                                ],
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => open(row),
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
                  ),
                );
              },
            ),
    ),
  );
}

class ResourceDetail extends StatefulWidget {
  const ResourceDetail({
    super.key,
    required this.api,
    required this.kind,
    required this.id,
  });
  final TourismApi api;
  final ResourceKind kind;
  final String id;
  @override
  State<ResourceDetail> createState() => _ResourceDetailState();
}

class _ResourceDetailState extends State<ResourceDetail> {
  late Future<Json> future;
  late final int sessionEpoch;
  bool busy = false;
  Object? error;
  String get path => '${widget.kind.endpoint}/${widget.id}';
  @override
  void initState() {
    super.initState();
    sessionEpoch = widget.api.epoch;
    load();
  }

  Future<Json> fetch() async {
    await widget.api.currentUser();
    final result = await Future.wait([
      widget.api.request('GET', path),
      widget.api.request('GET', '/households/me'),
    ]);
    return {...result[0], 'household': result[1]['household']};
  }

  void load() {
    future = fetch();
    error = null;
  }

  Future<void> command(Future<Json> Function() work) async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await work();
      if (mounted) setState(load);
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> form(Widget screen) async {
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(builder: (_) => screen),
    );
    if (result != null && mounted) setState(load);
  }

  Future<void> edit(Json data) async {
    final p = object(data['profile']), initial = {...p};
    if (widget.kind == ResourceKind.place) {
      final coordinates = object(object(p['details'])['coordinates']);
      initial['latitude'] = coordinates['latitude'];
      initial['longitude'] = coordinates['longitude'];
    }
    await form(
      DataForm(
        api: widget.api,
        title: 'Chỉnh sửa ${widget.kind.title.toLowerCase()}',
        fields: resourceFields(widget.kind),
        initial: initial,
        description: 'Bản đã duyệt vẫn công khai cho đến khi Admin duyệt bản sửa. Giá hiện hành được cập nhật ở mục riêng.',
        validatePayload: (input) => validateProfile(widget.kind, input),
        save: (input) => widget.api.request(
          'PUT',
          '$path/profile',
          body: {
            ...profilePayload(widget.kind, input),
            'revisionId': p['revisionId'],
            'version': p['version'],
          },
        ),
      ),
    );
  }

  Future<void> submit(Json data) async {
    final p = object(data['profile']), root = object(data[widget.kind.root]);
    await command(
      () => widget.api.request(
        'POST',
        '$path/submissions',
        body: {
          'revisionId': p['revisionId'],
          'version': p['version'],
          if (widget.kind == ResourceKind.room)
            'pricingToken': root['pricingToken'],
          if (widget.kind == ResourceKind.service)
            'offersToken': data['offersToken'],
        },
      ),
    );
  }

  Future<void> price(Json data) async {
    final room = object(data['room']);
    await form(
      DataForm(
        api: widget.api,
        title: 'Giá phòng theo đêm',
        action: 'Cập nhật giá',
        initial: room,
        description: 'Giá mới áp dụng cho yêu cầu mới. Giá và điều kiện đã chốt trong giao dịch cũ được giữ nguyên.',
        fields: const [
          FieldSpec(
            'nightlyPriceVnd',
            'Giá một phòng / một đêm (VND)',
            kind: InputKind.integer,
            required: true,
          ),
          FieldSpec(
            'reason',
            'Lý do thay đổi',
            kind: InputKind.paragraph,
            required: true,
            maxLength: 2000,
          ),
        ],
        save: (input) => widget.api.request(
          'PATCH',
          '$path/pricing',
          body: {...input, 'expectedToken': room['pricingToken']},
        ),
      ),
    );
  }

  Future<void> status(Json data, bool approved) async {
    final root = object(data[widget.kind.root]),
        retired = root['supplyStatus'] == 'RETIRED';
    await form(
      DataForm(
        api: widget.api,
        title: 'Tình trạng cung cấp',
        action: 'Lưu tình trạng',
        initial: {
          ...root,
          if (!approved && !retired) 'supplyStatus': 'PAUSED',
          if (!approved) 'visibility': 'HIDDEN',
        },
        description: 'Ẩn hoặc ngừng nhận đặt không hủy các cam kết cũ. Ngừng hẳn là trạng thái kết thúc, không mở lại.',
        fields: [
          FieldSpec(
            'supplyStatus',
            'Khả năng cung cấp',
            kind: InputKind.choice,
            required: true,
            choices: retired
                ? {'RETIRED': label('RETIRED')}
                : approved
                ? {
                    for (final key in ['AVAILABLE', 'PAUSED', 'RETIRED'])
                      key: label(key),
                  }
                : {
                    for (final key in ['PAUSED', 'RETIRED']) key: label(key),
                  },
          ),
          FieldSpec(
            'visibility',
            'Hiển thị',
            kind: InputKind.choice,
            required: true,
            choices: approved
                ? {
                    for (final key in ['VISIBLE', 'HIDDEN']) key: label(key),
                  }
                : {'HIDDEN': label('HIDDEN')},
          ),
          const FieldSpec(
            'reason',
            'Lý do thay đổi',
            kind: InputKind.paragraph,
            required: true,
            maxLength: 2000,
          ),
        ],
        save: (input) => widget.api.request(
          'PATCH',
          '$path/status',
          body: {
            ...input,
            'expectedState': {
              'supplyStatus': root['supplyStatus'],
              'visibility': root['visibility'],
            },
          },
        ),
      ),
    );
  }

  Future<void> offer(Json data, {Json? row}) async {
    final reason = row == null
        ? null
        : await askReason(context, 'Lý do chỉnh sửa phương thức bán');
    if (row != null && (reason == null || !mounted)) return;
    await form(
      DataForm(
        api: widget.api,
        title: row == null ? 'Thêm phương thức bán' : 'Sửa phương thức bán',
        action: 'Lưu phương thức',
        fields: offerFields,
        initial:
            row ??
            {
              'participationMode': 'SHARED',
              'pricingType': 'PER_PERSON',
              'minParticipants': 1,
              'maxParticipants': 10,
              'unitPriceVnd': 0,
              'isActive': true,
            },
        validatePayload: validateOffer,
        description: 'Số người tham gia, số đơn vị tính tiền và mức dùng tài nguyên là các đại lượng riêng. Giá theo giờ do backend tính từ lịch. Cấu trúc đã gửi duyệt hoặc được dùng phải tạo phương thức thay thế.',
        save: (input) => widget.api.request(
          row == null ? 'POST' : 'PUT',
          row == null ? '$path/offers' : '$path/offers/${row['id']}',
          body: row == null
              ? input
              : {
                  'configuration': input,
                  'expectedToken': row['token'],
                  'reason': reason,
                },
        ),
      ),
    );
  }

  Future<void> offerPrice(Json row, bool approved) async {
    if (!approved) {
      final reason = await askReason(context, 'Ngừng mở bán phương thức này');
      if (reason != null && mounted) {
        await command(
          () => widget.api.request(
            'PATCH',
            '$path/offers/${row['id']}/pricing',
            body: {
              'expectedToken': row['token'],
              'isActive': false,
              'reason': reason,
            },
          ),
        );
      }
      return;
    }
    final addons = records(row['addons']);
    await form(
      DataForm(
        api: widget.api,
        title: 'Giá và tình trạng bán',
        action: 'Cập nhật giá',
        initial: {
          ...row,
          'addonPrices': {for (final a in addons) a['key']: a},
        },
        description: 'Chỉ cập nhật giá hoặc bật/tắt phương thức và phụ phí đã có. Lịch sử đã gửi, phương án và booking cũ không đổi.',
        fields: [
          const FieldSpec(
            'unitPriceVnd',
            'Đơn giá VND',
            kind: InputKind.integer,
            required: true,
          ),
          const FieldSpec('isActive', 'Đang mở bán', kind: InputKind.toggle),
          for (final a in addons) ...[
            FieldSpec(
              'addonPrices.${a['key']}.unitPriceVnd',
              'Giá phụ phí ${a['name']}',
              kind: InputKind.integer,
              required: true,
            ),
            FieldSpec(
              'addonPrices.${a['key']}.isActive',
              'Áp dụng ${a['name']}',
              kind: InputKind.toggle,
            ),
          ],
          const FieldSpec(
            'reason',
            'Lý do thay đổi',
            kind: InputKind.paragraph,
            required: true,
            maxLength: 2000,
          ),
        ],
        save: (input) {
          final prices = object(input.remove('addonPrices'));
          return widget.api.request(
            'PATCH',
            '$path/offers/${row['id']}/pricing',
            body: {
              ...input,
              'expectedToken': row['token'],
              if (addons.isNotEmpty)
                'addonPrices': [
                  for (final a in addons)
                    {'key': a['key'], ...object(prices[a['key']])},
                ],
            },
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.api,
    builder: (context, _) => Scaffold(
      appBar: AppBar(
        title: Text(widget.kind.title),
        actions: [
          IconButton(
            tooltip: 'Tải lại',
            onPressed: busy ? null : () => setState(load),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: widget.api.epoch != sessionEpoch
          ? const EmptyPanel(
              'Phiên đăng nhập đã thay đổi. Hãy quay lại và mở lại màn hình này.',
            )
          : !widget.api.signedIn
          ? SignInRequired(api: widget.api)
          : FutureBuilder<Json>(
              future: future,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Padding(
                    padding: const EdgeInsets.all(20),
                    child: ErrorPanel(
                      snapshot.error!,
                      retry: () => setState(load),
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final data = snapshot.data!,
                    root = object(data[widget.kind.root]),
                    profile = object(data['profile']),
                    published = object(data['publishedProfile']),
                    h = object(data['household']);
                final approved = h['approvalStatus'] == 'APPROVED',
                    archived =
                        root['archivedAt'] != null || h['archivedAt'] != null,
                    retired = root['supplyStatus'] == 'RETIRED';
                final editable = approved && !archived && !retired,
                    mutable = editable && profile['status'] != 'PENDING';
                return RefreshIndicator(
                  onRefresh: () async {
                    setState(load);
                    await future;
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      Wrap(
                        spacing: 6,
                        children: [
                          StatusBadge(profile['status']),
                          StatusBadge(root['supplyStatus']),
                          StatusBadge(root['visibility']),
                        ],
                      ),
                      if (error != null) ErrorPanel(error!),
                      if (busy) const LinearProgressIndicator(),
                      const SizedBox(height: 12),
                      ContentSummary(profile: profile, kind: widget.kind.root),
                      if (widget.kind != ResourceKind.place) ...[
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: busy
                              ? null
                              : () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => MediaManager(
                                      api: widget.api,
                                      path: path,
                                      profile: profile,
                                      editable:
                                          mutable &&
                                          profile['status'] == 'DRAFT',
                                    ),
                                  ),
                                ),
                          icon: const Icon(Icons.photo_library_outlined),
                          label: const Text('Hình ảnh hồ sơ'),
                        ),
                        if (root['archivedAt'] != null)
                          const Notice(
                            'Hồ sơ đã lưu trữ và không hiển thị công khai.',
                          ),
                        ArchiveAction(
                          api: widget.api,
                          path: path,
                          profile: profile,
                          archived: root['archivedAt'] != null,
                          enabled: !busy && h['archivedAt'] == null,
                          onChanged: () => setState(load),
                        ),
                      ],
                      if (widget.kind == ResourceKind.room)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          child: Text(
                            'Giá hiện hành: ${money(root['nightlyPriceVnd'] as int)} / phòng / đêm',
                            style: const TextStyle(
                              fontSize: 19,
                              color: green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      if (!approved)
                        const Notice(
                          'Hộ không nhận cam kết mới. Các bản đã xác nhận và lịch sử được giữ nguyên.',
                        ),
                      const SizedBox(height: 18),
                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: [
                          FilledButton.icon(
                            onPressed: busy || !mutable
                                ? null
                                : () => edit(data),
                            icon: const Icon(Icons.edit_outlined),
                            label: const Text('Sửa nội dung'),
                          ),
                          if (profile['status'] == 'DRAFT')
                            OutlinedButton.icon(
                              onPressed: busy || !editable
                                  ? null
                                  : () => submit(data),
                              icon: const Icon(Icons.send_outlined),
                              label: const Text('Gửi xét duyệt'),
                            ),
                          if (widget.kind == ResourceKind.room)
                            OutlinedButton(
                              onPressed: busy || !editable
                                  ? null
                                  : () => price(data),
                              child: const Text('Đổi giá theo đêm'),
                            ),
                          OutlinedButton(
                            onPressed: busy || archived
                                ? null
                                : () => status(data, approved),
                            child: const Text('Tình trạng cung cấp'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => RevisionHistory(
                                  api: widget.api,
                                  path: '$path/revisions',
                                  kind: widget.kind.root,
                                ),
                              ),
                            ),
                            child: const Text('Lịch sử phiên bản'),
                          ),
                        ],
                      ),
                      if (profile['status'] == 'PENDING')
                        const Notice(
                          'Bản này đang chờ Admin duyệt. Nội dung đã gửi không sửa trực tiếp; giá hiện hành vẫn cập nhật được khi hộ đủ điều kiện.',
                        ),
                      if (published.isNotEmpty &&
                          published['revisionId'] != profile['revisionId'])
                        ExpansionTile(
                          title: const Text('Bản đang công khai'),
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: ContentSummary(
                                profile: published,
                                kind: widget.kind.root,
                              ),
                            ),
                          ],
                        ),
                      if (widget.kind == ResourceKind.service) ...[
                        const Divider(height: 36),
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Phương thức bán',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            IconButton(
                              tooltip: 'Thêm phương thức bán',
                              onPressed: busy || !mutable
                                  ? null
                                  : () => offer(data),
                              icon: const Icon(Icons.add),
                            ),
                          ],
                        ),
                        if (records(data['offers']).isEmpty)
                          const EmptyPanel(
                            'Tạo ít nhất một phương thức bán đang bật trước khi gửi duyệt dịch vụ.',
                          ),
                        for (final row in records(data['offers']))
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Panel(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  OfferSummary(offer: row),
                                  const SizedBox(height: 12),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      OutlinedButton(
                                        onPressed: busy || !mutable
                                            ? null
                                            : () => offer(data, row: row),
                                        child: const Text('Sửa cấu trúc'),
                                      ),
                                      TextButton(
                                        onPressed: busy || archived
                                            ? null
                                            : () => offerPrice(row, editable),
                                        child: Text(
                                          editable
                                              ? 'Giá và mở bán'
                                              : 'Ngừng mở bán',
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ],
                  ),
                );
              },
            ),
    ),
  );
}

class OfferSummary extends StatelessWidget {
  const OfferSummary({super.key, required this.offer});
  final Json offer;
  @override
  Widget build(BuildContext context) {
    final terms = object(offer['terms']);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          offer['name']?.toString() ?? '',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [
            StatusBadge(offer['participationMode']),
            StatusBadge(offer['pricingType']),
            if (offer.containsKey('isActive'))
              Chip(
                label: Text(
                  offer['isActive'] == true ? 'Đang mở bán' : 'Đã tắt',
                ),
              ),
          ],
        ),
        Text(
          '${money(offer['unitPriceVnd'] as int)} / ${offer['unitLabel']}',
          style: const TextStyle(
            fontSize: 19,
            color: green,
            fontWeight: FontWeight.w700,
          ),
        ),
        Text(
          '${offer['minParticipants']}–${offer['maxParticipants']} người / hạng mục',
          style: const TextStyle(color: gray, height: 1.7),
        ),
        if (offer['pricingType'] == 'PER_UNIT')
          Text(
            'Tối đa ${offer['maxUnits']} ${offer['unitLabel']}, ${offer['participantsPerUnit']} người / đơn vị',
          ),
        if (offer['pricingType'] == 'PER_HOUR')
          const Text(
            'Số giờ được tính từ thời lượng lịch đã chọn.',
            style: TextStyle(color: gray, fontSize: 12),
          ),
        if (terms['scopeDescription'] != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              terms['scopeDescription'].toString(),
              style: const TextStyle(height: 1.6),
            ),
          ),
        for (final (heading, items) in [
          ('Bao gồm', terms['includedItems']),
          ('Không bao gồm', terms['excludedItems']),
        ])
          if (items is List && items.isNotEmpty)
            Text(
              '$heading: ${items.join(', ')}',
              style: const TextStyle(height: 1.6),
            ),
        for (final addon in records(offer['addons']))
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              '${addon['name']}: ${money(addon['unitPriceVnd'] as int)}, tối đa ${addon['maxQuantity']}${addon['isActive'] == false ? ' · Đã tắt' : ''}',
            ),
          ),
      ],
    );
  }
}

class RevisionHistory extends StatefulWidget {
  const RevisionHistory({
    super.key,
    required this.api,
    required this.path,
    required this.kind,
  });
  final TourismApi api;
  final String path, kind;
  @override
  State<RevisionHistory> createState() => _RevisionHistoryState();
}

class _RevisionHistoryState extends State<RevisionHistory> {
  int page = 1;
  late Future<Json> future;
  late final int sessionEpoch;
  @override
  void initState() {
    super.initState();
    sessionEpoch = widget.api.epoch;
    load();
  }

  void load() {
    future = widget.api.request(
      'GET',
      widget.path,
      query: {'page': page, 'pageSize': 20},
    );
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.api,
    builder: (context, _) => Scaffold(
      appBar: AppBar(title: const Text('Lịch sử phiên bản')),
      body: widget.api.epoch != sessionEpoch
          ? const EmptyPanel(
              'Phiên đăng nhập đã thay đổi. Hãy quay lại và mở lại màn hình này.',
            )
          : !widget.api.signedIn
          ? SignInRequired(api: widget.api)
          : FutureBuilder<Json>(
              future: future,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Padding(
                    padding: const EdgeInsets.all(20),
                    child: ErrorPanel(
                      snapshot.error!,
                      retry: () => setState(load),
                    ),
                  );
                }
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final data = snapshot.data!;
                return ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    for (final row in records(data['items']))
                      ExpansionTile(
                        title: Text(
                          'Phiên bản ${row['version']} · ${label(row['status'])}',
                        ),
                        subtitle: Text(
                          'Tạo lúc ${dateLabel(row['createdAt'])}',
                        ),
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ContentSummary(profile: row, kind: widget.kind),
                                if (row['submittedAt'] != null)
                                  Text(
                                    'Gửi lúc ${dateLabel(row['submittedAt'])}',
                                  ),
                                if (row['reviewedAt'] != null)
                                  Text(
                                    'Xét duyệt lúc ${dateLabel(row['reviewedAt'])}',
                                  ),
                                for (final offer in records(
                                  row['offerSnapshots'],
                                ))
                                  Padding(
                                    padding: const EdgeInsets.only(top: 14),
                                    child: OfferSummary(offer: offer),
                                  ),
                              ],
                            ),
                          ),
                        ],
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
  );
}
