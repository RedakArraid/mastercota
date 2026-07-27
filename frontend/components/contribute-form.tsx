"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
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
import {
  formatWaveDisplay,
  waveAppOpenUrls,
  wavePaymentInstructions,
} from "@/lib/wave";
import type { Cotisation } from "@/lib/types";

type Step = "form" | "pay" | "done";

export default function ContributeForm({
  cotisation,
}: {
  cotisation: Cotisation;
}) {
  const settings = cotisation.settings ?? {};
  const minAmount = settings.min_amount ?? 0;
  const anonymousAllowed = settings.anonymous_allowed ?? false;
  const wavePhone = cotisation.owner_wave_phone;

  const [name, setName] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [contributionId, setContributionId] = useState<string | null>(null);
  const country = getCountryByIso(countryIso);

  const preview = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;

  const instructions = useMemo(() => {
    if (!wavePhone || preview <= 0) return null;
    return wavePaymentInstructions({
      wavePhone,
      amount: preview,
      cotisationTitle: cotisation.title,
    });
  }, [wavePhone, preview, cotisation.title]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible");
    }
  }

  function openWave() {
    const urls = waveAppOpenUrls();
    // Essaye d’ouvrir l’app ; fallback navigateur
    window.location.href = urls[0];
    setTimeout(() => {
      window.open(urls[urls.length - 1], "_blank", "noopener,noreferrer");
    }, 800);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wavePhone) {
      toast.error("L’organisateur n’a pas encore indiqué son numéro Wave");
      return;
    }
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
    setLoading(true);
    try {
      // Passe à l’écran paiement Wave sans encore créer la ligne
      setStep("pay");
    } finally {
      setLoading(false);
    }
  }

  async function markPaid() {
    const parsed = Number(amount.replace(/\s/g, "").replace(",", "."));
    const contributorName =
      anonymousAllowed && !name.trim() ? "Anonyme" : name.trim();
    const fullPhone = buildE164(country, phone);
    setLoading(true);
    try {
      const data = await api<{ contribution: { id: string } }>(
        `/api/cotisations/${cotisation.id}/contributions`,
        {
          method: "POST",
          body: JSON.stringify({
            contributor_name: contributorName,
            contributor_phone: fullPhone,
            amount: parsed,
            note: note.trim() || null,
            payment_method: "wave_p2p",
          }),
        }
      );
      setContributionId(data.contribution.id);
      setStep("done");
      toast.success("Signalement envoyé à l’organisateur");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setLoading(false);
    }
  }

  if (!wavePhone) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm">
        <p className="font-medium text-ink">Paiement temporairement indisponible</p>
        <p className="mt-1 text-muted-foreground">
          L’organisateur doit encore configurer son numéro Wave pour recevoir
          les contributions en direct.
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-ink">Merci !</h2>
        <p className="text-sm text-muted-foreground">
          Votre contribution de{" "}
          <span className="font-semibold text-foreground">
            {formatAmount(preview)}
          </span>{" "}
          est en attente de confirmation par l’organisateur. L’argent est déjà
          sur son Wave — Mastercota sert uniquement au suivi.
        </p>
        {contributionId ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            Réf. {contributionId.slice(0, 8)}
          </p>
        ) : null}
      </div>
    );
  }

  if (step === "pay" && instructions) {
    return (
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Étape 2 · Wave
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">
            Envoyez {instructions.amountLabel}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ouvrez Wave et envoyez exactement ce montant au numéro de
            l’organisateur. L’argent arrive tout de suite chez lui.
          </p>
        </div>

        <div className="space-y-3 rounded-xl bg-secondary/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Numéro Wave</p>
              <p className="text-lg font-bold tracking-wide text-ink">
                {instructions.wavePhoneDisplay}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                copy(instructions.wavePhoneDigits, "Numéro")
              }
            >
              <Copy className="size-4" />
              Copier
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <div>
              <p className="text-xs text-muted-foreground">Montant</p>
              <p className="text-lg font-bold text-ink">
                {instructions.amountLabel}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => copy(String(instructions.amount), "Montant")}
            >
              <Copy className="size-4" />
              Copier
            </Button>
          </div>
        </div>

        <Button type="button" size="lg" className="w-full" onClick={openWave}>
          <ExternalLink className="size-4" />
          Ouvrir Wave
        </Button>

        <div className="space-y-2">
          <Label htmlFor="note">Référence / note (optionnel)</Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. nom affiché sur Wave"
          />
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={loading}
          onClick={markPaid}
        >
          {loading ? "Envoi…" : "J’ai payé — prévenir l’organisateur"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => setStep("form")}
        >
          Modifier le montant
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
        <p className="font-medium text-ink">Paiement Wave en direct</p>
        <p className="mt-1 text-muted-foreground">
          0&nbsp;% de frais Mastercota. Versement au{" "}
          <span className="font-medium text-foreground">
            {formatWaveDisplay(wavePhone)}
          </span>
          .
        </p>
      </div>
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
      </div>
      {preview > 0 ? (
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
          <div className="flex justify-between font-semibold">
            <span>Vous envoyez</span>
            <span>{formatAmount(preview)}</span>
          </div>
        </div>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        Continuer vers Wave
      </Button>
    </form>
  );
}
