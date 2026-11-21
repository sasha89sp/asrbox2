import 'package:flutter/material.dart';

class AsrboxTheme {
  static const Color accent = Color(0xFF2563EB);
  static const Color accentDark = Color(0xFF3B82F6);

  static const Color lightCanvas = Color(0xFFF6F7F9);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightSurfaceAlt = Color(0xFFFAFBFD);
  static const Color lightBorder = Color(0xFFE4E7EC);
  static const Color lightInk = Color(0xFF101828);
  static const Color lightMuted = Color(0xFF667085);

  static const Color darkCanvas = Color(0xFF0D1117);
  static const Color darkSurface = Color(0xFF141A23);
  static const Color darkSurfaceAlt = Color(0xFF11161F);
  static const Color darkBorder = Color(0xFF232C3A);
  static const Color darkInk = Color(0xFFF1F5F9);
  static const Color darkMuted = Color(0xFF8B98AB);

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: lightCanvas,
      colorScheme: const ColorScheme.light(
        primary: accent,
        onPrimary: Colors.white,
        surface: lightSurface,
        onSurface: lightInk,
        outline: lightBorder,
        error: Color(0xFFDC2626),
      ),
      dividerColor: lightBorder,
      cardTheme: CardThemeData(
        color: lightSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: lightBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: lightSurface,
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: lightBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: lightBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: accent, width: 1.5),
        ),
      ),
    );
  }

  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkCanvas,
      colorScheme: const ColorScheme.dark(
        primary: accentDark,
        onPrimary: Colors.white,
        surface: darkSurface,
        onSurface: darkInk,
        outline: darkBorder,
        error: Color(0xFFEF4444),
      ),
      dividerColor: darkBorder,
      cardTheme: CardThemeData(
        color: darkSurface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: darkBorder),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF18202C),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: darkBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: darkBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: accentDark, width: 1.5),
        ),
      ),
    );
  }
}
