import 'package:flutter/material.dart';

import 'data.dart';
import 'editorial.dart';
import 'motion.dart';
import 'widgets.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key, required this.store});
  final TourismStore store;
  Future<void> login(BuildContext context, {bool register = false}) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(register ? 'Đăng ký tài khoản' : 'Đăng nhập'),
        content: const Text(
          'Dùng tài khoản minh họa để khám phá giao diện. Bản demo chưa kết nối đăng nhập thực tế.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Để sau'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Dùng tài khoản demo'),
          ),
        ],
      ),
    );
    if (accepted == true && context.mounted) {
      store.signedIn = true;
      store.changed();
      Navigator.pushReplacementNamed(context, '/m2');
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: LayoutBuilder(
      builder: (context, size) => SingleChildScrollView(
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: size.maxHeight),
          child: Column(
            children: [
              SizedBox(
                height: (size.maxHeight * .53).clamp(300, 500),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    const Photo(
                      'welcome',
                      label: 'Ruộng bậc thang và núi rừng Sa Pa',
                    ),
                    DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: .45),
                            Colors.transparent,
                            green.withValues(alpha: .28),
                          ],
                        ),
                      ),
                    ),
                    SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(
                                  Icons.spa_outlined,
                                  color: Colors.white,
                                  size: 29,
                                ),
                                SizedBox(width: 10),
                                Text(
                                  'nếp.',
                                  style: TextStyle(
                                    fontSize: 29,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                    letterSpacing: -1,
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            Row(
                              children: [
                                Flexible(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 13,
                                      vertical: 9,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(
                                        alpha: .94,
                                      ),
                                      borderRadius: BorderRadius.circular(30),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.location_on_outlined,
                                          size: 16,
                                          color: green,
                                        ),
                                        SizedBox(width: 5),
                                        Flexible(
                                          child: Text(
                                            'Tả Van, Sa Pa',
                                            style: TextStyle(
                                              fontSize: 12,
                                              color: green,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Transform.rotate(
                                  angle: .1,
                                  child: Container(
                                    padding: const EdgeInsets.all(5),
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: const Photo(
                                      'food',
                                      width: 78,
                                      height: 88,
                                      radius: 13,
                                    ),
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
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 25, 24, 8),
                child: Reveal(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Eyebrow('Những hành trình có con người'),
                      const SizedBox(height: 12),
                      Text.rich(
                        TextSpan(
                          children: [
                            const TextSpan(text: 'Khám phá\nViệt Nam '),
                            TextSpan(
                              text: 'thật khác.',
                              style: editorial.copyWith(
                                fontSize: 36,
                                color: clay,
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                        ),
                        style: editorial.copyWith(fontSize: 36),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Ở trong một ngôi nhà. Sống cùng một câu chuyện.\nGặp Việt Nam qua những người gọi nơi này là nhà.',
                        style: TextStyle(
                          fontSize: 13,
                          color: gray,
                          height: 1.8,
                        ),
                      ),
                      const SizedBox(height: 24),
                      PrimaryAction(
                        label: 'Khám phá ngay',
                        onPressed: () =>
                            Navigator.pushReplacementNamed(context, '/m2'),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          TextButton(
                            onPressed: () => login(context),
                            child: const Text('Đăng nhập'),
                          ),
                          Container(width: 1, height: 16, color: line),
                          TextButton(
                            onPressed: () => login(context, register: true),
                            child: const Text('Đăng ký'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SafeArea(
                top: false,
                child: Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text(
                    'Du lịch cộng đồng · Gần gũi & trọn vẹn',
                    style: TextStyle(fontSize: 11, color: gray),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class DiscoverScreen extends StatelessWidget {
  const DiscoverScreen({super.key, required this.store});
  final TourismStore store;
  void category(BuildContext context, String label) =>
      Navigator.pushNamed(context, '/m3', arguments: label);
  @override
  Widget build(BuildContext context) => Scaffold(
    bottomNavigationBar: const CustomerNav(selected: 0),
    body: SafeArea(
      bottom: false,
      child: ListenableBuilder(
        listenable: store,
        builder: (context, _) => ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          children: [
            Reveal(
              child: Row(
                children: [
                  const Icon(Icons.spa_outlined, color: green, size: 26),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'nếp.',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 27,
                        letterSpacing: -1,
                      ),
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () => go(context, 5),
                    icon: const Icon(Icons.location_on_outlined, size: 16),
                    label: const Text('Sa Pa', style: TextStyle(fontSize: 12)),
                  ),
                  IconButton.outlined(
                    tooltip: 'Thông báo',
                    onPressed: () => showModalBottomSheet<void>(
                      context: context,
                      showDragHandle: true,
                      builder: (sheet) => SafeArea(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Thông báo', style: editorial),
                              const SizedBox(height: 18),
                              for (final notice in store.notices)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 16),
                                  child: HelpfulNote(
                                    'Hành trình của bạn',
                                    notice,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    icon: const Icon(
                      Icons.notifications_none_rounded,
                      size: 22,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Reveal(
              order: 1,
              child: Text.rich(
                TextSpan(
                  children: [
                    const TextSpan(text: 'Đi để gần nhau\n'),
                    TextSpan(
                      text: 'hơn một chút.',
                      style: editorial.copyWith(
                        fontSize: 36,
                        color: clay,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
                style: editorial.copyWith(fontSize: 36),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Những mái nhà ấm. Những trải nghiệm thật.',
              style: TextStyle(fontSize: 13, color: gray, height: 1.6),
            ),
            const SizedBox(height: 22),
            Reveal(
              order: 2,
              child: Material(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () => go(context, 3),
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Row(
                      children: [
                        const Padding(
                          padding: EdgeInsets.all(8),
                          child: Icon(Icons.search_rounded, color: green),
                        ),
                        const Expanded(
                          child: Text(
                            'Bạn muốn trải nghiệm gì?',
                            style: TextStyle(color: gray, fontSize: 13),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.all(11),
                          decoration: BoxDecoration(
                            color: lime,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: const Icon(
                            Icons.tune_rounded,
                            color: green,
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 22),
            Reveal(
              order: 3,
              child: ScenicCard(
                image: 'terraces',
                title: 'Một sớm\nở Tả Van',
                caption: 'Bản nhỏ · Những điều lớn lao',
                action: 'Tìm một chốn bình yên',
                onTap: () => category(context, 'Homestay'),
              ),
            ),
            const SizedBox(height: 25),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final item in [
                  (Icons.cottage_outlined, 'Homestay'),
                  (Icons.restaurant_outlined, 'Ẩm thực'),
                  (Icons.landscape_outlined, 'Trải nghiệm'),
                  (Icons.hiking_rounded, 'Hướng dẫn'),
                ])
                  Expanded(
                    child: TouchFeedback(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(20),
                        onTap: () => category(context, item.$2),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Column(
                            children: [
                              Container(
                                width: 57,
                                height: 57,
                                decoration: BoxDecoration(
                                  color: item.$2 == 'Homestay'
                                      ? green
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Icon(
                                  item.$1,
                                  color: item.$2 == 'Homestay' ? lime : green,
                                  size: 26,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Text(
                                item.$2,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Section(
              'Điều đáng trải nghiệm',
              action: 'Xem tất cả',
              onTap: () => go(context, 3),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              child: IntrinsicHeight(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final offer
                        in store.offers.where((o) => o.available).take(4))
                      Container(
                        width: 248,
                        margin: const EdgeInsets.only(right: 14),
                        child: OfferTile(store: store, offer: offer),
                      ),
                  ],
                ),
              ),
            ),
            LocalStories(store: store),
            const SizedBox(height: 26),
            Panel(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  const Photo(
                    'pao_landscape',
                    height: 175,
                    width: double.infinity,
                  ),
                  Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Eyebrow('Gặp người giữ hồn bản'),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Photo(
                              'host',
                              width: 55,
                              height: 55,
                              radius: 28,
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Nhà của Pao',
                                    style: editorial.copyWith(fontSize: 26),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Bản Tả Van, Sa Pa',
                                    style: TextStyle(color: gray, fontSize: 12),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          '“Mong bạn đến như một người khách,\nvà trở về như một người thân.”',
                          style: TextStyle(
                            fontSize: 14,
                            color: gray,
                            height: 1.8,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                        const SizedBox(height: 18),
                        PrimaryAction(
                          label: 'Ghé thăm nhà Pao',
                          onPressed: () {
                            store.select(store.offers.first);
                            go(context, 4);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Section('Chậm lại giữa thiên nhiên'),
            ScenicCard(
              image: 'trek',
              title: 'Theo lối mòn,\nchạm miền xanh.',
              caption: 'Đi cùng người bản địa',
              action: 'Tìm hành trình của bạn',
              onTap: () => category(context, 'Hướng dẫn'),
            ),
            const SizedBox(height: 24),
            const HelpfulNote(
              'Một chuyến đi, nhiều điều tốt',
              'Tôn trọng văn hóa địa phương, hạn chế rác nhựa và hỏi trước khi chụp ảnh người dân.',
              icon: Icons.eco_outlined,
            ),
            const SizedBox(height: 20),
            const Center(
              child: Text(
                'Nếp sống bản địa. Kỷ niệm của riêng bạn.',
                style: TextStyle(color: gray, fontSize: 11),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
