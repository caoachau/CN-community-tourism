part of 'app.dart';

class _ReferenceMap extends StatefulWidget {
  const _ReferenceMap({required this.api, this.selected});
  final TourismApi api;
  final _Listing? selected;
  @override
  State<_ReferenceMap> createState() => _ReferenceMapState();
}

class _ReferenceMapState extends State<_ReferenceMap> {
  PublicKind kind = PublicKind.room;
  late Future<List<_Listing>> future;
  int selected = 0;
  @override
  void initState() {
    super.initState();
    kind = widget.selected?.kind ?? PublicKind.room;
    load();
  }

  void load() {
    future = widget.api
        .request(
          'GET',
          '/public/${kind.path}',
          authenticated: false,
          query: {'page': 1, 'pageSize': 20},
        )
        .then(
          (d) => records(d['items']).map((r) => _Listing(kind, r)).toList(),
        );
    selected = 0;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(
      fit: StackFit.expand,
      children: [
        const CustomPaint(painter: _ReferenceMapPainter()),
        LayoutBuilder(
          builder: (context, box) => Stack(
            children: [
              for (final (i, pin) in [
                (const Offset(.68, .28), Icons.cottage_outlined, uiGreen),
                (const Offset(.37, .38), Icons.home_outlined, uiGreen),
                (
                  const Offset(.78, .52),
                  Icons.explore_outlined,
                  const Color(0xFF9556FF),
                ),
                (
                  const Offset(.67, .66),
                  Icons.restaurant,
                  const Color(0xFFF46D00),
                ),
                (const Offset(.37, .62), Icons.cottage_outlined, uiGreen),
              ].indexed)
                Positioned(
                  left: box.maxWidth * pin.$1.dx - 20,
                  top: box.maxHeight * pin.$1.dy,
                  child: Semantics(
                    label: 'Điểm minh họa ${i + 1}',
                    button: true,
                    child: InkWell(
                      onTap: () => featureAlert(context, MissingFeature.map),
                      child: Container(
                        width: i == 0 ? 46 : 34,
                        height: i == 0 ? 46 : 34,
                        decoration: BoxDecoration(
                          color: pin.$3,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: uiGreen.withValues(alpha: .15),
                              blurRadius: 7,
                            ),
                          ],
                        ),
                        child: Icon(
                          pin.$2,
                          size: i == 0 ? 25 : 19,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              Positioned(
                left: box.maxWidth * .43,
                top: box.maxHeight * .46,
                child: const Column(
                  children: [
                    Text(
                      'Cộng đồng',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      'Sơ đồ minh họa',
                      style: TextStyle(fontSize: 9, color: uiMuted),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Column(
              children: [
                Row(
                  children: [
                    _RoundButton(
                      Icons.arrow_back_ios_new,
                      'Quay lại',
                      () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _SearchEntry(
                        onTap: () =>
                            _push(context, SearchResults(api: widget.api)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    for (final k in [
                      PublicKind.room,
                      PublicKind.service,
                      PublicKind.place,
                    ])
                      Padding(
                        padding: const EdgeInsets.only(right: 7),
                        child: _Pill(
                          k.title,
                          active: k == kind,
                          color: Colors.white,
                          onTap: () => setState(() {
                            kind = k;
                            load();
                          }),
                        ),
                      ),
                  ],
                ),
                const _FeatureNote(
                  'Bản đồ minh họa · Các ghim không phải vị trí thực tế.',
                  feature: MissingFeature.map,
                ),
                const Spacer(),
                Align(
                  alignment: Alignment.centerLeft,
                  child: _RoundButton(
                    Icons.my_location,
                    'Vị trí của tôi',
                    () => featureAlert(context, MissingFeature.map),
                  ),
                ),
                const SizedBox(height: 14),
                FutureBuilder<List<_Listing>>(
                  future: future,
                  builder: (context, snapshot) {
                    if (snapshot.hasError) {
                      return _Surface(
                        child: ErrorPanel(
                          snapshot.error!,
                          retry: () => setState(load),
                        ),
                      );
                    }
                    if (!snapshot.hasData) {
                      return const _Surface(
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    final rows = snapshot.data!;
                    if (rows.isEmpty) {
                      return const _Surface(
                        child: Text(
                          'Chưa có nội dung công khai trong nhóm này.',
                          style: TextStyle(fontSize: 12),
                        ),
                      );
                    }
                    final item =
                        selected == 0 &&
                            widget.selected != null &&
                            widget.selected!.kind == kind
                        ? widget.selected!
                        : rows[selected % rows.length];
                    return _Surface(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: Photo(
                              item.kind == PublicKind.room ? 'pao' : item.image,
                              width: 102,
                              height: 110,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        item.title,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    SizedBox(
                                      width: 26,
                                      height: 28,
                                      child: IconButton(
                                        tooltip: 'Địa điểm tiếp',
                                        padding: EdgeInsets.zero,
                                        onPressed: () =>
                                            setState(() => selected++),
                                        icon: const Icon(
                                          Icons.chevron_right,
                                          size: 17,
                                          color: uiMuted,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 7),
                                Text(
                                  '⌖ ${item.locality}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: uiMuted,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  item.kind.title,
                                  style: const TextStyle(
                                    fontSize: 9,
                                    color: uiGreen,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    _Price(item),
                                    FilledButton(
                                      style: FilledButton.styleFrom(
                                        minimumSize: const Size(90, 32),
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                        ),
                                      ),
                                      onPressed: () => _push(
                                        context,
                                        PublicDetail(
                                          api: widget.api,
                                          kind: item.kind,
                                          id: item.id,
                                        ),
                                      ),
                                      child: const Row(
                                        children: [
                                          Text(
                                            'Xem chi tiết',
                                            style: TextStyle(fontSize: 10),
                                          ),
                                          Icon(Icons.chevron_right, size: 16),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

class _ReferenceMapPainter extends CustomPainter {
  const _ReferenceMapPainter();
  @override
  void paint(Canvas canvas, Size s) {
    canvas.drawRect(Offset.zero & s, Paint()..color = const Color(0xFFEBF4E5));
    final contour = Paint()
      ..color = const Color(0xFFD8EACD)
      ..strokeWidth = 1.3
      ..style = PaintingStyle.stroke;
    for (var i = -4; i < 13; i++) {
      final path = Path()
        ..moveTo(-40, i * 75.0)
        ..cubicTo(
          s.width * .6,
          i * 75.0 - 110,
          s.width * .5,
          i * 75.0 + 170,
          s.width + 40,
          i * 75.0 + 70,
        );
      canvas.drawPath(path, contour);
    }
    for (final center in [
      Offset(s.width * .8, s.height * .28),
      Offset(s.width * .2, s.height * .65),
    ]) {
      for (var i = 0; i < 6; i++) {
        canvas.drawOval(
          Rect.fromCenter(
            center: center,
            width: 80 + i * 62,
            height: 100 + i * 92,
          ),
          contour,
        );
      }
    }
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(s.width * .52, s.height * .51),
        width: 65,
        height: 150,
      ),
      Paint()..color = const Color(0xFFD4E5C7),
    );
    final road = Path()
      ..moveTo(-20, s.height * .29)
      ..cubicTo(
        s.width * .4,
        s.height * .3,
        s.width * .59,
        s.height * .4,
        s.width * .65,
        s.height * .55,
      )
      ..cubicTo(
        s.width * .7,
        s.height * .65,
        s.width * .82,
        s.height * .86,
        s.width * .94,
        s.height + 30,
      );
    canvas.drawPath(
      road,
      Paint()
        ..color = Colors.white
        ..strokeWidth = 9
        ..style = PaintingStyle.stroke,
    );
    canvas.drawPath(
      road,
      Paint()
        ..color = const Color(0xFFF8E3AC)
        ..strokeWidth = 5
        ..style = PaintingStyle.stroke,
    );
    final path = Path()
      ..moveTo(s.width * .2, s.height * .73)
      ..cubicTo(
        s.width * .15,
        s.height * .45,
        s.width * .9,
        s.height * .38,
        s.width + 20,
        s.height * .24,
      );
    canvas.drawPath(
      path,
      Paint()
        ..color = Colors.white
        ..strokeWidth = 4
        ..style = PaintingStyle.stroke,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
