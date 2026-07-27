export function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "closed":
      return "Clôturée";
    case "completed":
      return "Objectif atteint";
    case "pending":
      return "En attente";
    case "paid":
      return "Payée";
    case "failed":
      return "Échouée";
    default:
      return status;
  }
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "Paiement";
  const m = method.toLowerCase();
  if (m.includes("mobile") || m === "mobile_money") return "Mobile Money";
  if (m.includes("card")) return "Carte";
  if (m.includes("bank")) return "Banque";
  if (m.includes("manual")) return "Manuel";
  return method;
}
