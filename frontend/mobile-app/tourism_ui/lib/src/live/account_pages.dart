part of 'app.dart';

Future<void> _openBookings(
  BuildContext context,
  TourismApi api, {
  bool host = false,
  String? status,
}) async {
  if (!api.signedIn) {
    await openAuthentication(context, api);
  }
  if (context.mounted && api.signedIn) {
    _push(
      context,
      BookingListPage(api: api, host: host, initialStatus: status),
    );
  }
}

class LiveAccount extends StatefulWidget {
  const LiveAccount({super.key, required this.api, this.openHost});
  final TourismApi api;
  final VoidCallback? openHost;
  @override
  State<LiveAccount> createState() => _LiveAccountState();
}

class _LiveAccountState extends State<LiveAccount> {
  bool busy = false;
  Object? error;
  Future<void> logout() async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.api.logout();
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> refresh() async {
    try {
      await widget.api.currentUser();
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.api,
    builder: (context, _) {
      final user = widget.api.user,
          name = user?['displayName']?.toString() ?? 'Khách vãng lai';
      return ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        children: [
          Row(
            children: [
              _InitialAvatar(name, size: 58),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(
                        alignment: Alignment.centerLeft,
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(48, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: () => user == null
                          ? openAuthentication(context, widget.api)
                          : featureAlert(context, MissingFeature.profile),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Text(
                              user == null
                                  ? 'Đăng nhập tài khoản'
                                  : 'Chỉnh sửa hồ sơ',
                              style: const TextStyle(
                                fontSize: 11,
                                color: uiGreen,
                              ),
                            ),
                            const Icon(
                              Icons.chevron_right,
                              size: 16,
                              color: uiGreen,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Thiết lập cá nhân',
                onPressed: () => featureAlert(context, MissingFeature.profile),
                icon: const Icon(
                  Icons.settings_outlined,
                  size: 21,
                  color: uiMuted,
                ),
              ),
            ],
          ),
          if (user != null)
            Align(
              alignment: Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  label(user['role']),
                  style: const TextStyle(fontSize: 10, color: uiMuted),
                ),
              ),
            ),
          if (error != null) ErrorPanel(error!),
          if (widget.api.sessionNotice != null)
            Notice(widget.api.sessionNotice!),
          const SizedBox(height: 20),
          _Surface(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              children: [
                _ProfileStat(
                  'Chuyến đi',
                  MissingFeature.booking,
                  onTap: () => _openBookings(context, widget.api),
                ),
                Container(height: 24, width: 1, color: uiBorder),
                _ProfileStat(
                  'Đánh giá',
                  MissingFeature.reviews,
                  onTap: () =>
                      _openBookings(context, widget.api, status: 'COMPLETED'),
                ),
                Container(height: 24, width: 1, color: uiBorder),
                _ProfileStat('Địa điểm yêu thích', MissingFeature.favorites),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Surface(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (final (i, row) in [
                  (
                    'Địa điểm yêu thích',
                    Icons.favorite,
                    const Color(0xFFFA456C),
                    MissingFeature.favorites,
                  ),
                  (
                    'Lịch sử đặt dịch vụ',
                    Icons.schedule,
                    const Color(0xFF00A9EA),
                    MissingFeature.booking,
                  ),
                  (
                    'Đánh giá của tôi',
                    Icons.chat_bubble_outline,
                    const Color(0xFFEE41A2),
                    MissingFeature.reviews,
                  ),
                  (
                    'Mã giảm giá',
                    Icons.confirmation_number_outlined,
                    const Color(0xFF05BC87),
                    MissingFeature.vouchers,
                  ),
                  (
                    'Cài đặt tài khoản',
                    Icons.settings_outlined,
                    uiMuted,
                    MissingFeature.profile,
                  ),
                ].indexed) ...[
                  if (i > 0)
                    const Divider(
                      height: 1,
                      indent: 16,
                      endIndent: 16,
                      color: uiBorder,
                    ),
                  _MenuRow(
                    row.$1,
                    row.$2,
                    row.$3,
                    () =>
                        [
                          MissingFeature.booking,
                          MissingFeature.reviews,
                        ].contains(row.$4)
                        ? _openBookings(
                            context,
                            widget.api,
                            status: row.$4 == MissingFeature.reviews
                                ? 'COMPLETED'
                                : null,
                          )
                        : featureAlert(context, row.$4),
                  ),
                ],
              ],
            ),
          ),
          _SectionTitle(
            'Chuyến đi sắp tới',
            onTap: () => _openBookings(context, widget.api),
          ),
          _EmptyTripCard(
            title: 'Lịch trình của bạn',
            text: 'Xem các yêu cầu đang giữ chỗ và chuyến đi đã được hộ xác nhận.',
            icon: Icons.event_note_outlined,
            onTap: () => _openBookings(context, widget.api),
          ),
          _SectionTitle(
            'Chuyến đi đã hoàn thành',
            onTap: () =>
                _openBookings(context, widget.api, status: 'COMPLETED'),
          ),
          _EmptyTripCard(
            title: 'Những trải nghiệm đã qua',
            text: 'Mở chuyến đi đã hoàn thành để viết đánh giá.',
            icon: Icons.landscape_outlined,
            onTap: () =>
                _openBookings(context, widget.api, status: 'COMPLETED'),
          ),
          const _FeatureNote(
            'Các chỉ số “—” chưa có dữ liệu. Mục chưa triển khai sẽ hiện thông báo khi bấm.',
          ),
          if (user == null) ...[
            _PrimaryButton(
              'Đăng nhập',
              onTap: () => openAuthentication(context, widget.api),
            ),
            TextButton(
              onPressed: () =>
                  openAuthentication(context, widget.api, register: true),
              child: const Text('Tạo tài khoản khách thành viên'),
            ),
          ],
          if (user?['role'] != 'ADMIN')
            _Surface(
              padding: EdgeInsets.zero,
              child: _MenuRow(
                widget.api.isHousehold
                    ? 'Không gian hộ dân'
                    : 'Mở hồ sơ hộ dân',
                Icons.cottage_outlined,
                uiGreen,
                widget.openHost ??
                    () => _push(
                      context,
                      Scaffold(
                        appBar: AppBar(title: const Text('Không gian hộ dân')),
                        body: HouseholdDashboard(api: widget.api),
                      ),
                    ),
              ),
            ),
          if (user != null) ...[
            const SizedBox(height: 12),
            _Surface(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user['email'].toString(),
                    style: const TextStyle(fontSize: 11),
                  ),
                  if (user['phone'] != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        user['phone'].toString(),
                        style: const TextStyle(fontSize: 11, color: uiMuted),
                      ),
                    ),
                  const SizedBox(height: 6),
                  Text(
                    'Tài khoản: ${user['status'] == 'ACTIVE' ? 'Đang hoạt động' : 'Không hoạt động'}',
                    style: const TextStyle(fontSize: 10, color: uiMuted),
                  ),
                ],
              ),
            ),
            TextButton.icon(
              onPressed: busy ? null : refresh,
              icon: const Icon(Icons.refresh, size: 17),
              label: const Text('Cập nhật thông tin và quyền'),
            ),
            TextButton.icon(
              onPressed: busy ? null : logout,
              icon: const Icon(Icons.logout, size: 17),
              label: Text(busy ? 'Đang đăng xuất…' : 'Đăng xuất'),
            ),
          ],
        ],
      );
    },
  );
}

