"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ExternalLink } from "lucide-react";
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
  launchWavePayment,
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
  const wavePayLink = cotisation.owner_wave_pay_link;
  const hasWave = Boolean(wavePhone || wavePayLink);

  const [name, setName] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [launchMode, setLaunchMode] = useState<"link" | "p2p" | null>(null);
  const country = getCountryByIso(countryIso);

  const preview = Number(amount.replace(/\s/g, "").replace(",", ".")) || 0;

  const instructions = useMemo(() => {
    if (!wavePhone || preview <= 0) {
      if (wavePayLink && preview > 0) {
        return wavePaymentInstructions({
          wavePhone: wavePhone || "",
          amount: preview,
          cotisationTitle: cotisation.title,
          wavePayLink,
        });
      }
      return null;
    }
    return wavePaymentInstructions({
      wavePhone,
      amount: preview,
      cotisationTitle: cotisation.title,
      wavePayLink,
    });
  }, [wavePhone, wavePayLink, preview, cotisation.title]);

  async function openWaveAuto() {
    if (preview <= 0) return;
    setLaunching(true);
    try {
      const result = await launchWavePayment({
        amount: preview,
        wavePhone,
        wavePayLink,
      });
      setLaunchMode(result.mode);
      if (result.mode === "link") {
        toast.success("Ouverture de Wave avec le montant…");
      } else {
        toast.message("Numéro copié — collez-le dans Wave, puis le montant");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d’ouvrir Wave");
    } finally {
      setLaunching(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasWave) {
      toast.error("L’organisateur n’a pas encore configuré Wave");
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
      setStep("pay");
      // Lancement automatique dès l’étape paiement
      await launchWavePayment({
        amount: parsed,
        wavePhone,
        wavePayLink,
      }).then((r) => setLaunchMode(r.mode));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ouverture Wave impossible");
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

  if (!hasWave) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm">
        <p className="font-medium text-ink">Paiement temporairement indisponible</p>
        <p className="mt-1 text-muted-foreground">
          L’organisateur doit configurer son lien ou numéro Wave.
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
          est en attente de confirmation. L’argent est déjà chez
          l’organisateur via Wave.
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
            Paiement Wave
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">
            {formatAmount(preview)}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {launchMode === "link"
              ? "Wave s’ouvre avec le montant déjà saisi. Validez le paiement dans l’app, puis revenez ici."
              : "Le numéro a été copié et Wave s’ouvre. Collez le numéro, puis le montant (copié ensuite), et envoyez."}
          </p>
        </div>

        {wavePhone ? (
          <div className="rounded-xl bg-secondary/50 px-4 py-3 text-sm">
            <p className="text-xs text-muted-foreground">Destinataire</p>
            <p className="font-bold text-ink">{formatWaveDisplay(wavePhone)}</p>
          </div>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={openWaveAuto}
          disabled={launching}
        >
          <ExternalLink className="size-4" />
          {launching ? "Ouverture…" : "Rouvrir Wave automatiquement"}
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

        {instructions && !wavePayLink ? (
          <p className="text-center text-xs text-muted-foreground">
            Astuce orga : ajoutez votre{" "}
            <span className="font-medium">lien de paiement Wave</span> pour un
            envoi 100&nbsp;% prérempli.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
        <p className="font-medium text-ink">Paiement Wave automatique</p>
        <p className="mt-1 text-muted-foreground">
          {wavePayLink
            ? "Un clic ouvre Wave avec le montant déjà rempli. 0 % de frais Mastercota."
            : "Un clic copie le numéro et ouvre Wave. 0 % de frais Mastercota."}
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
        {loading ? "Ouverture Wave…" : "Payer avec Wave"}
      </Button>
    </form>
  );
}
