import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Theme Flutter aligné sur le design system web (shadcn / design-tokens.json).
class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.paper,
        primaryColor: AppColors.accent,
        colorScheme: const ColorScheme.light(
          primary: AppColors.accent,
          secondary: AppColors.ink,
          surface: AppColors.cream,
          error: AppColors.error,
          onPrimary: AppColors.ink,
          onSecondary: Colors.white,
          onSurface: AppColors.ink,
        ),
        textTheme:
            GoogleFonts.plusJakartaSansTextTheme(ThemeData.light().textTheme)
                .apply(
          bodyColor: AppColors.ink,
          displayColor: AppColors.ink,
        ),
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
          filled: true,
          fillColor: AppColors.cream,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.radius),
            borderSide: const BorderSide(color: AppColors.line),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.radius),
            borderSide: const BorderSide(color: AppColors.line),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.radius),
            borderSide: const BorderSide(color: AppColors.accent, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.radius),
            borderSide: const BorderSide(color: AppColors.error),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppColors.radius),
            borderSide: const BorderSide(color: AppColors.error, width: 1.5),
          ),
          hintStyle: const TextStyle(color: AppColors.ink4),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.accent,
            foregroundColor: AppColors.ink,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppColors.radius),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            textStyle: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        cardTheme: CardThemeData(
          color: AppColors.cream,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.radiusLg),
            side: const BorderSide(color: AppColors.line),
          ),
        ),
        dividerTheme: const DividerThemeData(
          color: AppColors.line,
          thickness: 1,
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: AppColors.ink,
          contentTextStyle: GoogleFonts.plusJakartaSans(
            color: Colors.white,
            fontSize: 14,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppColors.radius),
          ),
          behavior: SnackBarBehavior.floating,
        ),
        useMaterial3: true,
      );

  static ThemeData get dark => light;
}