class _InitialAvatar extends StatelessWidget {
  const _InitialAvatar(this.name, {this.size = 46});
  final String name;
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: uiMint,
      shape: BoxShape.circle,
      border: Border.all(color: const Color(0xFFC8E9DD), width: 2),
    ),
    alignment: Alignment.center,
    child: Text(
      name.isEmpty ? '?' : name.characters.first.toUpperCase(),
      style: TextStyle(
        color: uiGreen,
        fontSize: size * .35,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _ProfileStat extends StatelessWidget {
  const _ProfileStat(this.title, this.feature, {this.onTap});
  final VoidCallback? onTap;
  final String title;
  final MissingFeature feature;
  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      onTap: onTap ?? () => featureAlert(context, feature),
      child: Column(
        children: [
          const Text(
            '—',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 9, color: uiMuted),
          ),
        ],
      ),
    ),
  );
}

class _MenuRow extends StatelessWidget {
  const _MenuRow(this.title, this.icon, this.color, this.onTap);
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => ListTile(
    dense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 3),
    onTap: onTap,
    leading: Container(
      padding: const EdgeInsets.all(7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .07),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, size: 17, color: color),
    ),
    title: Text(title, style: const TextStyle(fontSize: 11)),
    trailing: const Icon(Icons.chevron_right, size: 18, color: uiMuted),
  );
}

