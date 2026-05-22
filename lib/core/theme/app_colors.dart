import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // ── Core palette — navy + gold + white ──────────────────────
  static const Color ink  = Color(0xFF143268);
  static const Color ink2 = Color(0xFF2B4575);
  static const Color ink3 = Color(0xFF6B7A95);
  static const Color ink4 = Color(0xFFA8B2C4);

  static const Color accent      = Color(0xFFDA9810);
  static const Color accentBright = Color(0xFFF4B829);
  static const Color accentDark   = Color(0xFFA87708);
  static const Color accentSoft   = Color(0x14DA9810); // 8%
  static const Color accentLine   = Color(0x33DA9810); // 20%

  static const Color cream  = Color(0xFFFFFFFF);
  static const Color paper  = Color(0xFFFAFBFD);
  static const Color paper2 = Color(0xFFEEF2F8);

  static const Color forest     = Color(0xFF2D6A4F);
  static const Color forestSoft = Color(0x1A2D6A4F);
  static const Color warn       = Color(0xFFB8731A);
  static const Color error      = Color(0xFFD50000);

  static const Color line     = Color(0x1A143268); // rgba(20,50,104,0.10)
  static const Color lineSoft = Color(0x0F143268); // rgba(20,50,104,0.06)

  // ── Backward-compat aliases (existing widgets compile unchanged) ─
  static const Color background      = cream;
  static const Color surface         = paper;
  static const Color surfaceElevated = paper2;
  static const Color border          = line;
  static const Color borderLight     = paper2;
  static const Color primary         = accentBright;
  static const Color primaryDark     = accentDark;
  static const Color primaryGlow     = accentSoft;
  static const Color textPrimary     = ink;
  static const Color textSecondary   = ink2;
  static const Color textTertiary    = ink3;
  static const Color success         = forest;
  static const Color warning         = warn;

  // ── Gradients ─────────────────────────────────────────────────
  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accentBright, accent],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [cream, paper],
  );

  static const LinearGradient accentGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [accentBright, accent],
  );

  // ── Card gradient list (kept for backward compat, no longer used) ─
  static const List<List<Color>> cardGradients = [
    [ink,  ink2], [ink2, ink3], [ink,  ink2], [forest, Color(0xFF387A65)],
    [ink,  ink2], [accent, accentDark], [ink2, ink], [ink, ink2],
  ];
}
