import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ── Backgrounds (Premium Light Warm Grey/Blue) ────────────────
  static const Color background = Color(0xFFF5F7FB);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFF8FAFC);
  static const Color border = Color(0xFFE2E8F0);
  static const Color borderLight = Color(0xFFF1F5F9);

  // ── Primary — Brand Gold (warmth, wealth, success) ───────────
  static const Color primary = Color(0xFFEEA226);
  static const Color primaryDark = Color(0xFFC78114);
  static const Color primaryGlow = Color(0x22EEA226);

  // ── Accent — Royal Blue (trust, stability) ───────────────────
  static const Color accent = Color(0xFF1E5BB4);
  static const Color accentDark = Color(0xFF123E80);
  static const Color accentGlow = Color(0x221E5BB4);

  // ── Status ────────────────────────────────────────────────
  static const Color success = Color(0xFF00C853);
  static const Color error = Color(0xFFD50000);
  static const Color warning = Color(0xFFFFAB00);

  // ── Text (Deep Navy for readability) ──────────────────────
  static const Color textPrimary = Color(0xFF0A1120);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textTertiary = Color(0xFF94A3B8);

  // ── Gradients ─────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFF5B842), Color(0xFFEEA226)],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFFFFFFF), Color(0xFFF5F7FB)],
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF2C74E0), Color(0xFF1E5BB4)],
  );

  // ── Card gradients (harmonized premium gradients for cotisations)
  static const List<List<Color>> cardGradients = [
    [Color(0xFF1E3C72), Color(0xFF2A5298)], // Royal Blue
    [Color(0xFF3A6073), Color(0xFF52788C)], // Muted Teal
    [Color(0xFF4A00E0), Color(0xFF8E2DE2)], // Purple Indigo
    [Color(0xFF1F4037), Color(0xFF387A65)], // Emerald Pine
    [Color(0xFF0F2027), Color(0xFF2C5364)], // Slate Navy
    [Color(0xFFD38312), Color(0xFFA83279)], // Gold Magenta
    [Color(0xFF800080), Color(0xFFFF007F)], // Violet Rose
    [Color(0xFF13223F), Color(0xFF1F355E)], // Glass Navy
  ];
}
