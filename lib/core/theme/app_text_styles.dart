import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTextStyles {
  AppTextStyles._();

  // ── Display — Geist, letterSpacing tight ──────────────────────
  static TextStyle get displayLarge => GoogleFonts.dmSans(
        fontSize: 32,
        fontWeight: FontWeight.w700,
        color: AppColors.ink,
        letterSpacing: -0.64,
      );

  static TextStyle get displayMedium => GoogleFonts.dmSans(
        fontSize: 26,
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
        letterSpacing: -0.52,
      );

  static TextStyle get headlineLarge => GoogleFonts.dmSans(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
        letterSpacing: -0.22,
      );

  static TextStyle get headlineMedium => GoogleFonts.dmSans(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.ink,
      );

  static TextStyle get titleLarge => GoogleFonts.dmSans(
        fontSize: 16,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      );

  static TextStyle get titleMedium => GoogleFonts.dmSans(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
      );

  static TextStyle get bodyLarge => GoogleFonts.dmSans(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: AppColors.ink,
      );

  static TextStyle get bodyMedium => GoogleFonts.dmSans(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.ink2,
      );

  static TextStyle get bodySmall => GoogleFonts.dmSans(
        fontSize: 12,
        fontWeight: FontWeight.w400,
        color: AppColors.ink2,
      );

  static TextStyle get labelLarge => GoogleFonts.dmSans(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
        letterSpacing: 0.1,
      );

  // EYEBROW — small caps label
  static TextStyle get caption => GoogleFonts.dmSans(
        fontSize: 11,
        fontWeight: FontWeight.w500,
        color: AppColors.ink3,
        letterSpacing: 0.06 * 11,
      );

  // MONO — financial amounts
  static TextStyle get amount => GoogleFonts.dmMono(
        fontSize: 28,
        fontWeight: FontWeight.w500,
        color: AppColors.ink,
        letterSpacing: -0.56,
      );

  static TextStyle get mono => GoogleFonts.dmMono(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: AppColors.ink,
      );

  // Newsreader italic accent
  static TextStyle get serifItalic => GoogleFonts.newsreader(
        fontSize: 16,
        fontStyle: FontStyle.italic,
        fontWeight: FontWeight.w400,
        color: AppColors.accent,
      );
}
