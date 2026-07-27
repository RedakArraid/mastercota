/// Frais Mastercota + Paystack MoMo CI — aligné sur backend/src/lib/fees.ts
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

class Fees {
  Fees._();

  static const double platformRate = 0.01;
  static const double paystackMomoRate = 0.0195;
  static const double serviceRate = platformRate + paystackMomoRate;
  static const String serviceFeeLabel = '~3 %';

  static int roundUpTo5(double n) => (n / 5).ceil() * 5;

  /// [net] = montant crédité à la cotisation ; [gross] = débit contributeur.
  static FeeQuote? fromNet(num netInput) {
    final net = netInput.round();
    if (net <= 0) return null;
    final gross = roundUpTo5(net / (1 - serviceRate));
    return FeeQuote(net: net, gross: gross, fee: gross - net);
  }
}
