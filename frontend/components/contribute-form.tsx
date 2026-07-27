"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { CURRENCY, DEFAULT_COUNTRY_CODE } from "@/lib/constants";
import { feesFromNet, SERVICE_FEE_LABEL } from "@/lib/fees";
import { formatAmount } from "@/lib/format";
import type { Cotisation } from "@/lib/types";

export default function ContributeForm({
  cotisation,
}: {
  cotisation: Cotisation;
}) {
  const settings = cotisation.settings ?? {};
  const minAmount = settings.min_amount ?? 0;
  const anonymousAllowed = settings.anonymous_allowed ?? false;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const preview = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;
  const quote = feesFromNet(preview);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!parsed || parsed <= 0) {
      toast.error("Indiquez un montant valide");
      return;
    }
    if (minAmount > 0 && parsed < minAmount) {
      toast.error(`Minimum dans la cotisation : ${formatAmount(minAmount)}`);
      return;
    }
    const contributorName =
      anonymousAllowed && !name.trim() ? "Anonyme" : name.trim();
    if (!contributorName) {
      toast.error("Votre nom est requis");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    const fullPhone = phone.startsWith("+")
      ? phone
      : `${DEFAULT_COUNTRY_CODE}${digits}`;

    setLoading(true);
    try {
      const data = await api<{ authorization_url: string; gross: number }>(
        "/api/paystack/initialize",
        {
          method: "POST",
          body: JSON.stringify({
            cotisation_id: cotisation.id,
            amount: parsed,
            contributor_name: contributorName,
            contributor_phone: fullPhone,
          }),
        }
      );
      window.location.href = data.authorization_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Paiement impossible");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Votre nom</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={anonymousAllowed ? "Optionnel" : "Prénom et nom"}
          required={!anonymousAllowed}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <div className="flex gap-2">
          <div className="flex h-9 items-center rounded-lg border border-input bg-secondary px-3 text-sm text-muted-foreground">
            🇨🇮 {DEFAULT_COUNTRY_CODE}
          </div>
          <Input
            id="phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07 XX XX XX XX"
            required
            className="flex-1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">
          Montant dans la cotisation ({CURRENCY})
        </Label>
        <Input
          id="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex. 10000"
          required
        />
      </div>
      {quote ? (
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm space-y-1.5">
          <div className="flex justify-between text-muted-foreground">
            <span>Dans la cotisation</span>
            <span className="font-medium text-foreground">
              {formatAmount(quote.net)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Frais de service ({SERVICE_FEE_LABEL})</span>
            <span>+{formatAmount(quote.fee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
            <span>Vous payez</span>
            <span>{formatAmount(quote.gross)}</span>
          </div>
        </div>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading
          ? "Redirection…"
          : quote
            ? `Payer ${formatAmount(quote.gross)}`
            : "Contribuer"}
      </Button>
    </form>
  );
}
