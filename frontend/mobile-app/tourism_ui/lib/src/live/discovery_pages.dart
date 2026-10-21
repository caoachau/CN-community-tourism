part of 'app.dart';

class PublicCatalog extends StatefulWidget {
  const PublicCatalog({super.key, required this.api});
  final TourismApi api;
  @override
  State<PublicCatalog> createState() => _PublicCatalogState();
}

class _PublicCatalogState extends State<PublicCatalog> {
  late Future<List<_Listing>> future;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    future =
        Future.wait(
          [PublicKind.room, PublicKind.service].map((kind) async {
            final data = await widget.api.request(
              'GET',
              '/public/${kind.path}',
              query: {'page': 1, 'pageSize': 20},
              authenticated: false,
            );
            return records(data['items'])
                .map((row) => _Listing(kind, row))
                .toList();
          }),
        ).then((groups) {
          final result = <_Listing>[];
          for (
            var i = 0;
            i < groups.map((g) => g.length).fold<int>(0, math.max);
            i++
          ) {
            for (final group in groups) {
              if (i < group.length) result.add(group[i]);
            }
          }
          return result;
        });
  }

  void search({PublicKind? kind, String query = ''}) => _push(
    context,
    SearchResults(api: widget.api, initialKind: kind, initialQuery: query),
  );
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async {
      setState(load);
      try {
        await future;
      } catch (_) {}
    },
    child: ListView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      children: [
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () => search(kind: PublicKind.place),
                borderRadius: BorderRadius.circular(12),
                child: const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 13,
                        backgroundColor: uiMint,
                        child: Icon(
                          Icons.location_on,
                          size: 18,
                          color: Color(0xFF00A878),
                        ),
                      ),
                      SizedBox(width: 7),
                      Flexible(
                        child: Text(
                          'Khám phá Việt Nam',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      SizedBox(width: 4),
                      Icon(Icons.expand_more, size: 18, color: uiMuted),
                    ],
                  ),
                ),
              ),
            ),
            IconButton(
              tooltip: 'Thông báo',
              onPressed: () =>
                  featureAlert(context, MissingFeature.notifications),
              style: IconButton.styleFrom(
                backgroundColor: Colors.white,
                side: const BorderSide(color: uiBorder),
                minimumSize: const Size(38, 38),
              ),
              icon: const Icon(Icons.notifications_none, size: 21),
            ),
          ],
        ),
        const SizedBox(height: 6),
        _SearchEntry(onTap: search),
        const SizedBox(height: 16),
        ClipRRect(
          borderRadius: BorderRadius.circular(17),
          child: SizedBox(
            height:
                164 * math.max(1, MediaQuery.textScalerOf(context).scale(1)),
            child: Stack(
              fit: StackFit.expand,
              children: [
                const Photo('terraces'),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [Color(0xC00B261D), Color(0x30162D17)],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: uiGreen.withValues(alpha: .7),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: const Text(
                          'BẢN SẮC VIỆT NAM',
                          style: TextStyle(
                            color: Color(0xFF70EFBC),
                            fontSize: 9,
                            letterSpacing: .6,
                          ),
                        ),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'Du lịch cộng đồng',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          fontSize: 15,
                        ),
                      ),
                      const Text(
                        'Sống thật giữa thiên nhiên',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF37E7AA),
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        'Gặp gỡ người bản địa · Trải nghiệm văn hóa',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Color(0xFFE1EBE6),
                          fontSize: 10,
                        ),
                      ),
                      const Spacer(),
                      SizedBox(
                        height: 30,
                        child: FilledButton(
                          onPressed: search,
                          style: FilledButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: uiInk,
                            minimumSize: Size.zero,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Khám phá ngay',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(width: 5),
                              Icon(Icons.arrow_forward, size: 14),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _CategoryShortcut(
              'Lưu trú',
              Icons.home_rounded,
              const Color(0xFF00A477),
              uiMint,
              () => search(kind: PublicKind.room),
            ),
            _CategoryShortcut(
              'Ẩm thực',
              Icons.restaurant,
              const Color(0xFFF49D00),
              const Color(0xFFFFFAE9),
              () => search(kind: PublicKind.service, query: 'ẩm thực'),
            ),
            _CategoryShortcut(
              'Trải nghiệm',
              Icons.landscape,
              const Color(0xFF09A5E5),
              const Color(0xFFF0F9FF),
              () => search(kind: PublicKind.service),
            ),
            _CategoryShortcut(
              'Hướng dẫn',
              Icons.groups_rounded,
              const Color(0xFF9336EE),
              const Color(0xFFFAF3FF),
              () => search(kind: PublicKind.service, query: 'hướng dẫn'),
            ),
          ],
        ),
        _SectionTitle('Dịch vụ & trải nghiệm', onTap: search),
        FutureBuilder<List<_Listing>>(
          future: future,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return ErrorPanel(snapshot.error!, retry: () => setState(load));
            }
            if (!snapshot.hasData) {
              return const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            final items = snapshot.data!.take(8).toList();
            if (items.isEmpty) {
              return const EmptyPanel(
                'Chưa có nội dung phù hợp được công khai.',
              );
            }
            return LayoutBuilder(
              builder: (context, box) {
                final single =
                    box.maxWidth < 310 ||
                    MediaQuery.textScalerOf(context).scale(1) > 1.4;
                return Column(
                  children: [
                    for (var i = 0; i < items.length; i += single ? 1 : 2)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: IntrinsicHeight(
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Expanded(
                                child: _ListingCard(
                                  api: widget.api,
                                  item: items[i],
                                  compact: true,
                                ),
                              ),
                              if (!single) ...[
                                const SizedBox(width: 12),
                                Expanded(
                                  child: i + 1 < items.length
                                      ? _ListingCard(
                                          api: widget.api,
                                          item: items[i + 1],
                                          compact: true,
                                        )
                                      : const SizedBox(),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                  ],
                );
              },
            );
          },
        ),
        const _FeatureNote(
          'Ảnh minh họa từ bộ thiết kế. Tên, giá và thông tin cung cấp lấy từ nội dung đã được duyệt.',
        ),
      ],
    ),
  );
}

