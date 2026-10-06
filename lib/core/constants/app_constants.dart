class AppConstants {
  AppConstants._();

  static const String appName = 'Mastercota';
  static const String appTagline =
      'Une cotisation WhatsApp. L’argent sur votre Wave.';

  /// API Next.js (Postgres + OpenWA + Paystack)
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://mastercota.com',
  );
  static const String appBaseUrl = String.fromEnvironment(
    'APP_BASE_URL',
    defaultValue: 'https://mastercota.com',
  );

  static const String defaultCountryCode = '+225';
  static const String defaultCountryFlag = '🇨🇮';
  static const String defaultCountryIso = 'CI';

  static const double commissionRate = 0;

  /// Plus de frais contributeur — aligné web.
  static const double serviceRate = 0;
  static const String currency = 'FCFA';

  static const String statusActive = 'active';
  static const String statusClosed = 'closed';
  static const String statusCompleted = 'completed';
  static const String paymentPending = 'pending';
  static const String paymentPaid = 'paid';
  static const String paymentFailed = 'failed';
}
