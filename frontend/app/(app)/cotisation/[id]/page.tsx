"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Copy, Share2, Lock, Pencil, Save, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PhoneInput } from "@/components/phone-input";
import {
  CotisationSettingsFields,
  settingsFromCotisation,
  settingsToPayload,
  type SettingsFormValue,
} from "@/components/cotisation-settings-fields";
import { usePendingSubmission } from "@/lib/pending-submission";
import { api, ApiError } from "@/lib/api";
import { APP_URL, CURRENCY } from "@/lib/constants";
import {
  buildE164,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  isValidNational,
} from "@/lib/countries";
import { formatAmount, progressPercent, remainingLabel } from "@/lib/format";
import { paymentMethodLabel, statusLabel } from "@/lib/labels";
import type { Cotisation, Contribution } from "@/lib/types";

function information(cot: Cotisation) {
  return JSON.stringify([cot.title, cot.description ?? "", Number(cot.target_amount)]);
}
function settingsKey(cot: Cotisation) {
  return JSON.stringify(settingsFromCotisation(cot.settings));
}
type ManualPayload = { contributor_name: string; contributor_phone: string; amount: number; payment_method: "manual" };

export default function CotisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cotisation, setCotisation] = useState<Cotisation | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const infoDirty = useRef(false);
  const settingsDirty = useRef(false);
  const infoBase = useRef("");
  const settingsBase = useRef("");
  const loadVersion = useRef(0);
  const [infoConflict, setInfoConflict] = useState(false);
  const [settingsConflict, setSettingsConflict] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [settings, setSettings] = useState<SettingsFormValue>(
    settingsFromCotisation(null)
  );

  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState("");
  const [mCountryIso, setMCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [mPhone, setMPhone] = useState("");
  const [mAmount, setMAmount] = useState("");
  const [mSaving, setMSaving] = useState(false);
  const [extending, setExtending] = useState(false);
  const [payingFee, setPayingFee] = useState(false);
  const manualSubmission = usePendingSubmission<ManualPayload>(`mastercota:manual:${id}`);

  function resetInfo(cot: Cotisation) {
    setTitle(cot.title);
    setDescription(cot.description ?? "");
    setTarget(String(cot.target_amount));
    infoDirty.current = false;
    infoBase.current = information(cot);
    setInfoConflict(false);
  }
  function resetSettings(cot: Cotisation) {
    setSettings(settingsFromCotisation(cot.settings));
    settingsDirty.current = false;
    settingsBase.current = settingsKey(cot);
    setSettingsConflict(false);
  }

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    try {
      const [c, contrib] = await Promise.all([
        api<{ cotisation: Cotisation }>(`/api/cotisations/${id}`),
        api<{ contributions: Contribution[] }>(
          `/api/cotisations/${id}/contributions`
        ),
      ]);
      if (version !== loadVersion.current) return;
      setCotisation(c.cotisation);
      setContributions(contrib.contributions ?? []);
      if (!infoDirty.current) resetInfo(c.cotisation);
      else setInfoConflict(infoBase.current !== information(c.cotisation));
      if (!settingsDirty.current) resetSettings(c.cotisation);
      else setSettingsConflict(settingsBase.current !== settingsKey(c.cotisation));
      setDeadline(String(c.cotisation.deadline).slice(0, 10));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const publicUrl = useMemo(() => {
    if (!cotisation) return "";
    return `${APP_URL}/c/${cotisation.slug}`;
  }, [cotisation]);

  const best = useMemo(() => {
    const paid = contributions.filter((c) => c.status === "paid");
    if (!paid.length) return null;
    return paid.reduce((a, b) =>
      Number(a.amount) >= Number(b.amount) ? a : b
    );
  }, [contributions]);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    ++loadVersion.current;
    setSaving(true);
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            expected_edit_version: cotisation?.edit_version,
            title: title.trim(),
            description: description.trim() || null,
            target_amount: Number(target.replace(/\s/g, "").replace(",", ".")),
          }),
        }
      );
      ++loadVersion.current;
      setCotisation(data.cotisation);
      resetInfo(data.cotisation);
      toast.success("Informations enregistrées");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    ++loadVersion.current;
    setSaving(true);
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ expected_edit_version: cotisation?.edit_version, settings: settingsToPayload(settings) }),
        }
      );
      ++loadVersion.current;
      setCotisation(data.cotisation);
      resetSettings(data.cotisation);
      toast.success("Réglages enregistrés");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function closeCotisation() {
    if (changingStatus || !confirm("Clôturer cette cotisation ? Les nouveaux transferts seront fermés. Les montants déjà reçus pourront encore être enregistrés."))
      return;
    setChangingStatus(true);
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "closed" }),
        }
      );
      ++loadVersion.current;
      setCotisation(data.cotisation);
      toast.success("Cotisation clôturée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setChangingStatus(false); }
  }

  async function reopenCotisation() {
    if (changingStatus) return;
    setChangingStatus(true);
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        }
      );
      ++loadVersion.current;
      setCotisation(data.cotisation);
      toast.success("Cotisation réouverte");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally { setChangingStatus(false); }
  }

  async function resumeFeePayment() {
    setPayingFee(true);
    try {
      const data = await api<{
        authorization_url?: string;
        payment_required?: boolean;
        reference?: string;
      }>(`/api/cotisations/${id}/pay-fee`, { method: "POST" });
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      if (data.reference) { router.push(`/cotisation/${id}/frais?ref=${encodeURIComponent(data.reference)}`); return; }
      toast.error("Paiement indisponible");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPayingFee(false);
    }
  }

  async function confirmContribution(contributionId: string) {
    try {
      await api(`/api/contributions/${contributionId}/confirm`, {
        method: "POST",
      });
      toast.success("Contribution confirmée");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function rejectContribution(contributionId: string) {
    if (!confirm("Refuser cette contribution ?")) return;
    try {
      await api(`/api/contributions/${contributionId}/reject`, {
        method: "POST",
      });
      toast.success("Contribution refusée");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function extendCotisation() {
    if (
      !confirm(
        "Prolonger de 10 jours pour 2 000 FCFA ? (dans la limite de 60 jours au total)"
      )
    ) {
      return;
    }
    setExtending(true);
    try {
      const data = await api<{
        authorization_url?: string;
        fee?: number;
        reference?: string;
        error?: string;
      }>(`/api/cotisations/${id}/extend`, { method: "POST" });
      if (data.authorization_url) {
        toast.message(`Frais de prolongation : ${formatAmount(data.fee ?? 2000)}`);
        window.location.href = data.authorization_url;
        return;
      }
      if (data.reference) { router.push(`/cotisation/${id}/frais?ref=${encodeURIComponent(data.reference)}`); return; }
      toast.error("Prolongation impossible");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setExtending(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Lien copié");
  }

  async function share() {
    const msg =
      settings.share_message.trim() ||
      `Soutenez « ${cotisation?.title} » : ${publicUrl}`;
    const text = settings.share_message.trim()
      ? `${settings.share_message.trim()}\n${publicUrl}`
      : msg;
    if (navigator.share) {
      try {
        await navigator.share({ title: cotisation?.title, text, url: publicUrl });
        return;
      } catch {
        /* fallthrough */
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Message de partage copié");
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (mSaving || !manualSubmission.ready) return;
    const amount = Number(mAmount.replace(/\s/g, "").replace(",", "."));
    if (!manualSubmission.pending && (!mName.trim() || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000)) {
      toast.error("Nom et montant requis");
      return;
    }
    const country = getCountryByIso(mCountryIso);
    if (!manualSubmission.pending && !isValidNational(country, mPhone)) {
      toast.error(
        `Numéro invalide (${country.nationalLength} chiffres, ${country.name})`
      );
      return;
    }
    const attempt = manualSubmission.begin({
      contributor_name: mName.trim(), contributor_phone: buildE164(country, mPhone),
      amount, payment_method: "manual",
    });
    setMSaving(true);
    try {
      await api(`/api/cotisations/${id}/contributions`, {
        method: "POST",
        body: JSON.stringify({ ...attempt.payload, request_id: attempt.request_id }),
      });
      manualSubmission.clear();
      toast.success("Contribution ajoutée");
      setManualOpen(false);
      setMName("");
      setMPhone("");
      setMCountryIso(DEFAULT_COUNTRY_ISO);
      setMAmount("");
      load();
    } catch (err) {
      if (err instanceof ApiError && [400, 403, 422].includes(err.status)) manualSubmission.clear();
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setMSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">Chargement…</div>
    );
  }
  if (!cotisation) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">Cotisation introuvable.</p>
        <Button asChild variant="secondary">
          <Link href="/home">Retour à l&apos;accueil</Link>
        </Button>
      </div>
    );
  }

  const pct = progressPercent(
    Number(cotisation.current_amount),
    Number(cotisation.target_amount)
  );
  const showBest =
    cotisation.settings?.show_best_contributor !== false && best;

  return (
    <div className="mc-page">
      <div className="mx-auto max-w-4xl space-y-7">
        <section className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#143268_0%,#214b86_100%)] p-6 text-white shadow-[0_28px_70px_-40px_rgb(20_50_104_/_90%)] sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold-bright/15 blur-2xl" />
          <div className="relative">
            <Button
              variant="ghost"
              className="-ml-3 mb-5 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => router.push("/home")}
            >
              <ArrowLeft className="size-4" />
              Retour
            </Button>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/10">
                    {statusLabel(cotisation.status)}
                  </Badge>
                  {cotisation.is_free_tier ? (
                    <span className="rounded-full bg-gold-bright/15 px-2.5 py-1 text-[11px] font-bold text-gold-bright">
                      Offre gratuite
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-4 text-balance text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                  {cotisation.title}
                </h1>
                {cotisation.description ? (
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                    {cotisation.description}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-right backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45">
                  Période
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
                  <CalendarDays className="size-3.5 text-gold-bright" />
                  {cotisation.status === "pending_fee"
                    ? "Démarre à l’activation"
                    : remainingLabel(cotisation.deadline)}
                </p>
                {cotisation.duration_days ? (
                  <p className="mt-1 text-xs text-white/45">
                    Durée : {cotisation.duration_days} jours
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

      {cotisation.platform_payment?.application_status === "review_required" && !cotisation.platform_payment.review_resolved_at ? (
        <div role="alert" className="mc-panel border-amber-500/35 bg-amber-50/80 p-5 text-sm">
          <p>Votre paiement a été reçu, mais le service n’a pas pu être appliqué. Ne payez pas une seconde fois.</p>
          <Button asChild variant="secondary" className="mt-3"><Link href={`/cotisation/${id}/frais?ref=${encodeURIComponent(cotisation.platform_payment.reference)}`}>Consulter le paiement</Link></Button>
        </div>
      ) : null}
      {cotisation.platform_payment?.review_resolved_at ? (
        <div role="status" className="mc-panel space-y-2 bg-secondary/50 p-5 text-sm">
          <p className="font-medium">Le support a terminé l’examen de votre paiement.</p>
          <p className="whitespace-pre-wrap break-words">{cotisation.platform_payment.review_resolution_note}</p>
          <p>Ce paiement n’a pas activé le service. Suivez les instructions du support avant un nouveau paiement.</p>
          <Button asChild variant="secondary"><Link href={`/cotisation/${id}/frais?ref=${encodeURIComponent(cotisation.platform_payment.reference)}`}>Consulter le paiement examiné</Link></Button>
        </div>
      ) : null}
      {cotisation.status === "pending_fee" && (cotisation.platform_payment?.application_status !== "review_required" || !!cotisation.platform_payment.review_resolved_at) ? (
        <div className="mc-panel border-amber-500/35 bg-amber-50/80 p-5 text-sm">
          <p className="font-semibold text-ink">
            Frais Mastercota en attente
          </p>
          <p className="mt-1 text-muted-foreground">
            Réglez {formatAmount(Number(cotisation.platform_fee_amount || 0))}{" "}
            pour activer la cotisation et partager le lien.
          </p>
          <Button
            className="mt-3"
            onClick={resumeFeePayment}
            disabled={payingFee}
          >
            {payingFee ? "Redirection…" : "Payer les frais"}
          </Button>
        </div>
      ) : null}

      {!cotisation.owner_wave_pay_link &&
      !cotisation.owner_wave_phone &&
      cotisation.status !== "pending_fee" ? (
        <div className="mc-panel border-amber-500/30 bg-amber-50/70 p-5 text-sm">
          <p className="font-medium text-ink">Wave non configuré</p>
          <p className="mt-1 text-muted-foreground">
            Ajoutez un lien Wave Business ou votre numéro pour recevoir les
            contributions.
          </p>
          <Button asChild size="sm" variant="secondary" className="mt-3">
            <Link href="/profile/payout">Configurer Wave</Link>
          </Button>
        </div>
      ) : null}

      <section className="mc-panel p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mc-kicker">Progression</p>
            <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
              {formatAmount(Number(cotisation.current_amount))}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              sur un objectif de {formatAmount(Number(cotisation.target_amount))}
            </p>
          </div>
          <div className="rounded-2xl bg-secondary px-4 py-3 text-right">
            <p className="text-2xl font-extrabold tracking-[-0.03em] text-ink">
              {pct.toFixed(0)} %
            </p>
            <p className="text-xs font-medium text-muted-foreground">atteint</p>
          </div>
        </div>

        <Progress value={pct} className="mt-5 h-3 bg-secondary" />

        {showBest ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-accent/70 px-4 py-3 text-sm">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm">
              <Trophy className="size-4" />
            </span>
            <p className="min-w-0 text-muted-foreground">
              Meilleur contributeur :{" "}
              <span className="font-bold text-ink">{best.contributor_name}</span>{" "}
              · {formatAmount(Number(best.amount))}
            </p>
          </div>
        ) : null}
      </section>

      <div className="mc-panel-soft flex flex-wrap gap-2 p-3">
        <Button onClick={share} disabled={cotisation.status === "pending_fee"}>
          <Share2 className="size-4" />
          Partager
        </Button>
        <Button variant="secondary" onClick={copyLink} disabled={cotisation.status === "pending_fee"}>
          <Copy className="size-4" />
          Copier le lien
        </Button>
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" disabled={!cotisation.lifecycle?.can_record_contribution}>
              <Pencil className="size-4" />
              Contribution manuelle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une contribution</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Enregistrez uniquement un montant déjà reçu. L’ajout reste possible après la clôture pour régulariser un transfert.</p>
            <form onSubmit={addManual} className="space-y-4">
              {manualSubmission.pending ? <p role="status" className="text-sm">À confirmer : {manualSubmission.pending.payload.contributor_name}, {formatAmount(manualSubmission.pending.payload.amount)}. Réessayez pour retrouver le même enregistrement.</p> : null}
              <fieldset disabled={mSaving || !!manualSubmission.pending} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-name">Nom</Label>
                <Input
                  id="manual-name"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <PhoneInput
                  countryIso={mCountryIso}
                  onCountryChange={(iso) => {
                    setMCountryIso(iso);
                    setMPhone("");
                  }}
                  national={mPhone}
                  onNationalChange={setMPhone}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-amount">Montant ({CURRENCY})</Label>
                <Input
                  id="manual-amount"
                  value={mAmount}
                  onChange={(e) => setMAmount(e.target.value)}
                  required
                />
              </div>
              </fieldset>
              <Button type="submit" className="w-full" disabled={mSaving || !manualSubmission.ready}>
                {mSaving ? "Enregistrement…" : manualSubmission.pending ? "Réessayer l’enregistrement" : "Enregistrer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        {cotisation.status === "active" ? (
          <Button variant="destructive" onClick={closeCotisation} disabled={changingStatus}>
            <Lock className="size-4" />
            Clôturer
          </Button>
        ) : cotisation.lifecycle?.can_reopen ? (
          <Button variant="secondary" onClick={reopenCotisation} disabled={changingStatus}>
            Réouvrir
          </Button>
        ) : null}
        {cotisation.lifecycle?.can_extend ? (
          <Button
            variant="outline"
            onClick={extendCotisation}
            disabled={extending}
          >
            {extending ? "…" : "Prolonger +10 j (2 000 F)"}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-white/70 px-4 py-3">
        <span className="min-w-0 flex-1 break-all text-xs text-muted-foreground sm:text-sm">{publicUrl}</span>
        <Button size="sm" variant="ghost" onClick={copyLink}>
          <Copy className="size-3.5" />
          Copier
        </Button>
      </div>

      <Tabs defaultValue="contributions">
        <TabsList className="w-full">
          <TabsTrigger value="contributions" className="flex-1">
            Contributions
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex-1">
            Modifier
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            Réglages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="mt-4">
          {contributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune contribution pour le moment. Partagez le lien.
            </p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-[1.35rem] border border-border/80 bg-white/85 shadow-[0_18px_50px_-40px_rgb(20_50_104_/_40%)]">
              {contributions.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{c.contributor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(c.status)} ·{" "}
                      {paymentMethodLabel(c.payment_method)}
                      {c.note ? ` · ${c.note}` : ""}
                    </p>
                    <p className="mt-1 font-semibold sm:hidden">
                      {formatAmount(Number(c.amount))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="hidden font-semibold sm:block">
                      {formatAmount(Number(c.amount))}
                    </p>
                    {c.status === "awaiting_confirmation" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => confirmContribution(c.id)}
                        >
                          Confirmer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectContribution(c.id)}
                        >
                          Refuser
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <form
            onSubmit={saveInfo}
            className="mc-panel space-y-4 p-5 sm:p-6"
          >
            {infoConflict ? <div role="alert" className="space-y-2 rounded-xl bg-amber-500/10 p-3 text-sm">
              <p>Ces informations ont changé sur un autre écran. Votre saisie est conservée.</p>
              <Button type="button" variant="secondary" onClick={() => resetInfo(cotisation)}>Charger les informations à jour</Button>
              <Button type="button" variant="ghost" onClick={() => { infoBase.current = information(cotisation); setInfoConflict(false); }}>Garder ma saisie</Button>
            </div> : null}
            <fieldset disabled={saving} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titre</Label>
              <Input id="edit-title" value={title} onChange={(e) => { infoDirty.current = true; setTitle(e.target.value); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={description}
                onChange={(e) => { infoDirty.current = true; setDescription(e.target.value); }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-target">Objectif ({CURRENCY})</Label>
                <Input
                  id="edit-target"
                  value={target}
                  onChange={(e) => { infoDirty.current = true; setTarget(e.target.value); }}
                />
              </div>
              <div className="space-y-2">
                <Label>Date limite</Label>
                <Input type="date" value={deadline} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  La durée se gère via l&apos;offre initiale ou une
                  prolongation payante.
                </p>
              </div>
            </div>
            </fieldset>
            <Button type="submit" disabled={saving || infoConflict}>
              <Save className="size-4" />
              {saving ? "…" : "Enregistrer"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <form
            onSubmit={saveSettings}
            className="mc-panel p-5 sm:p-6"
          >
            {settingsConflict ? <div role="alert" className="space-y-2 rounded-xl bg-amber-500/10 p-3 text-sm">
              <p>Les réglages ont changé sur un autre écran. Vos choix sont conservés.</p>
              <Button type="button" variant="secondary" onClick={() => resetSettings(cotisation)}>Charger les réglages à jour</Button>
              <Button type="button" variant="ghost" onClick={() => { settingsBase.current = settingsKey(cotisation); setSettingsConflict(false); }}>Garder mes réglages</Button>
            </div> : null}
            <fieldset disabled={saving}>
            <CotisationSettingsFields
              value={settings}
              onChange={(value) => { settingsDirty.current = true; setSettings(value); }}
            />
            </fieldset>
            <Button type="submit" className="mt-4" disabled={saving || settingsConflict}>
              <Save className="size-4" />
              {saving ? "…" : "Enregistrer les réglages"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
