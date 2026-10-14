import 'package:flutter/material.dart';

import 'data.dart';
import 'motion.dart';
import 'widgets.dart';

void showPhotoGallery(BuildContext context, List<String> images, int initial) =>
    showDialog<void>(
      context: context,
      useSafeArea: false,
      builder: (_) => Dialog.fullscreen(
        backgroundColor: const Color(0xFF14231D),
        child: _Gallery(images: images, initial: initial),
      ),
    );

class _Gallery extends StatefulWidget {
  const _Gallery({required this.images, required this.initial});
  final List<String> images;
  final int initial;
  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  late final controller = PageController(initialPage: widget.initial);
  late int current = widget.initial;
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Khoảnh khắc ở bản · ${current + 1}/${widget.images.length}',
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                ),
              ),
              IconButton(
                tooltip: 'Đóng thư viện ảnh',
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: Colors.white),
              ),
            ],
          ),
        ),
        Expanded(
          child: PageView.builder(
            controller: controller,
            itemCount: widget.images.length,
            onPageChanged: (value) => setState(() => current = value),
            itemBuilder: (_, i) => InteractiveViewer(
              minScale: 1,
              maxScale: 3,
              child: Center(
                child: Photo(
                  widget.images[i],
                  fit: BoxFit.contain,
                  width: double.infinity,
                  label: 'Ảnh ${i + 1}',
                ),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton.filledTonal(
                tooltip: 'Ảnh trước',
                onPressed: current > 0
                    ? () => controller.previousPage(
                        duration: motionTime(context),
                        curve: Curves.easeOutCubic,
                      )
                    : null,
                icon: const Icon(Icons.arrow_back),
              ),
              const Expanded(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    'Vuốt để xem · Chụm để phóng to',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ),
              ),
              IconButton.filledTonal(
                tooltip: 'Ảnh sau',
                onPressed: current < widget.images.length - 1
                    ? () => controller.nextPage(
                        duration: motionTime(context),
                        curve: Curves.easeOutCubic,
                      )
                    : null,
                icon: const Icon(Icons.arrow_forward),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color = clay});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Text(
    text.toUpperCase(),
    style: TextStyle(
      fontSize: 10,
      fontWeight: FontWeight.w800,
      letterSpacing: 2,
      color: color,
      height: 1.6,
    ),
  );
}

class JourneySteps extends StatelessWidget {
  const JourneySteps({super.key, required this.current});
  final int current;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 24),
    child: Row(
      children: [
        for (final (i, label) in [
          'Chọn lịch',
          'Xác nhận',
          'Gửi yêu cầu',
        ].indexed)
          Expanded(
            child: Semantics(
              label: 'Bước ${i + 1}: $label${i == current ? ', hiện tại' : ''}',
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 2,
                          color: i == 0 ? Colors.transparent : line,
                        ),
                      ),
                      AnimatedContainer(
                        duration: motionTime(context),
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: i <= current ? green : Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: i <= current ? green : line,
                          ),
                        ),
                        alignment: Alignment.center,
                        child: i < current
                            ? const Icon(
                                Icons.check,
                                size: 17,
                                color: Colors.white,
                              )
                            : Text(
                                '${i + 1}',
                                style: TextStyle(
                                  color: i == current ? Colors.white : gray,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                      Expanded(
                        child: Container(
                          height: 2,
                          color: i == 2 ? Colors.transparent : line,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: i == current
                          ? FontWeight.w700
                          : FontWeight.w500,
                      color: i == current ? green : gray,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );
}

class HelpfulNote extends StatelessWidget {
  const HelpfulNote(
    this.title,
    this.text, {
    super.key,
    this.icon = Icons.info_outline_rounded,
  });
  final String title, text;
  final IconData icon;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: mint,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: green, size: 21),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: green,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                text,
                style: const TextStyle(fontSize: 12, color: gray, height: 1.65),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class ScenicCard extends StatelessWidget {
  const ScenicCard({
    super.key,
    required this.image,
    required this.title,
    required this.caption,
    required this.onTap,
    this.height = 280,
    this.photoSpace = 68,
    this.action = 'Khám phá ngay',
  });
  final String image, title, caption, action;
  final double height;
  final double photoSpace;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => TouchFeedback(
    child: Material(
      clipBehavior: Clip.antiAlias,
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(28),
        topRight: Radius.circular(70),
        bottomLeft: Radius.circular(28),
        bottomRight: Radius.circular(28),
      ),
      child: InkWell(
        onTap: onTap,
        child: Stack(
          children: [
            Positioned.fill(child: Photo(image)),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: .02),
                      green.withValues(alpha: .92),
                    ],
                    stops: const [.1, 1],
                  ),
                ),
              ),
            ),
            ConstrainedBox(
              constraints: BoxConstraints(minHeight: height),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(height: photoSpace),
                    Eyebrow(caption, color: lime),
                    const SizedBox(height: 9),
                    Text(
                      title,
                      style: editorial.copyWith(
                        color: Colors.white,
                        fontSize: 32,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            action,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const CircleAvatar(
                          backgroundColor: lime,
                          radius: 23,
                          child: Icon(
                            Icons.north_east_rounded,
                            color: green,
                            size: 23,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

void openStory(
  BuildContext context, {
  required String image,
  required String title,
  required String text,
  required VoidCallback action,
  String actionLabel = 'Khám phá trải nghiệm',
}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (sheet) => DraggableScrollableSheet(
      initialChildSize: .85,
      minChildSize: .5,
      maxChildSize: .94,
      expand: false,
      builder: (_, scroll) => ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        children: [
          Row(
            children: [
              const Expanded(child: Eyebrow('Chuyện ở bản')),
              IconButton(
                tooltip: 'Đóng câu chuyện',
                onPressed: () => Navigator.pop(sheet),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          Photo(
            image,
            height: 260,
            width: double.infinity,
            radius: 26,
            label: title,
          ),
          const SizedBox(height: 24),
          Text(title, style: editorial),
          const SizedBox(height: 16),
          Text(
            text,
            style: const TextStyle(fontSize: 15, height: 1.85, color: gray),
          ),
          const SizedBox(height: 24),
          PrimaryAction(
            label: actionLabel,
            onPressed: () {
              Navigator.pop(sheet);
              action();
            },
          ),
        ],
      ),
    ),
  );
}

class LocalStories extends StatelessWidget {
  const LocalStories({super.key, required this.store});
  final TourismStore store;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      const Section('Chuyện kể từ bản'),
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (i, story) in [
            (
              'craft',
              'Sắc chàm trên\nnhững ngón tay',
              'NGHỀ THỦ CÔNG',
              'Từ một sợi lanh đến tấm vải chàm là cả sự kiên nhẫn. Cùng người dân tìm hiểu hoa văn, thử dệt và nghe những câu chuyện được truyền qua nhiều thế hệ.',
            ),
            (
              'food',
              'Một bữa cơm,\nnhiều câu chuyện',
              'ẨM THỰC BẢN ĐỊA',
              'Chậm lại bên bếp lửa, cùng chuẩn bị nguyên liệu và nấu một bữa cơm địa phương. Hỏi chủ hộ về món ăn theo mùa và báo trước nếu bạn có dị ứng thực phẩm.',
            ),
          ].indexed)
            Expanded(
              child: Padding(
                padding: EdgeInsets.only(
                  left: i == 1 ? 8 : 0,
                  right: i == 0 ? 8 : 0,
                  top: i == 1 ? 32 : 0,
                ),
                child: TouchFeedback(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(24),
                    onTap: () => openStory(
                      context,
                      image: story.$1,
                      title: story.$2.replaceAll('\n', ' '),
                      text: story.$4,
                      action: () {
                        store.select(store.offers[i == 0 ? 3 : 1]);
                        go(context, 4);
                      },
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.vertical(
                            top: Radius.circular(i == 0 ? 90 : 24),
                            bottom: Radius.circular(i == 0 ? 24 : 90),
                          ),
                          child: Photo(
                            story.$1,
                            height: 200,
                            width: double.infinity,
                          ),
                        ),
                        const SizedBox(height: 14),
                        Eyebrow(story.$3),
                        const SizedBox(height: 8),
                        Text(story.$2, style: editorial.copyWith(fontSize: 21)),
                        const SizedBox(height: 10),
                        const Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(
                              'Đọc câu chuyện',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Icon(Icons.arrow_forward, size: 16),
                          ],
                        ),
                        const SizedBox(height: 12),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    ],
  );
}
