import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import '../data.dart' show money, dateText;
import '../theme.dart';
import '../widgets.dart' show Photo;
import 'api.dart';
import 'common.dart';
import 'definitions.dart';
import 'management.dart';
import 'media.dart';

part 'reference_widgets.dart';
part 'discovery_pages.dart';
part 'detail_booking_pages.dart';
part 'account_pages.dart';
part 'map_page.dart';

class ConnectedTourismApp extends StatefulWidget {
  const ConnectedTourismApp({
    super.key,
    this.initialHost = false,
    this.api,
    this.showWelcome = true,
  });
  final bool initialHost, showWelcome;
  final TourismApi? api;
  @override
  State<ConnectedTourismApp> createState() => _ConnectedTourismAppState();
}

class _ConnectedTourismAppState extends State<ConnectedTourismApp> {
  late final TourismApi api = widget.api ?? TourismApi();
  late bool entered = !widget.showWelcome || widget.initialHost;
  @override
  void initState() {
    super.initState();
    if (api.restoring) api.restore();
  }

  @override
  void dispose() {
    if (widget.api == null) api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Du lịch cộng đồng',
    debugShowCheckedModeBanner: false,
    theme: referenceTheme(),
    locale: const Locale('vi'),
    supportedLocales: const [Locale('vi')],
    localizationsDelegates: const [
      GlobalMaterialLocalizations.delegate,
      GlobalWidgetsLocalizations.delegate,
      GlobalCupertinoLocalizations.delegate,
    ],
    builder: (context, child) => ColoredBox(
      color: const Color(0xFFE7ECEB),
      child: Align(
        alignment: Alignment.topCenter,
        child: SizedBox(width: 430, child: child),
      ),
    ),
    home: ListenableBuilder(
      listenable: api,
      builder: (context, _) {
        if (api.restoring) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        if (!entered && !api.signedIn) {
          return ReferenceWelcome(
            api: api,
            onExplore: () => setState(() => entered = true),
          );
        }
        return LiveShell(api: api, initialHost: widget.initialHost);
      },
    ),
  );
}

class LiveShell extends StatefulWidget {
  const LiveShell({super.key, required this.api, this.initialHost = false});
  final TourismApi api;
  final bool initialHost;
  @override
  State<LiveShell> createState() => _LiveShellState();
}

class _LiveShellState extends State<LiveShell> with WidgetsBindingObserver {
  late int tab = widget.initialHost ? 5 : 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && widget.api.signedIn) {
      widget.api.currentUser().catchError((Object _) {});
    }
  }

  Future<void> select(int value) async {
    if (value == 1 || value == 2 || value == 3) {
      await featureAlert(context, switch (value) {
        1 => MissingFeature.favorites,
        2 => MissingFeature.booking,
        _ => MissingFeature.messages,
      });
      return;
    }
    if (widget.api.signedIn) {
      try {
        await widget.api.currentUser();
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(SnackBar(content: Text(displayError(error))));
        }
      }
    }
    if (mounted) setState(() => tab = value);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      bottom: false,
      child: Padding(
        padding: EdgeInsets.only(top: kIsWeb ? 16 : 0),
        child: switch (tab) {
          4 => LiveAccount(api: widget.api, openHost: () => select(5)),
          5 => HouseholdDashboard(
            key: ValueKey(widget.api.epoch),
            api: widget.api,
          ),
          _ => PublicCatalog(api: widget.api),
        },
      ),
    ),
    bottomNavigationBar: _BottomNavigation(
      selected: tab == 5 ? 4 : tab,
      onSelect: select,
    ),
  );
}

class ReferenceWelcome extends StatelessWidget {
  const ReferenceWelcome({
    super.key,
    required this.api,
    required this.onExplore,
  });
  final TourismApi api;
  final VoidCallback onExplore;
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.white,
    body: LayoutBuilder(
      builder: (context, box) {
        final imageHeight = (box.maxHeight * .55).clamp(250.0, 490.0);
        return SingleChildScrollView(
          child: Column(
            children: [
              SizedBox(
                height: imageHeight,
                width: double.infinity,
                child: const Photo(
                  'welcome',
                  fit: BoxFit.cover,
                  label: 'Ruộng bậc thang Việt Nam',
                ),
              ),
              Transform.translate(
                offset: const Offset(0, -28),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(24, 28, 24, 0),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(32),
                    ),
                  ),
                  child: Column(
                    children: [
                      const Text(
                        'Khám phá\nViệt Nam thật khác',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'packages/tourism_ui/Playfair',
                          fontSize: 29,
                          height: 1.22,
                          fontWeight: FontWeight.w700,
                          color: uiInk,
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Du lịch cộng đồng – Gặp gỡ con người bản địa\nTrải nghiệm văn hóa – Gìn giữ thiên nhiên',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.8,
                          color: uiMuted,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Semantics(
                        label: 'Giới thiệu du lịch cộng đồng',
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            4,
                            (i) => Container(
                              width: i == 0 ? 24 : 6,
                              height: 6,
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              decoration: BoxDecoration(
                                color: i == 0
                                    ? uiGreen
                                    : const Color(0xFFD2D8E0),
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      _PrimaryButton(
                        'Khám phá ngay',
                        onTap: onExplore,
                        icon: Icons.arrow_forward,
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () => openAuthentication(context, api),
                          child: const Text('Đăng nhập'),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          const Text(
                            'Chưa có tài khoản?',
                            style: TextStyle(color: uiMuted, fontSize: 12),
                          ),
                          TextButton(
                            onPressed: () => openAuthentication(
                              context,
                              api,
                              register: true,
                            ),
                            child: const Text('Đăng ký'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    ),
  );
}
