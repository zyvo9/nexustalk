import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// NexusTalk design system — WhatsApp-simple, premium dark.
/// Accent: indigo → sky gradient (matches the brand).

class NTColors {
  static const bg = Color(0xFF070B15);
  static const bgCard = Color(0xFF0D1424);
  static const surface = Color(0xFF111A2E);
  static const border = Color(0x14FFFFFF);
  static const textPrimary = Color(0xFFF1F5F9);
  static const textSecondary = Color(0xFF94A3B8);
  static const textMuted = Color(0xFF64748B);
  static const accent = Color(0xFF6366F1);
  static const accentDark = Color(0xFF4F46E5);
  static const sky = Color(0xFF0EA5E9);
  static const online = Color(0xFF34D399);
  static const danger = Color(0xFFE11D48);
  static const amber = Color(0xFFFBBF24);

  static const accentGradient = LinearGradient(
    colors: [accent, accentDark, sky],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class NTTheme {
  static ThemeData dark() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: NTColors.bg,
      colorScheme: const ColorScheme.dark(
        primary: NTColors.accent,
        secondary: NTColors.sky,
        surface: NTColors.bgCard,
        error: NTColors.danger,
      ),
    );
    return base.copyWith(
      textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
        bodyColor: NTColors.textPrimary,
        displayColor: NTColors.textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w700,
          color: NTColors.textPrimary,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0x0AFFFFFF),
        hintStyle: const TextStyle(color: NTColors.textMuted, fontSize: 14),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: NTColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: NTColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: NTColors.accent, width: 1.2),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: NTColors.accent,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: NTColors.surface,
        contentTextStyle: const TextStyle(color: NTColors.textPrimary, fontSize: 13),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      dividerTheme: const DividerThemeData(color: NTColors.border, thickness: 1),
    );
  }
}
