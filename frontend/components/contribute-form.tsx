"use client";

import { useRef, useState } from "react";
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
  digitsOnly,
  formatWaveDisplay,
  launchWavePayment,
  resolveWavePayoutMode,
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
  const wavePayLink = cotisation.owner_wave_pay_link;
  const wavePhone = cotisation.owner_wave_phone;
  const payoutMode = resolveWavePayoutMode({
    mode: cotisation.owner_wave_payout_mode,
    wavePayLink,
    wavePhone,
  });
  const canPay =
    (payoutMode === "business" && Boolean(wavePayLink)) ||
    (payoutMode === "phone" && Boolean(wavePhone));

  const requestId = useRef<string | null>(null);
  const [name, setName] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [contributionId, setContributionId] = useState<string | null>(null);
  const country = getCountryByIso(countryIso);

  const preview = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;
  const isBusiness = payoutMode === "business";

  async function openWave() {
    if (!payoutMode || preview <= 0) return;
    setLaunching(true);
    try {
      await launchWavePayment({
        amount: preview,
        mode: payoutMode,
        wavePayLink,
        wavePhone,
      });
      if (!isBusiness) {
        toast.message("Numéro copié. Collez-le dans Wave, puis le montant");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ouverture Wave impossible");
    } finally {
      setLaunching(false);
    }
  }

  async function copyPhone() {
    if (!wavePhone) return;
    try {
      await navigator.clipboard.writeText(digitsOnly(wavePhone));
      toast.success("Numéro Wave copié");
    } catch {
      toast.error("Copie impossible");
    }
  }

  async function copyAmount() {
    if (preview <= 0) return;
    try {
      await navigator.clipboard.writeText(String(Math.round(preview)));
      toast.success("Montant copié");
    } catch {
      toast.error("Copie impossible");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPay || !payoutMode) {
      toast.error("Paiement Wave non configuré par l’organisateur");
      return;
    }
    const parsed = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 1_000_000_000) {
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
        `Numéro invalide (${country.nationalLength} chiffres pour ${country.name})`
      );
      return;
    }
    setLoading(true);
    try {
      setStep("pay");
      await launchWavePayment({
        amount: parsed,
        mode: payoutMode,
        wavePayLink,
        wavePhone,
      });
      if (!isBusiness) {
        toast.message("Numéro copié. Ouvrez Wave et envoyez le montant");
      }
      setLoading(false);
      setLaunching(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ouverture Wave impossible");
      setStep("form");
      setLoading(false);
    }
  }

  async function markPaid() {
    const parsed = Number(amount.replace(/\s/g, "").replace(",", "."));
    const contributorName =
      anonymousAllowed && !name.trim() ? "Anonyme" : name.trim();
    const fullPhone = buildE164(country, phone);
    if (loading) return;
    requestId.current ??= crypto.randomUUID();
    setLoading(true);
    try {
      const data = await api<{ contribution: { id: string } }>(
        `/api/cotisations/${cotisation.id}/contributions`,
        {
          method: "POST",
          body: JSON.stringify({
            request_id: requestId.current,
            contributor_name: contributorName,
            contributor_phone: fullPhone,
            amount: parsed,
            note: note.trim() || null,
            payment_method: isBusiness ? "wave_business" : "wave_p2p",
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

  if (!canPay) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm">
        <p className="font-medium text-ink">Paiement bientôt disponible</p>
        <p className="mt-1 text-muted-foreground">
          L’organisateur doit encore configurer Wave (lien Business ou numéro).
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
          est en attente de confirmation.
        </p>
        {contributionId ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            Réf. {contributionId.slice(0, 8)}
          </p>
        ) : null}
      </div>
    );
  }

  if (step === "pay") {
    return (
      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {isBusiness ? "Paiement Wave Business" : "Paiement Wave manuel"}
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">
            {formatAmount(preview)}
          </h2>
        </div>

        {isBusiness ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium text-ink">
              Wave ouvert avec le montant prérempli
            </p>
            <p className="mt-1 text-muted-foreground">
              Validez dans l’app, puis revenez ici pour prévenir l’organisateur.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
            <p className="font-medium text-ink">Envoyez via Wave perso</p>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-base font-bold text-ink">
                {formatWaveDisplay(wavePhone || "")}
              </span>
              <Button type="button" size="sm" variant="secondary" onClick={copyPhone}>
                <Copy className="size-3.5" />
                Copier
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>
                Montant :{" "}
                <strong>{formatAmount(preview)}</strong>
              </span>
              <Button type="button" size="sm" variant="secondary" onClick={copyAmount}>
                <Copy className="size-3.5" />
                Copier
              </Button>
            </div>
            <p className="text-muted-foreground">
              Ouvrez Wave → Envoyer → collez le numéro → collez le montant.
            </p>
          </div>
        )}

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={openWave}
          disabled={launching}
        >
          <ExternalLink className="size-4" />
          {launching
            ? "Ouverture…"
            : isBusiness
              ? "Payer via Wave"
              : "Rouvrir Wave"}
        </Button>

        <div className="space-y-2">
          <Label htmlFor="note">Note (optionnel)</Label>
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
          {loading ? "Envoi…" : "J’ai payé, prévenir l’organisateur"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setStep("form");
            setLaunching(false);
            setLoading(false);
          }}
        >
          Modifier le montant
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-4 text-sm">
        <p className="font-medium text-ink">
          {isBusiness
            ? "Paiement Wave Business en 1 clic"
            : "Paiement Wave, envoi manuel au numéro"}
        </p>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {isBusiness
            ? "Après « Payer avec Wave », une page pay.wave.com s’ouvre avec le montant déjà saisi. Validez dans l’app Wave, puis revenez ici pour prévenir l’organisateur. Mastercota ne prend 0 % sur ce montant."
            : "Vous allez voir le numéro Wave de l’organisateur. Ouvrez Wave, envoyez exactement le montant indiqué, puis revenez cliquer « J’ai payé ». Mastercota ne prend 0 % sur ce montant."}
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
        {loading
          ? "Ouverture de Wave…"
          : isBusiness
            ? "Payer avec Wave"
            : "Continuer vers Wave"}
      </Button>
    </form>
  );
}
