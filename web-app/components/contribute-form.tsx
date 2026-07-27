"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  COMMISSION_RATE,
  CURRENCY,
  DEFAULT_COUNTRY_CODE,
} from "@/lib/constants";
import { formatAmount } from "@/lib/format";
import type { Cotisation } from "@/lib/types";

export function ContributeForm({ cotisation }: { cotisation: Cotisation }) {
  const settings = cotisation.settings ?? {};
  const minAmount = settings.min_amount ?? 0;
  const anonymousAllowed = settings.anonymous_allowed ?? false;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!parsed || parsed <= 0) {
      toast.error("Indiquez un montant valide");
      return;
    }
    if (minAmount > 0 && parsed < minAmount) {
      toast.error(`Minimum : ${formatAmount(minAmount)}`);
      return;
    }
    const contributorName = anonymousAllowed && !name.trim()
      ? "Anonyme"
      : name.trim();
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
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "paystack-initialize",
        {
          body: {
            cotisation_id: cotisation.id,
            amount: parsed,
            contributor_name: contributorName,
            contributor_phone: fullPhone,
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data?.authorization_url as string | undefined;
      if (!url) throw new Error("URL de paiement manquante");
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Paiement impossible");
      setLoading(false);
    }
  }

  const preview = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;
  const fee = Math.round(preview * COMMISSION_RATE);

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
        <Label htmlFor="amount">Montant ({CURRENCY})</Label>
        <Input
          id="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={minAmount > 0 ? `Min. ${minAmount}` : "5000"}
          required
        />
      </div>
      {preview > 0 ? (
        <p className="text-xs text-muted-foreground">
          Frais de service 1&nbsp;% : {formatAmount(fee)} — le reste revient à
          l&apos;organisateur.
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Redirection…" : "Contribuer avec Paystack"}
      </Button>
    </form>
  );
}
