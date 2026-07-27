"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { api } from "@/lib/api";
import { CURRENCY } from "@/lib/constants";
import {
  buildE164,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  isValidNational,
} from "@/lib/countries";
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
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const country = getCountryByIso(countryIso);

  const preview = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;

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
    if (!isValidNational(country, phone)) {
      toast.error(
        `Numéro invalide — ${country.nationalLength} chiffres pour ${country.name}`
      );
      return;
    }
    const fullPhone = buildE164(country, phone);

    setLoading(true);
    try {
      const data = await api<{ authorization_url: string }>(
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
        <PhoneInput
          countryIso={countryIso}
          onCountryChange={(iso) => {
            setCountryIso(iso);
            setPhone("");
          }}
          national={phone}
          onNationalChange={setPhone}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Montant ({CURRENCY})</Label>
        <Input
          id="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex. 10000"
          required
        />
        <p className="text-xs text-muted-foreground">
          Aucun frais Mastercota sur votre contribution — vous payez exactement
          ce montant.
        </p>
      </div>
      {preview > 0 ? (
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
          <div className="flex justify-between font-semibold">
            <span>Vous payez</span>
            <span>{formatAmount(preview)}</span>
          </div>
        </div>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading
          ? "Redirection…"
          : preview > 0
            ? `Payer ${formatAmount(preview)}`
            : "Contribuer"}
      </Button>
    </form>
  );
}