class _SearchEntry extends StatelessWidget {
  const _SearchEntry({required this.onTap});
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => _Surface(
    padding: EdgeInsets.zero,
    onTap: onTap,
    child: const Padding(
      padding: EdgeInsets.symmetric(horizontal: 13, vertical: 13),
      child: Row(
        children: [
          Icon(Icons.search, size: 21, color: Color(0xFF94A8C2)),
          SizedBox(width: 9),
          Expanded(
            child: Text(
              'Tìm lưu trú, trải nghiệm, ẩm thực…',
              style: TextStyle(fontSize: 11, color: Color(0xFF94A8C2)),
            ),
          ),
          Icon(Icons.tune, size: 20, color: uiMuted),
        ],
      ),
    ),
  );
}

class _CategoryShortcut extends StatelessWidget {
  const _CategoryShortcut(
    this.title,
    this.icon,
    this.color,
    this.fill,
    this.onTap,
  );
  final String title;
  final IconData icon;
  final Color color, fill;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: fill,
              borderRadius: BorderRadius.circular(17),
              border: Border.all(color: color.withValues(alpha: .07)),
            ),
            child: Icon(icon, color: color, size: 26),
          ),
          const SizedBox(height: 7),
          Text(
            title,
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    ),
  );
}

class SearchResults extends StatefulWidget {
  const SearchResults({
    super.key,
    required this.api,
    this.initialKind,
    this.initialQuery = '',
  });
  final TourismApi api;
  final PublicKind? initialKind;
  final String initialQuery;
  @override
  State<SearchResults> createState() => _SearchResultsState();
}

class _SearchResultsState extends State<SearchResults> {
  late PublicKind? kind = widget.initialKind;
  late final search = TextEditingController(text: widget.initialQuery);
  Json filters = {};
  int page = 1;
  late Future<({List<_Listing> rows, int total, bool more})> future;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  void load() {
    future =
        Future.wait(
          (kind == null ? [PublicKind.room, PublicKind.service] : [kind!]).map((
            k,
          ) async {
            final data = await widget.api.request(
              'GET',
              '/public/${k.path}',
              authenticated: false,
              query: {
                ...filters,
                'page': page,
                'pageSize': 20,
                if (search.text.trim().isNotEmpty) 'q': search.text.trim(),
              },
            );
            return (
              rows: records(data['items']).map((r) => _Listing(k, r)).toList(),
              total: data['total'] as int,
              more: page * 20 < (data['total'] as int),
            );
          }),
        ).then(
          (results) => (
            rows: results.expand((r) => r.rows).toList(),
            total: results.fold<int>(0, (n, r) => n + r.total),
            more: results.any((r) => r.more),
          ),
        );
  }

