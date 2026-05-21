import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ── Backgrounds ────────────────────────────────────────────
  static const Color background = Color(0xFF050B18);
  static const Color surface = Color(0xFF0D1526);
  static const Color surfaceElevated = Color(0xFF142135);
  static const Color border = Color(0xFF1E2D42);
  static const Color borderLight = Color(0xFF253650);

  // ── Primary — Teal (trust, growth, money) ─────────────────
  static const Color primary = Color(0xFF00D4AA);
  static const Color primaryDark = Color(0xFF00A884);
  static const Color primaryGlow = Color(0x4000D4AA);

  // ── Accent — Gold (prosperity, African warmth) ────────────
  static const Color accent = Color(0xFFFFB347);
  static const Color accentDark = Color(0xFFE09020);

  // ── Status ────────────────────────────────────────────────
  static const Color success = Color(0xFF00C851);
  static const Color error = Color(0xFFFF5252);
  static const Color warning = Color(0xFFFFBB33);

  // ── Text ──────────────────────────────────────────────────
  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF8B9DB0);
  static const Color textTertiary = Color(0xFF4A5C6A);

  // ── Gradients ─────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF00D4AA), Color(0xFF00A884)],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF0A1628), Color(0xFF050B18)],
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFFFB347), Color(0xFFE09020)],
  );

  // ── Card gradients (random per cotisation) ────────────────
  static const List<List<Color>> cardGradients = [
    [Color(0xFF667EEA), Color(0xFF764BA2)],
    [Color(0xFFF093FB), Color(0xFFF5576C)],
    [Color(0xFF4FACFE), Color(0xFF00F2FE)],
    [Color(0xFF43E97B), Color(0xFF38F9D7)],
    [Color(0xFFFA709A), Color(0xFFFEE140)],
    [Color(0xFFA18CD1), Color(0xFFFBC2EB)],
    [Color(0xFFFF6B6B), Color(0xFFFFE66D)],
    [Color(0xFF11998E), Color(0xFF38EF7D)],
  ];
}
