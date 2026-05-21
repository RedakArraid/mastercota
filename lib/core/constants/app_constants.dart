class AppConstants {
  AppConstants._();

  static const String appName = 'Mastercota';
  static const String appTagline = 'Cotisez ensemble, facilement';

  // Supabase — projet mastercota (tomtoinewsoktnkrtbbm)
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://tomtoinewsoktnkrtbbm.supabase.co',
  );
  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbXRvaW5ld3Nva3Rua3J0YmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTc2ODgsImV4cCI6MjA5NDg5MzY4OH0.Okyz8FNsW8-3TYt-M7UYBkdphtu_IdmEAREFjmgtzsk',
  );
  
  // Paystack
  static const String paystackPublicKey = String.fromEnvironment(
    'PAYSTACK_PUBLIC_KEY',
    defaultValue: 'pk_test_7ad05dc9dd5951f4463b8fbccea934e102ead21a',
  );

  // Phone
  static const String defaultCountryCode = '+225';
  static const String defaultCountryFlag = '🇨🇮';

  // Business
  static const double commissionRate = 0.01; // 1%
  static const String currency = 'FCFA';

  // Statuses
  static const String statusActive = 'active';
  static const String statusClosed = 'closed';
  static const String statusCompleted = 'completed';
  static const String paymentPending = 'pending';
  static const String paymentPaid = 'paid';
  static const String paymentFailed = 'failed';
}
