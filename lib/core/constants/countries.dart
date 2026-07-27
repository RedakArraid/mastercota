/// Pays supportés pour l'inscription / paiements (aligné Paystack).
class CountryDial {
  final String iso;
  final String name;
  final String flag;
  final String dial;
  final int nationalLength;
  final String placeholder;

  const CountryDial({
    required this.iso,
    required this.name,
    required this.flag,
    required this.dial,
    required this.nationalLength,
    required this.placeholder,
  });

  String e164(String national) => '$dial${national.replaceAll(RegExp(r'\D'), '')}';

  bool isValidNational(String national) {
    final digits = national.replaceAll(RegExp(r'\D'), '');
    return digits.length == nationalLength;
  }
}

class PaystackCountries {
  PaystackCountries._();

  static const String defaultIso = 'CI';

  static const List<CountryDial> all = [
    CountryDial(
      iso: 'CI',
      name: "Côte d'Ivoire",
      flag: '🇨🇮',
      dial: '+225',
      nationalLength: 10,
      placeholder: '0700000000',
    ),
    CountryDial(
      iso: 'NG',
      name: 'Nigeria',
      flag: '🇳🇬',
      dial: '+234',
      nationalLength: 10,
      placeholder: '8012345678',
    ),
    CountryDial(
      iso: 'GH',
      name: 'Ghana',
      flag: '🇬🇭',
      dial: '+233',
      nationalLength: 9,
      placeholder: '241234567',
    ),
    CountryDial(
      iso: 'KE',
      name: 'Kenya',
      flag: '🇰🇪',
      dial: '+254',
      nationalLength: 9,
      placeholder: '712345678',
    ),
    CountryDial(
      iso: 'ZA',
      name: 'Afrique du Sud',
      flag: '🇿🇦',
      dial: '+27',
      nationalLength: 9,
      placeholder: '821234567',
    ),
    CountryDial(
      iso: 'EG',
      name: 'Égypte',
      flag: '🇪🇬',
      dial: '+20',
      nationalLength: 10,
      placeholder: '1001234567',
    ),
  ];

  static CountryDial byIso(String iso) =>
      all.firstWhere((c) => c.iso == iso, orElse: () => all.first);

  static CountryDial get defaultCountry => byIso(defaultIso);
}
