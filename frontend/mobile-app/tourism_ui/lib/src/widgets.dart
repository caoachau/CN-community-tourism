import 'package:flutter/material.dart';

import 'data.dart';
import 'motion.dart';

const green = Color(0xFF193D32),
    mint = Color(0xFFEAF0DF),
    bg = Color(0xFFF7F6F0),
    ink = Color(0xFF202F28),
    gray = Color(0xFF5E6B62),
    line = Color(0xFFE3E6DC),
    lime = Color(0xFFDAE9B8),
    clay = Color(0xFFA75B38);
const editorial = TextStyle(
  fontFamily: 'packages/tourism_ui/Playfair',
  fontSize: 30,
  height: 1.2,
  fontWeight: FontWeight.w500,
  color: ink,
);

class PairGrid extends StatelessWidget {
  const PairGrid({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) {
    if (MediaQuery.textScalerOf(context).scale(1) > 1.5) {
      return Column(
        children: [
          for (final child in children)
            Padding(padding: const EdgeInsets.only(bottom: 12), child: child),
        ],
      );
    }
    return Column(
      children: [
        for (var i = 0; i < children.length; i += 2)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(child: children[i]),
                  const SizedBox(width: 12),
                  Expanded(
                    child: i + 1 < children.length
                        ? children[i + 1]
                        : const SizedBox(),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}

void go(BuildContext context, int screen) =>
    Navigator.of(context).pushNamed('/m$screen');
void backToExplore(BuildContext context) {
  final nav = Navigator.of(context);
  if (nav.canPop()) {
    nav.pop();
  } else {
    nav.pushReplacementNamed('/m2');
  }
}

void message(BuildContext context, String text) => ScaffoldMessenger.of(context)
  ..hideCurrentSnackBar()
  ..showSnackBar(
    SnackBar(content: Text(text), behavior: SnackBarBehavior.floating),
  );

class Photo extends StatelessWidget {
  const Photo(
    this.name, {
    super.key,
    this.height,
    this.width,
    this.radius = 0,
    this.fit = BoxFit.cover,
    this.label,
  });
  final String name;
  final double? height, width;
  final double radius;
  final BoxFit fit;
  final String? label;
  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(radius),
    child: Image.asset(
      'assets/images/$name.jpg',
      package: 'tourism_ui',
      width: width,
      height: height,
      fit: fit,
      semanticLabel: label,
      excludeFromSemantics: label == null,
      frameBuilder: (context, child, frame, synchronous) => synchronous
          ? child
          : AnimatedOpacity(
              opacity: frame == null ? 0 : 1,
              duration: motionTime(context, 240),
              child: child,
            ),
      errorBuilder: (_, _, _) => SizedBox(
        height: height,
        width: width,
        child: const Icon(Icons.landscape_outlined, color: green),
      ),
    ),
  );
}

class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });
  final Widget child;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(24),
      side: const BorderSide(color: line),
    ),
    clipBehavior: Clip.antiAlias,
    child: SizedBox(
      width: double.infinity,
      child: Padding(padding: padding, child: child),
    ),
  );
}

class Section extends StatelessWidget {
  const Section(this.text, {super.key, this.action, this.onTap});
  final String text;
  final String? action;
  final VoidCallback? onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 26, bottom: 16),
    child: Row(
      children: [
        Expanded(child: Text(text, style: editorial.copyWith(fontSize: 23))),
        if (action != null)
          TextButton(
            onPressed: onTap,
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(48, 48),
            ),
            child: Text('$action ›', style: const TextStyle(fontSize: 12)),
          ),
      ],
    ),
  );
}

class Tag extends StatelessWidget {
  const Tag(this.text, {super.key, this.color = green, this.fill = mint});
  final String text;
  final Color color, fill;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: fill,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      text,
      style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
    ),
  );
}

