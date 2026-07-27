/// Frais plateforme Mastercota (organisateur) — plus de % contributeur.
class FeeQuote {
  final int net;
  final int gross;
  final int fee;

  const FeeQuote({
    required this.net,
    required this.gross,
    required this.fee,
  });
}

class PlatformPricing {
  PlatformPricing._();

  static const int freeDurationDays = 35;
  static const int maxDurationDays = 60;
  static const int extensionDays = 10;
  static const int extensionFee = 2000;

  static int? feeForDuration(int days) {
    if (days < 1 || days > maxDurationDays) return null;
    if (days <= 15) return 2000;
    if (days <= 35) return 4000;
    return 10000;
  }
}

class Fees {
  Fees._();

  static const double platformRate = 0;
  static const double paystackMomoRate = 0;
  static const double serviceRate = 0;
  static const String serviceFeeLabel = '0 %';

  static int roundUpTo5(double n) => (n / 5).ceil() * 5;

  /// Plus de surcoût : le contributeur paie le montant exact.
  static FeeQuote? fromNet(num netInput) {
    final net = netInput.round();
    if (net <= 0) return null;
    return FeeQuote(net: net, gross: net, fee: 0);
  }
}
