import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.cream,
        primaryColor: AppColors.ink,
        colorScheme: const ColorScheme.light(
          primary: AppColors.ink,
          secondary: AppColors.accentBright,
          surface: AppColors.paper,
          error: AppColors.error,
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: AppColors.ink,
        ),
        textTheme: GoogleFonts.dmSansTextTheme(ThemeData.light().textTheme),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
          ),
          iconTheme: IconThemeData(color: AppColors.ink),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: false,
          border: const UnderlineInputBorder(
            borderSide: BorderSide(color: AppColors.line),
          ),
          enabledBorder: const UnderlineInputBorder(
            borderSide: BorderSide(color: AppColors.line),
          ),
          focusedBorder: const UnderlineInputBorder(
            borderSide: BorderSide(color: AppColors.ink, width: 1.5),
          ),
          errorBorder: const UnderlineInputBorder(
            borderSide: BorderSide(color: AppColors.error),
          ),
          focusedErrorBorder: const UnderlineInputBorder(
            borderSide: BorderSide(color: AppColors.error, width: 1.5),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 12),
          hintStyle: const TextStyle(color: AppColors.ink4),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accentBright,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            textStyle: GoogleFonts.dmSans(
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColors.paper,
          elevation: 0,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: const BorderSide(color: AppColors.line),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.line,
          thickness: 1,
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.ink,
          contentTextStyle: GoogleFonts.dmSans(
            color: Colors.white,
            fontSize: 14,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          behavior: SnackBarBehavior.floating,
        ),
        useMaterial3: true,
      );

  // Dark theme mirrors light (design is light-only)
  static ThemeData get dark => light;
}