class Meta extends StatelessWidget {
  const Meta(this.icon, this.text, {super.key, this.size = 12});
  final IconData icon;
  final String text;
  final double size;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: green),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            text,
            style: TextStyle(color: gray, fontSize: size, height: 1.5),
          ),
        ),
      ],
    ),
  );
}

class Stars extends StatelessWidget {
  const Stars(this.offer, {super.key, this.dark = false});
  final Offer offer;
  final bool dark;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF7B327)),
      const SizedBox(width: 2),
      Text(
        '${offer.rating} (${offer.reviews})',
        style: TextStyle(fontSize: 12, color: dark ? Colors.white : gray),
      ),
    ],
  );
}

class StepperField extends StatelessWidget {
  const StepperField({
    super.key,
    required this.value,
    required this.onChanged,
    this.max = 6,
  });
  final int value, max;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      IconButton.outlined(
        tooltip: 'Giảm số khách',
        onPressed: value > 1 ? () => onChanged(value - 1) : null,
        style: IconButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.all(5),
        ),
        icon: const Icon(Icons.remove, size: 16),
      ),
      SizedBox(
        width: 30,
        child: Text(
          '$value',
          textAlign: TextAlign.center,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      IconButton.outlined(
        tooltip: 'Tăng số khách',
        onPressed: value < max ? () => onChanged(value + 1) : null,
        style: IconButton.styleFrom(
          minimumSize: const Size(48, 48),
          padding: const EdgeInsets.all(5),
        ),
        icon: const Icon(Icons.add, size: 16),
      ),
    ],
  );
}

class PageFrame extends StatelessWidget {
  const PageFrame({
    super.key,
    required this.title,
    required this.children,
    this.bottom,
    this.actions,
  });
  final String title;
  final List<Widget> children;
  final Widget? bottom;
  final List<Widget>? actions;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(title), actions: actions),
    body: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(18, 6, 18, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final (i, child) in children.indexed)
            Reveal(order: i, child: child),
        ],
      ),
    ),
    bottomNavigationBar: bottom == null ? null : BottomArea(child: bottom!),
  );
}

class BottomArea extends StatelessWidget {
  const BottomArea({super.key, required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    elevation: 10,
    shadowColor: green.withValues(alpha: .12),
    child: SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
        child: child,
      ),
    ),
  );
}

class CustomerNav extends StatelessWidget {
  const CustomerNav({super.key, required this.selected, this.search = false});
  final int selected;
  final bool search;
  @override
  Widget build(BuildContext context) {
    const labels = ['Khám phá', 'Yêu thích', 'Đặt chỗ', 'Tin nhắn', 'Cá nhân'];
    return NavigationBar(
      selectedIndex: search ? 0 : selected,
      onDestinationSelected: (i) {
        if (i == 0) {
          Navigator.pushNamedAndRemoveUntil(context, '/m2', (_) => false);
        }
        if (i == 1) {
          Navigator.pushNamed(context, '/favorites');
        }
        if (i == 2) Navigator.pushNamed(context, '/trips');
        if (i == 3) Navigator.pushNamed(context, '/m8');
        if (i == 4) Navigator.pushNamed(context, '/m9');
      },
      destinations: [
        for (int i = 0; i < labels.length; i++)
          NavigationDestination(
            icon: Icon(
              [
                Icons.explore_outlined,
                Icons.favorite_border,
                Icons.confirmation_number_outlined,
                Icons.chat_bubble_outline,
                Icons.person_outline,
              ][i],
            ),
            label: labels[i],
          ),
      ],
    );
  }
}

