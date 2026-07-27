class AppConstants {
  AppConstants._();

  static const String appName = 'Mastercota';
  static const String appTagline = 'Cotisez ensemble, facilement';

  /// API Next.js (Postgres + OpenWA + Paystack)
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://mastercota.com',
  );

  static const String paystackPublicKey = String.fromEnvironment(
    'PAYSTACK_PUBLIC_KEY',
    defaultValue: 'pk_test_7ad05dc9dd5951f4463b8fbccea934e102ead21a',
  );

  static const String defaultCountryCode = '+225';
  static const String defaultCountryFlag = '🇨🇮';

  static const double commissionRate = 0.01;
  /// Frais de service globaux (~3 %) — voir [Fees].
  static const double serviceRate = 0.0295;
  static const String currency = 'FCFA';

  static const String statusActive = 'active';
  static const String statusClosed = 'closed';
  static const String statusCompleted = 'completed';
  static const String paymentPending = 'pending';
  static const String paymentPaid = 'paid';
  static const String paymentFailed = 'failed';
}
