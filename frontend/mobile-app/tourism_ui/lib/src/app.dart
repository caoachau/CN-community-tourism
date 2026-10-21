import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'account.dart';
import 'data.dart';
import 'discovery.dart';
import 'explore.dart';
import 'household.dart';
import 'reservation.dart';
import 'widgets.dart';
import 'theme.dart';
import 'live/app.dart';
import 'live/api.dart';

const screenTitles = [
  'Chào mừng',
  'Khám phá',
  'Tìm kiếm & bộ lọc',
  'Chi tiết dịch vụ',
  'Bản đồ khám phá',
  'Chọn ngày & đặt dịch vụ',
  'Thanh toán trực tiếp',
  'Tin nhắn',
  'Hồ sơ cá nhân',
  'Quản lý chủ hộ',
];

class TourismApp extends StatefulWidget {
  const TourismApp({
    super.key,
    this.initialHost = false,
    this.initialScreen,
    this.store,
    this.api,
  });
  final bool initialHost;
  final int? initialScreen;
  final TourismStore? store;
  final TourismApi? api;
  @override
  State<TourismApp> createState() => _TourismAppState();
}

class _TourismAppState extends State<TourismApp> {
  TourismStore? _ownedStore;
  TourismStore get store => widget.store ?? (_ownedStore ??= TourismStore());
  @override
  void dispose() {
    _ownedStore?.dispose();
    super.dispose();
  }

  Widget screen(RouteSettings settings) => switch (settings.name) {
    '/m1' => WelcomeScreen(store: store),
    '/m2' => DiscoverScreen(store: store),
    '/m3' => SearchScreen(
      store: store,
      category: settings.arguments as String? ?? 'Tất cả',
    ),
    '/m4' => DetailScreen(store: store),
    '/m5' => MapScreen(store: store),
    '/m6' => BookingScreen(store: store),
    '/m7' => CheckoutScreen(store: store),
    '/m8' => ChatScreen(store: store),
    '/m9' => ProfileScreen(store: store),
    '/m10' => HouseholdScreen(store: store),
    '/favorites' => FavoritesScreen(store: store),
    '/trips' => TripsScreen(store: store),
    '/host-trips' => TripsScreen(store: store, managing: true),
    '/screens' => const ScreenGallery(),
    _ => WelcomeScreen(store: store),
  };
  Route<void> route(RouteSettings settings) => MaterialPageRoute<void>(
    settings: settings,
    builder: (_) => screen(settings),
  );
  @override
  Widget build(BuildContext context) {
    // The Stitch gallery is an explicit preview. Normal app launches use APIs.
    const demoMode = bool.fromEnvironment('DEMO_MODE');
    if (!demoMode && widget.store == null && widget.initialScreen == null) {
      return ConnectedTourismApp(
        initialHost: widget.initialHost,
        api: widget.api,
      );
    }
    final requested =
        WidgetsBinding.instance.platformDispatcher.defaultRouteName;
    final initial = widget.initialScreen != null
        ? '/m${widget.initialScreen}'
        : requested != '/'
        ? requested
        : widget.initialHost
        ? '/m10'
        : '/m1';
    return MaterialApp(
      title: 'Du lịch cộng đồng',
      debugShowCheckedModeBanner: false,
      locale: const Locale('vi'),
      supportedLocales: const [Locale('vi')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: tourismTheme(),
      builder: (context, child) => ColoredBox(
        color: const Color(0xFFE6ECE9),
        child: Align(
          alignment: Alignment.topCenter,
          child: SizedBox(width: 520, child: child),
        ),
      ),
      initialRoute: initial,
      onGenerateInitialRoutes: (name) => [route(RouteSettings(name: name))],
      onGenerateRoute: route,
    );
  }
}

class ScreenGallery extends StatelessWidget {
  const ScreenGallery({super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
    title: 'Thiết kế Stitch · M1–M10',
    children: [
      const Text(
        'Mở từng màn hình để kiểm tra giao diện.',
        style: TextStyle(color: gray, fontSize: 12),
      ),
      const SizedBox(height: 16),
      for (final (i, title) in screenTitles.indexed)
        Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Panel(
            padding: const EdgeInsets.all(4),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: mint,
                child: Text(
                  '${i + 1}',
                  style: const TextStyle(color: green, fontSize: 13),
                ),
              ),
              title: Text(
                'M${i + 1} · $title',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              trailing: const Icon(Icons.chevron_right, size: 19),
              onTap: () => go(context, i + 1),
            ),
          ),
        ),
    ],
  );
}