class OfferTile extends StatelessWidget {
  const OfferTile({
    super.key,
    required this.store,
    required this.offer,
    this.large = false,
  });
  final TourismStore store;
  final Offer offer;
  final bool large;
  @override
  Widget build(BuildContext context) => TouchFeedback(
    child: Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          store.select(offer);
          go(context, 4);
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Photo(
                  large
                      ? (offer.id == 1 ? 'pao_landscape' : offer.image)
                      : offer.image,
                  height: large ? 230 : 172,
                  width: double.infinity,
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton.filledTonal(
                    tooltip: 'Yêu thích ${offer.name}',
                    style: IconButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: .92),
                      minimumSize: const Size(48, 48),
                      padding: const EdgeInsets.all(6),
                    ),
                    onPressed: () => store.toggleLike(offer.id),
                    icon: AnimatedSwitcher(
                      duration: motionTime(context, 200),
                      transitionBuilder: (child, animation) =>
                          ScaleTransition(scale: animation, child: child),
                      child: Icon(
                        store.likes.contains(offer.id)
                            ? Icons.favorite
                            : Icons.favorite_outline,
                        key: ValueKey(store.likes.contains(offer.id)),
                        size: 21,
                        color: store.likes.contains(offer.id)
                            ? const Color(0xFFFF527F)
                            : gray,
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: large
                          ? Colors.black.withValues(alpha: .55)
                          : Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Stars(offer, dark: large),
                  ),
                ),
              ],
            ),
            Padding(
              padding: EdgeInsets.all(large ? 18 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    offer.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: large ? 19 : 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Meta(Icons.location_on_outlined, offer.location, size: 12),
                  if (large)
                    Wrap(
                      spacing: 5,
                      runSpacing: 5,
                      children: offer.highlights
                          .map(
                            (s) => Tag(
                              s,
                              fill: const Color(0xFFF1F5F9),
                              color: const Color(0xFF52616C),
                            ),
                          )
                          .toList(),
                    )
                  else
                    Text(
                      offer.id == 1
                          ? 'Nhà sàn truyền thống, view ruộng bậc thang tuyệt đẹp'
                          : offer.highlights.take(2).join(' · '),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        color: gray,
                        height: 1.6,
                      ),
                    ),
                  SizedBox(height: large ? 16 : 10),
                  Wrap(
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        money(offer.price),
                        style: TextStyle(
                          fontSize: large ? 21 : 16,
                          fontWeight: FontWeight.w700,
                          color: green,
                        ),
                      ),
                      Text(
                        ' /${offer.unitLabel}',
                        style: const TextStyle(fontSize: 12, color: gray),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class OfferSummary extends StatelessWidget {
  const OfferSummary({super.key, required this.store});
  final TourismStore store;
  @override
  Widget build(BuildContext context) => Panel(
    padding: const EdgeInsets.all(12),
    child: Row(
      children: [
        Photo(store.selected.image, height: 68, width: 68, radius: 12),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                store.selected.name,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 5),
              Stars(store.selected),
              Meta(
                Icons.location_on_outlined,
                store.selected.location,
                size: 10,
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

Future<void> editContact(BuildContext context, TourismStore store) async {
  final name = TextEditingController(text: store.customerName),
      phone = TextEditingController(text: store.phone);
  final form = GlobalKey<FormState>();
  await showDialog<void>(
    context: context,
    builder: (dialog) => AlertDialog(
      title: const Text('Thông tin liên hệ'),
      content: Form(
        key: form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Họ tên'),
              validator: (v) =>
                  v == null || v.trim().length < 2 ? 'Nhập họ tên' : null,
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Điện thoại'),
              validator: (v) =>
                  !RegExp(r'^0\d{9,10}$').hasMatch(v?.trim() ?? '')
                  ? 'Nhập số điện thoại hợp lệ'
                  : null,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialog),
          child: const Text('Đóng'),
        ),
        FilledButton(
          onPressed: () {
            if (!form.currentState!.validate()) return;
            store.customerName = name.text.trim();
            store.phone = phone.text.trim();
            store.changed();
            Navigator.pop(dialog);
          },
          child: const Text('Lưu'),
        ),
      ],
    ),
  );
  await Future<void>.delayed(const Duration(milliseconds: 300));
  name.dispose();
  phone.dispose();
}