  void change(PublicKind? value) => setState(() {
    kind = value;
    filters = {};
    page = 1;
    load();
  });
  Future<void> filter() async {
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: 'Bộ lọc tìm kiếm',
          initial: filters,
          memberOnly: false,
          fields: [
            if (kind == PublicKind.room) ...const [
              FieldSpec(
                'guests',
                'Số khách',
                kind: InputKind.integer,
                min: 1,
                max: 1000,
              ),
              FieldSpec(
                'minPriceVnd',
                'Giá tối thiểu mỗi đêm (VND)',
                kind: InputKind.integer,
              ),
              FieldSpec(
                'maxPriceVnd',
                'Giá tối đa mỗi đêm (VND)',
                kind: InputKind.integer,
              ),
            ],
            if (kind == PublicKind.service) ...const [
              FieldSpec(
                'categoryId',
                'Danh mục',
                kind: InputKind.reference,
                source: ReferenceSource(
                  '/public/categories',
                  query: {'kind': 'SERVICE'},
                  public: true,
                ),
              ),
              FieldSpec(
                'pricingType',
                'Cách tính tiền',
                kind: InputKind.choice,
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
                'participationMode',
                'Cách tham gia',
                kind: InputKind.choice,
                choices: {'SHARED': 'Bán ghép', 'EXCLUSIVE': 'Thuê riêng'},
              ),
            ],
            if (kind == PublicKind.place)
              const FieldSpec('locality', 'Địa phương', maxLength: 200),
          ],
          action: 'Áp dụng bộ lọc',
          validatePayload: (d) =>
              d['minPriceVnd'] != null &&
                  d['maxPriceVnd'] != null &&
                  (d['minPriceVnd'] as int) > (d['maxPriceVnd'] as int)
              ? 'Giá tối thiểu không được lớn hơn tối đa.'
              : null,
          save: (d) async => d,
        ),
      ),
    );
    if (result != null && mounted) {
      setState(() {
        filters = result;
        page = 1;
        load();
      });
    }
  }

  void openFilter() {
    if (kind == null) {
      setState(() {
        kind = PublicKind.room;
        page = 1;
        load();
      });
    }
    filter();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      titleSpacing: 0,
      title: TextField(
        controller: search,
        maxLength: 100,
        decoration: InputDecoration(
          counterText: '',
          hintText: 'Tên dịch vụ, điểm đến…',
          prefixIcon: const Icon(Icons.search, size: 19),
          suffixIcon: IconButton(
            tooltip: 'Xóa tìm kiếm',
            icon: const Icon(Icons.cancel, size: 17, color: uiMuted),
            onPressed: () => setState(() {
              search.clear();
              page = 1;
              load();
            }),
          ),
        ),
        style: const TextStyle(fontSize: 12),
        textInputAction: TextInputAction.search,
        onSubmitted: (_) => setState(() {
          page = 1;
          load();
        }),
      ),
      actions: [
        IconButton(
          tooltip: 'Bộ lọc',
          onPressed: openFilter,
          icon: const Icon(Icons.tune),
        ),
      ],
    ),
    body: Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              for (final entry in <(PublicKind?, String)>[
                (null, 'Tất cả'),
                (PublicKind.room, 'Lưu trú'),
                (PublicKind.service, 'Trải nghiệm'),
                (PublicKind.place, 'Điểm phục vụ'),
              ])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _Pill(
                    entry.$2,
                    active: kind == entry.$1,
                    onTap: () => change(entry.$1),
                  ),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
          child: Row(
            children: [
              _Pill(
                'Lọc${filters.isEmpty ? '' : ' (${filters.length})'}',
                icon: Icons.filter_alt_outlined,
                onTap: openFilter,
                color: uiMint,
              ),
              const SizedBox(width: 8),
              _Pill(
                'Phổ biến',
                icon: Icons.sort,
                onTap: () => featureAlert(context, MissingFeature.sorting),
              ),
              const Spacer(),
              IconButton(
                tooltip: 'Bản đồ',
                onPressed: () => featureAlert(
                  context,
                  MissingFeature.map,
                  preview: () => _push(context, _ReferenceMap(api: widget.api)),
                ),
                icon: const Icon(Icons.map_outlined, color: uiGreen),
              ),
            ],
          ),
        ),
        if (filters.isNotEmpty)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () => setState(() {
                filters = {};
                page = 1;
                load();
              }),
              child: const Text('Xóa bộ lọc'),
            ),
          ),
        Expanded(
          child: FutureBuilder<({List<_Listing> rows, int total, bool more})>(
            future: future,
            builder: (context, snapshot) {
              if (snapshot.hasError) {
                return Padding(
                  padding: const EdgeInsets.all(16),
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
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 86),
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Tìm thấy ${data.total} kết quả',
                      style: const TextStyle(fontSize: 12, color: uiMuted),
                    ),
                  ),
                  if (data.rows.isEmpty)
                    const EmptyPanel(
                      'Chưa có nội dung phù hợp. Hãy đổi từ khóa hoặc bộ lọc.',
                    ),
                  for (final row in data.rows)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: _ListingCard(api: widget.api, item: row),
                    ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        tooltip: 'Trang trước',
                        onPressed: page > 1
                            ? () => setState(() {
                                page--;
                                load();
                              })
                            : null,
                        icon: const Icon(Icons.chevron_left),
                      ),
                      Text('Trang $page', style: const TextStyle(fontSize: 12)),
                      IconButton(
                        tooltip: 'Trang sau',
                        onPressed: data.more
                            ? () => setState(() {
                                page++;
                                load();
                              })
                            : null,
                        icon: const Icon(Icons.chevron_right),
                      ),
                    ],
                  ),
                ],
              );
            },
          ),
        ),
      ],
    ),
    floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    floatingActionButton: FloatingActionButton.extended(
      backgroundColor: uiGreen,
      foregroundColor: Colors.white,
      onPressed: () => featureAlert(
        context,
        MissingFeature.map,
        preview: () => _push(context, _ReferenceMap(api: widget.api)),
      ),
      icon: const Icon(Icons.map_outlined, size: 19),
      label: const Text('Bản đồ', style: TextStyle(fontSize: 12)),
    ),
  );
}
