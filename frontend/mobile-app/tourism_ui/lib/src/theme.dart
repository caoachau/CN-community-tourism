import 'package:flutter/material.dart';

import 'motion.dart';
import 'widgets.dart';

ThemeData tourismTheme() => ThemeData(
  useMaterial3: true,
  fontFamily: 'packages/tourism_ui/Jakarta',
  scaffoldBackgroundColor: bg,
  colorScheme: ColorScheme.fromSeed(
    seedColor: green,
    primary: green,
    surface: bg,
    onSurface: ink,
    secondary: clay,
  ),
  textTheme: ThemeData.light().textTheme.apply(
    fontFamily: 'packages/tourism_ui/Jakarta',
    bodyColor: ink,
    displayColor: ink,
  ),
  visualDensity: VisualDensity.standard,
  materialTapTargetSize: MaterialTapTargetSize.padded,
  pageTransitionsTheme: const PageTransitionsTheme(
    builders: {
      TargetPlatform.android: SoftPageTransition(),
      TargetPlatform.iOS: SoftPageTransition(),
      TargetPlatform.windows: SoftPageTransition(),
      TargetPlatform.macOS: SoftPageTransition(),
      TargetPlatform.linux: SoftPageTransition(),
    },
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: bg,
    foregroundColor: ink,
    surfaceTintColor: Colors.transparent,
    centerTitle: true,
    elevation: 0,
    scrolledUnderElevation: 0,
    titleTextStyle: TextStyle(
      fontFamily: 'packages/tourism_ui/Jakarta',
      fontSize: 17,
      fontWeight: FontWeight.w700,
      color: ink,
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: Colors.white,
    hintStyle: const TextStyle(color: gray, fontSize: 13),
    labelStyle: const TextStyle(color: gray, fontSize: 14),
    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: line),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: line),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(18),
      borderSide: const BorderSide(color: green, width: 2),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(48, 54),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      backgroundColor: green,
      foregroundColor: Colors.white,
      textStyle: const TextStyle(
        fontFamily: 'packages/tourism_ui/Jakarta',
        fontSize: 14,
        fontWeight: FontWeight.w700,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size(48, 48),
      side: const BorderSide(color: line),
      foregroundColor: green,
      textStyle: const TextStyle(
        fontFamily: 'packages/tourism_ui/Jakarta',
        fontSize: 13,
        fontWeight: FontWeight.w600,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      minimumSize: const Size(48, 48),
      foregroundColor: green,
      textStyle: const TextStyle(
        fontFamily: 'packages/tourism_ui/Jakarta',
        fontSize: 13,
        fontWeight: FontWeight.w600,
      ),
    ),
  ),
  iconButtonTheme: IconButtonThemeData(
    style: IconButton.styleFrom(
      minimumSize: const Size(48, 48),
    ),
  ),
  navigationBarTheme: NavigationBarThemeData(
    backgroundColor: Colors.white,
    surfaceTintColor: Colors.transparent,
    height: 80,
    elevation: 3,
    shadowColor: green.withValues(alpha: .1),
    indicatorColor: lime,
    labelTextStyle: WidgetStateProperty.resolveWith(
      (states) => TextStyle(
        fontFamily: 'packages/tourism_ui/Jakarta',
        fontSize: 11,
        fontWeight: states.contains(WidgetState.selected)
            ? FontWeight.w700
            : FontWeight.w500,
        color: states.contains(WidgetState.selected) ? green : gray,
      ),
    ),
    iconTheme: WidgetStateProperty.resolveWith(
      (states) => IconThemeData(
        size: 23,
        color: states.contains(WidgetState.selected) ? green : gray,
      ),
    ),
  ),
  chipTheme: ChipThemeData(
    backgroundColor: Colors.white,
    selectedColor: green,
    checkmarkColor: Colors.white,
    side: const BorderSide(color: line),
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
    labelStyle: const TextStyle(
      fontFamily: 'packages/tourism_ui/Jakarta',
      fontSize: 12,
      color: ink,
    ),
    secondaryLabelStyle: const TextStyle(
      fontFamily: 'packages/tourism_ui/Jakarta',
      fontSize: 12,
      color: Colors.white,
    ),
  ),
  bottomSheetTheme: const BottomSheetThemeData(
    backgroundColor: bg,
    surfaceTintColor: Colors.transparent,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
    ),
  ),
  dialogTheme: DialogThemeData(
    backgroundColor: bg,
    surfaceTintColor: Colors.transparent,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
  ),
  snackBarTheme: SnackBarThemeData(
    backgroundColor: green,
    behavior: SnackBarBehavior.floating,
    contentTextStyle: const TextStyle(
      fontFamily: 'packages/tourism_ui/Jakarta',
      fontSize: 14,
      color: Colors.white,
    ),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
  ),
  dividerTheme: const DividerThemeData(color: line, thickness: 1),
);
