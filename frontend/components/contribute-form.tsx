"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { usePendingSubmission } from "@/lib/pending-submission";
import { api, ApiError } from "@/lib/api";
import { CURRENCY } from "@/lib/constants";
import {
  buildE164,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  isValidNational,
} from "@/lib/countries";
import { daysRemaining, formatAmount } from "@/lib/format";
import {
  digitsOnly,
  formatWaveDisplay,
  launchWavePayment,
  resolveWavePayoutMode,
} from "@/lib/wave";
import type { Cotisation } from "@/lib/types";

type WavePayload = {
  contributor_name: string; contributor_phone: string; amount: number;
  note: string | null; payment_method: string;
};
type WaveDraft = { name: string; countryIso: string; phone: string; amount: string; note: string };
type Step = "form" | "pay" | "done";

export default function ContributeForm({
  cotisation,
  reportOnly = false,
}: {
  cotisation: Cotisation;
  reportOnly?: boolean;
}) {
  const [reporting, setReporting] = useState(reportOnly);
  const onlyReport = reportOnly || reporting;
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

  const submission = usePendingSubmission<WavePayload>(`mastercota:wave-report:${cotisation.id}`);
  const draftKey = `mastercota:wave-transfer:${cotisation.id}`;
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
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved) as WaveDraft;
        setName(draft.name); setCountryIso(draft.countryIso); setPhone(draft.phone);
        setAmount(draft.amount); setNote(draft.note); setStep("pay");
      }
    } catch { /* The form remains available when storage is disabled. */ }
  }, [draftKey]);
  function saveDraft() {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ name, countryIso, phone, amount, note })); } catch { /* See above. */ }
  }


  async function launchVerifiedPayment(value: number) {
    // Reserve the tab within the user's click, before checking the latest status.
    const popup = isBusiness ? window.open("about:blank", "_blank") : undefined;
    if (isBusiness && !popup) throw new Error("Autorisez l’ouverture de Wave dans un nouvel onglet, puis réessayez");
    if (popup) popup.opener = null;
    try {
      const latest = await api<{ cotisation: Cotisation }>(`/api/cotisations/by-slug/${encodeURIComponent(cotisation.slug)}`);
      if (latest.cotisation.status !== "active" || daysRemaining(latest.cotisation.deadline) < 0) {
        popup?.close();
        setReporting(true);
        toast.message("Les nouveaux transferts sont fermés. Signalez seulement un montant déjà envoyé.");
        return;
      }
      const current = latest.cotisation;
      const currentMode = resolveWavePayoutMode({ mode: current.owner_wave_payout_mode, wavePayLink: current.owner_wave_pay_link, wavePhone: current.owner_wave_phone });
      if (currentMode !== payoutMode || (current.owner_wave_pay_link ?? null) !== (wavePayLink ?? null) || (current.owner_wave_phone ?? null) !== (wavePhone ?? null)) {
        throw new Error("Les coordonnées Wave ont changé. Actualisez cette page avant de payer.");
      }
      if (value < Number(current.settings?.min_amount ?? 0)) {
        throw new Error(`Le minimum a changé : ${formatAmount(Number(current.settings?.min_amount))}. Corrigez le montant avant de payer.`);
      }
      await launchWavePayment({ amount: value, mode: payoutMode!, wavePayLink, wavePhone, popup: popup ?? undefined });
      if (!isBusiness) toast.message("Numéro copié. Ouvrez Wave et envoyez le montant");
    } catch (error) {
      popup?.close();
      throw error;
    }
  }

  async function openWave() {
    if (onlyReport || !payoutMode || preview <= 0) return;
    setLaunching(true);
    try {
      await launchVerifiedPayment(preview);
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
    if (!onlyReport && (!canPay || !payoutMode)) {
      toast.error("Paiement Wave non configuré par l’organisateur");
      return;
    }
    const parsed = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 1_000_000_000) {
      toast.error("Indiquez un montant valide");
      return;
    }
    if (!onlyReport && minAmount > 0 && parsed < minAmount) {
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
      saveDraft();
      setStep("pay");
      if (onlyReport) { setLoading(false); return; }
      await launchVerifiedPayment(parsed);
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
    if (loading || !submission.ready) return;
    const attempt = submission.begin({
      contributor_name: contributorName, contributor_phone: fullPhone, amount: parsed,
      note: note.trim() || null, payment_method: isBusiness ? "wave_business" : "wave_p2p",
    });
    saveDraft();
    setLoading(true);
    try {
      const data = await api<{ contribution: { id: string } }>(
        `/api/cotisations/${cotisation.id}/contributions`,
        {
          method: "POST",
          body: JSON.stringify({ ...attempt.payload, request_id: attempt.request_id }),
        }
      );
      submission.clear();
      try { sessionStorage.removeItem(draftKey); } catch { /* See above. */ }
      setContributionId(data.contribution.id);
      setStep("done");
      toast.success("Signalement envoyé à l’organisateur");
    } catch (err) {
      if (err instanceof ApiError && [400, 403, 422].includes(err.status)) submission.clear();
      toast.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setLoading(false);
    }
  }

  if (!canPay && !onlyReport) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm">
        <p className="font-medium text-ink">Paiement bientôt disponible</p>
        <p className="mt-1 text-muted-foreground">
          L’organisateur doit encore configurer Wave (lien Business ou numéro).
        </p>
        <Button type="button" variant="ghost" className="mt-3" onClick={() => setReporting(true)}>J’ai déjà effectué le transfert</Button>
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

        {onlyReport ? (
          <p className="rounded-xl bg-secondary/60 p-3 text-sm">Signalez uniquement un transfert déjà effectué. L’organisateur vérifiera sa réception avant de l’ajouter au total.</p>
        ) : isBusiness ? (
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

        {!onlyReport ? <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={openWave}
          disabled={launching || loading || !!submission.pending}
        >
          <ExternalLink className="size-4" />
          {launching
            ? "Ouverture…"
            : isBusiness
              ? "Payer via Wave"
              : "Rouvrir Wave"}
        </Button> : null}

        <div className="space-y-2">
          <Label htmlFor="note">Note (optionnel)</Label>
          <Input
            id="note"
            value={submission.pending?.payload.note ?? note}
            disabled={loading || !!submission.pending}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. nom affiché sur Wave"
          />
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={loading || !submission.ready}
          onClick={markPaid}
        >
          {loading ? "Envoi…" : "J’ai payé, prévenir l’organisateur"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={loading || !!submission.pending}
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
          {onlyReport ? "Signaler un transfert déjà effectué" : isBusiness
            ? "Paiement Wave Business en 1 clic"
            : "Paiement Wave, envoi manuel au numéro"}
        </p>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {onlyReport ? "Indiquez le montant réellement envoyé et le numéro utilisé pour permettre à l’organisateur de retrouver votre transfert." : isBusiness
            ? "Après « Payer avec Wave », une page pay.wave.com s’ouvre avec le montant déjà saisi. Validez dans l’app Wave, puis revenez ici pour prévenir l’organisateur. Mastercota prend 0 % sur ce montant."
            : "Vous allez voir le numéro Wave de l’organisateur. Ouvrez Wave, envoyez exactement le montant indiqué, puis revenez cliquer « J’ai payé ». Mastercota prend 0 % sur ce montant."}
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
          ? "Chargement…"
          : onlyReport ? "Signaler mon transfert" : isBusiness
            ? "Payer avec Wave"
            : "Continuer vers Wave"}
      </Button>
      {!onlyReport ? <Button type="button" variant="ghost" className="w-full" onClick={() => setReporting(true)}>J’ai déjà effectué le transfert</Button> : null}
    </form>
  );
}