class _EmptyTripCard extends StatelessWidget {
  const _EmptyTripCard({
    required this.title,
    required this.text,
    required this.icon,
    required this.onTap,
  });
  final String title, text;
  final IconData icon;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => _Surface(
    padding: const EdgeInsets.all(12),
    onTap: onTap,
    child: Column(
      children: [
        Row(
          children: [
            Container(
              width: 62,
              height: 62,
              decoration: BoxDecoration(
                color: uiMint,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: const Color(0xFF81AE9D), size: 30),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    text,
                    style: const TextStyle(fontSize: 10, color: uiMuted),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Chưa khả dụng',
                    style: TextStyle(fontSize: 9, color: Color(0xFF9A732A)),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 34,
          child: OutlinedButton(
            onPressed: onTap,
            style: OutlinedButton.styleFrom(
              minimumSize: Size.zero,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Xem thông tin chức năng',
              style: TextStyle(fontSize: 10),
            ),
          ),
        ),
      ],
    ),
  );
}

class HouseholdDashboard extends StatefulWidget {
  const HouseholdDashboard({super.key, required this.api});
  final TourismApi api;
  @override
  State<HouseholdDashboard> createState() => _HouseholdDashboardState();
}

class _HouseholdDashboardState extends State<HouseholdDashboard> {
  late Future<Json?> future;
  late int epoch;
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
    try {
      return await widget.api.request('GET', '/households/me');
    } on ApiFailure catch (e) {
      if (e.code == 'NOT_FOUND') return null;
      rethrow;
    }
  }

  void load() {
    future = fetch();
  }

  Future<void> profile() async {
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Hồ sơ hộ dân')),
          body: HouseholdHome(api: widget.api),
        ),
      ),
    );
    if (mounted) setState(load);
  }

  void resources() => showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Padding(
            padding: EdgeInsets.all(12),
            child: Text(
              'Quản lý hoạt động',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.receipt_long_outlined),
            title: const Text('Đơn đặt và sổ tiền'),
            onTap: () {
              Navigator.pop(context);
              _openBookings(this.context, widget.api, host: true);
            },
          ),
          for (final kind in ResourceKind.values)
            ListTile(
              leading: Icon(
                kind == ResourceKind.room
                    ? Icons.bed_outlined
                    : kind == ResourceKind.place
                    ? Icons.place_outlined
                    : Icons.explore_outlined,
                color: uiGreen,
              ),
              title: Text(kind.title),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {
                Navigator.pop(context);
                _push(this.context, ResourceList(api: widget.api, kind: kind));
              },
            ),
          ListTile(
            leading: const Icon(Icons.calendar_month_outlined),
            title: const Text('Lịch và sức chứa'),
            subtitle: const Text('Khung giờ, tài nguyên và lịch chặn'),
            onTap: () {
              Navigator.pop(context);
              _push(this.context, CalendarPage(api: widget.api));
            },
          ),
        ],
      ),
    ),
  );
  @override
  Widget build(BuildContext context) {
    if (!widget.api.signedIn) {
      return ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Không gian hộ dân',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 24),
          SignInRequired(api: widget.api),
        ],
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
        if (snapshot.data == null) return HouseholdHome(api: widget.api);
        final data = snapshot.data!,
            p = object(data['profile']),
            h = object(data['household']);
        final name = p['title']?.toString() ?? 'Hộ gia đình',
            details = object(p['details']);
        return RefreshIndicator(
          onRefresh: () async {
            setState(load);
            try {
              await future;
            } catch (_) {}
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Row(
                children: [
                  _InitialAvatar(name),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Xin chào,',
                          style: TextStyle(fontSize: 11, color: uiMuted),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          name,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '⌖ ${details['locality'] ?? 'Chưa có địa phương'}',
                          style: const TextStyle(fontSize: 10, color: uiMuted),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Cập nhật thông tin hộ',
                    onPressed: profile,
                    icon: const Icon(
                      Icons.settings_outlined,
                      size: 21,
                      color: uiMuted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _Pill(
                    label(h['approvalStatus']),
                    color: uiMint,
                    onTap: profile,
                  ),
                  const Spacer(),
                  IconButton(
                    tooltip: 'Tải lại hồ sơ và quyền',
                    onPressed: () async {
                      try {
                        await widget.api.currentUser();
                        if (mounted) setState(load);
                      } catch (e) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(displayError(e))),
                          );
                        }
                      }
                    },
                    icon: const Icon(Icons.refresh, size: 18),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              for (final row in [
                [
                  (
                    'Đơn đặt mới',
                    Icons.description_outlined,
                    const Color(0xFF3E8FFF),
                  ),
                  (
                    'Lượt khách tháng này',
                    Icons.shopping_bag_outlined,
                    const Color(0xFF00C390),
                  ),
                ],
                [
                  (
                    'Doanh thu tháng này',
                    Icons.monetization_on_outlined,
                    const Color(0xFFFFA000),
                  ),
                  (
                    'Đánh giá trung bình',
                    Icons.star_rounded,
                    const Color(0xFFAE4BFE),
                  ),
                ],
              ])
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: IntrinsicHeight(
                    child: Row(
                      children: [
                        for (final (i, stat) in row.indexed) ...[
                          if (i > 0) const SizedBox(width: 12),
                          Expanded(
                            child: _Surface(
                              padding: const EdgeInsets.all(13),
                              onTap: () => stat.$1.startsWith('Đánh')
                                  ? _push(
                                      context,
                                      Scaffold(
                                        appBar: AppBar(
                                          title: const Text('Đánh giá của hộ'),
                                        ),
                                        body: ListView(
                                          padding: const EdgeInsets.all(16),
                                          children: [
                                            PublicReviewsPanel(
                                              api: widget.api,
                                              householdId: h['id'].toString(),
                                            ),
                                          ],
                                        ),
                                      ),
                                    )
                                  : featureAlert(
                                      context,
                                      MissingFeature.statistics,
                                    ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: stat.$3.withValues(alpha: .07),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Icon(
                                      stat.$2,
                                      color: stat.$3,
                                      size: 21,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        const Text(
                                          '—',
                                          style: TextStyle(
                                            fontSize: 22,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        Text(
                                          stat.$1,
                                          style: const TextStyle(
                                            fontSize: 10,
                                            color: uiMuted,
                                            height: 1.5,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _CategoryShortcut(
                    'Quản lý dịch vụ',
                    Icons.cottage_outlined,
                    const Color(0xFF00A477),
                    Colors.white,
                    widget.api.isHousehold ? resources : profile,
                  ),
                  _CategoryShortcut(
                    'Lịch đặt',
                    Icons.calendar_month_outlined,
                    const Color(0xFFFF881B),
                    Colors.white,
                    () => _openBookings(context, widget.api, host: true),
                  ),
                  _CategoryShortcut(
                    'Tin nhắn',
                    Icons.chat_bubble_outline,
                    const Color(0xFF3E8FFF),
                    Colors.white,
                    () => featureAlert(context, MissingFeature.messages),
                  ),
                  _CategoryShortcut(
                    'Cập nhật thông tin',
                    Icons.edit_outlined,
                    const Color(0xFF00BDAE),
                    Colors.white,
                    profile,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _Surface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Thống kê doanh thu',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () =>
                              featureAlert(context, MissingFeature.statistics),
                          child: const _Pill(
                            'Tháng này',
                            icon: Icons.expand_more,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '— đồng',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        color: uiGreen,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Chưa có dữ liệu thu chi',
                      style: TextStyle(fontSize: 10, color: uiMuted),
                    ),
                    const SizedBox(height: 20),
                    InkWell(
                      onTap: () =>
                          featureAlert(context, MissingFeature.statistics),
                      child: const SizedBox(
                        height: 145,
                        child: CustomPaint(
                          painter: _EmptyChart(),
                          child: Center(
                            child: Text(
                              'Biểu đồ sẽ hiển thị khi có dữ liệu',
                              style: TextStyle(fontSize: 10, color: uiMuted),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const _FeatureNote(
                'Đơn đặt, thu/hoàn tiền và đánh giá đã dùng API chung. Báo cáo biểu đồ doanh thu tổng hợp chưa triển khai.',
                feature: MissingFeature.statistics,
              ),
              _Surface(
                child: Column(
                  children: [
                    _SectionTitle(
                      'Đơn đặt sắp tới',
                      onTap: () =>
                          _openBookings(context, widget.api, host: true),
                    ),
                    _EmptyTripCard(
                      title: 'Quản lý đơn đặt',
                      text: 'Mở danh sách để xác nhận, từ chối và ghi nhận thu/hoàn tiền.',
                      icon: Icons.event_note_outlined,
                      onTap: () =>
                          _openBookings(context, widget.api, host: true),
                    ),
                  ],
                ),
              ),
              if (widget.api.isHousehold) ...[
                const _SectionTitle('Nội dung của hộ'),
                for (final kind in ResourceKind.values)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _Surface(
                      padding: EdgeInsets.zero,
                      child: _MenuRow(
                        kind.title,
                        kind == ResourceKind.room
                            ? Icons.bed_outlined
                            : kind == ResourceKind.place
                            ? Icons.place_outlined
                            : Icons.explore_outlined,
                        uiGreen,
                        () => _push(
                          context,
                          ResourceList(api: widget.api, kind: kind),
                        ),
                      ),
                    ),
                  ),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _EmptyChart extends CustomPainter {
  const _EmptyChart();
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = uiBorder
      ..strokeWidth = 1;
    for (var row = 0; row < 4; row++) {
      final y = row * (size.height - 20) / 3;
      for (double x = 0; x < size.width; x += 7) {
        canvas.drawLine(Offset(x, y), Offset(x + 3, y), paint);
      }
    }
    for (final (i, value) in ['01', '07', '14', '21', '28'].indexed) {
      final text = TextPainter(
        text: TextSpan(
          text: value,
          style: const TextStyle(fontSize: 8, color: uiMuted),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      text.paint(canvas, Offset(i * (size.width - 20) / 4, size.height - 12));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
