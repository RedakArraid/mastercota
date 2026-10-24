"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Eye, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CotisationSettingsFields,
  defaultSettingsForm,
  settingsToPayload,
  type SettingsFormValue,
} from "@/components/cotisation-settings-fields";
import { usePendingSubmission } from "@/lib/pending-submission";
import { api, ApiError } from "@/lib/api";
import { CURRENCY } from "@/lib/constants";
import {
  DURATION_PRESETS,
  FREE_DURATION_DAYS,
  quoteDuration,
} from "@/lib/fees";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Cotisation } from "@/lib/types";

type CreationPayload = {
  title: string;
  description: string | null;
  target_amount: number;
  duration_days: number;
  use_free: boolean;
  settings: ReturnType<typeof settingsToPayload>;
};

type BillingInfo = {
  freeEligible: boolean;
  freeDurationDays: number;
  maxDurationDays: number;
  presets: { days: number; fee: number; label: string }[];
  extension: { days: number; fee: number };
};

function StepHeading({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ink text-xs font-extrabold text-gold-bright">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">{title}</h2>
          <Icon className="size-4 text-primary" />
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function CreateCotisationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [settings, setSettings] = useState<SettingsFormValue>(
    defaultSettingsForm()
  );
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingError, setBillingError] = useState(false);
  const [useFree, setUseFree] = useState(true);
  const [durationDays, setDurationDays] = useState(35);
  const [loading, setLoading] = useState(false);
  const [hasWave, setHasWave] = useState<boolean | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const submission = usePendingSubmission<CreationPayload>(
    ownerId ? `mastercota:create:${ownerId}` : null
  );

  useEffect(() => {
    let active = true;
    api<{
      user: {
        id: string;
        wave_pay_link?: string | null;
        wave_phone?: string | null;
        wave_payout_mode?: "business" | "phone" | null;
      };
    }>("/api/profile")
      .then((profile) => {
        if (!active) return;
        setOwnerId(profile.user.id);
        setHasWave(
          Boolean(
            (profile.user?.wave_payout_mode === "phone" &&
              profile.user?.wave_phone) ||
              (profile.user?.wave_payout_mode === "business" &&
                profile.user?.wave_pay_link) ||
              (!profile.user?.wave_payout_mode &&
                (profile.user?.wave_pay_link || profile.user?.wave_phone))
          )
        );
      })
      .catch(() => {
        if (active) setHasWave(null);
      });

    api<BillingInfo>("/api/cotisations/billing-info")
      .then((info) => {
        if (!active) return;
        setBilling(info);
        if (info.freeEligible) {
          setUseFree(true);
          setDurationDays(info.freeDurationDays);
        } else {
          setUseFree(false);
          setDurationDays(15);
        }
      })
      .catch(() => {
        if (active) setBillingError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const quote = useMemo(() => {
    if (!billing) return null;
    return quoteDuration({
      durationDays,
      freeEligible: billing.freeEligible,
      useFree: useFree && billing.freeEligible,
    });
  }, [billing, durationDays, useFree]);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    const targetAmount = Number(target.replace(/\s/g, "").replace(",", "."));
    if (loading || !submission.ready) return;

    if (
      !submission.pending &&
      (!title.trim() ||
        !Number.isSafeInteger(targetAmount) ||
        targetAmount <= 0 ||
        targetAmount > 1_000_000_000 ||
        !quote)
    ) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }

    const attempt =
      submission.pending ??
      submission.begin({
        title: title.trim(),
        description: description.trim() || null,
        target_amount: targetAmount,
        duration_days: quote!.durationDays,
        use_free: quote!.isFree,
        settings: settingsToPayload(settings),
      });

    setLoading(true);
    try {
      const data = await api<{
        cotisation: Cotisation;
        payment_required?: boolean;
        authorization_url?: string;
        fee?: number;
      }>("/api/cotisations", {
        method: "POST",
        body: JSON.stringify({
          ...attempt.payload,
          request_id: attempt.request_id,
        }),
      });

      submission.clear();

      if (data.payment_required && data.authorization_url) {
        toast.message(
          `Paiement des frais : ${formatAmount(data.fee ?? quote?.fee ?? 0)}`
        );
        window.location.href = data.authorization_url;
        return;
      }

      toast.success(
        data.cotisation.is_free_tier
          ? "Cotisation gratuite créée"
          : "Cotisation créée"
      );
      router.push(`/cotisation/${data.cotisation.id}`);
      router.refresh();
    } catch (error) {
      if (
        error instanceof ApiError &&
        [400, 403, 422].includes(error.status)
      ) {
        submission.clear();
      }
      toast.error(error instanceof Error ? error.message : "Création impossible");
      setLoading(false);
    }
  }

  return (
    <div className="mc-page">
      <div className="mx-auto max-w-3xl space-y-7 sm:space-y-9">
        <header className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-ink">
            <Sparkles className="size-3.5 text-primary" />
            Nouvelle cotisation
          </div>
          <h1 className="mt-4 mc-page-title">Créez une collecte claire en quelques minutes.</h1>
          <p className="mx-auto mt-3 max-w-2xl mc-body sm:mx-0">
            Donnez un objectif à votre groupe, choisissez la durée et décidez ce
            que les participants voient. Mastercota prend 0 % sur les
            contributions.
          </p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          {[
            ["01", "Informations"],
            ["02", "Durée & frais"],
            ["03", "Visibilité"],
          ].map(([number, label]) => (
            <div
              key={number}
              className="rounded-2xl border border-border/80 bg-white/70 px-3 py-3 text-center"
            >
              <p className="text-[10px] font-extrabold tracking-[0.16em] text-primary">
                {number}
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-ink sm:text-sm">
                {label}
              </p>
            </div>
          ))}
        </div>

        {hasWave === false ? (
          <div className="mc-panel flex flex-col gap-4 border-amber-500/25 bg-amber-50/80 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="font-bold text-ink">Configurez la réception avant de partager</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Votre cotisation peut être préparée maintenant, mais un moyen
                  de réception doit être configuré pour recevoir les contributions.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/profile/payout">Configurer</Link>
            </Button>
          </div>
        ) : null}

        {submission.pending ? (
          <div
            role="status"
            className="mc-panel border-amber-500/30 bg-amber-50/75 p-5"
          >
            <p className="font-semibold text-ink">
              Une création est toujours en cours
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              « {submission.pending.payload.title} » attend sa confirmation.
              Reprenez la même tentative pour éviter un doublon.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button disabled={loading} onClick={onSubmit}>
                {loading ? "Vérification…" : "Reprendre"}
              </Button>
              <Button asChild variant="ghost">
                <Link href="/home">Retour au tableau de bord</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-6">
          <fieldset
            disabled={loading || !!submission.pending}
            className="space-y-6 disabled:opacity-60"
          >
            <section className="mc-panel p-5 sm:p-7">
              <StepHeading
                number="01"
                title="Les essentiels"
                description="Un titre parlant, une explication courte et un objectif facile à comprendre."
                icon={Check}
              />

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-semibold text-ink">
                    Titre de la cotisation
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex. Mariage de Aya & Karim"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    C’est le premier texte que vos participants verront.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="font-semibold text-ink">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="min-h-28 rounded-xl bg-white/80"
                    placeholder="Pourquoi cette cotisation ? À quoi servira la somme ?"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target" className="font-semibold text-ink">
                    Objectif ({CURRENCY})
                  </Label>
                  <Input
                    id="target"
                    inputMode="numeric"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder="500000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Vous pourrez ajuster l’objectif plus tard si nécessaire.
                  </p>
                </div>
              </div>
            </section>

            <section className="mc-panel p-5 sm:p-7">
              <StepHeading
                number="02"
                title="Durée & frais"
                description="Choisissez une durée simple. La période commence au moment de l’activation."
                icon={WalletCards}
              />

              {billing?.freeEligible ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setUseFree(true);
                    setDurationDays(FREE_DURATION_DAYS);
                  }}
                  className={cn(
                    "relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all",
                    useFree
                      ? "border-primary bg-[linear-gradient(135deg,rgb(244_184_41_/_14%),rgb(255_255_255_/_88%))] shadow-[0_14px_35px_-28px_rgb(218_152_16_/_90%)]"
                      : "border-border bg-white/70 hover:border-primary/40"
                  )}
                >
                  {useFree ? (
                    <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-primary text-ink">
                      <Check className="size-4" />
                    </span>
                  ) : null}
                  <p className="font-bold text-ink">Première cotisation offerte</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {FREE_DURATION_DAYS} jours · 0 {CURRENCY}
                  </p>
                </button>
              ) : billing ? (
                <p className="rounded-2xl bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">
                  L’offre gratuite liée à ce numéro a déjà été utilisée.
                </p>
              ) : (
                <p
                  className="text-sm text-muted-foreground"
                  role={billingError ? "alert" : undefined}
                >
                  {billingError
                    ? "Les offres sont momentanément indisponibles. Actualisez la page."
                    : "Chargement des offres…"}
                </p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(billing?.presets ?? DURATION_PRESETS).map((preset) => {
                  const selected = !useFree && durationDays === preset.days;
                  return (
                    <button
                      key={preset.days}
                      type="button"
                      disabled={!billing || loading}
                      aria-pressed={selected}
                      onClick={() => {
                        setUseFree(false);
                        setDurationDays(preset.days);
                      }}
                      className={cn(
                        "relative rounded-2xl border p-4 text-left transition-all disabled:cursor-wait disabled:opacity-50",
                        selected
                          ? "border-primary bg-accent shadow-[0_12px_30px_-26px_rgb(218_152_16_/_90%)]"
                          : "border-border bg-white/70 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-white"
                      )}
                    >
                      <p className="text-base font-bold text-ink">
                        {preset.days} jours
                      </p>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {formatAmount(preset.fee)}
                      </p>
                      {selected ? (
                        <span className="absolute right-3 top-3 size-2 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {quote ? (
                <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-ink p-4 text-white">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                      Total à l’activation
                    </p>
                    <p className="mt-1 text-sm text-white/65">{quote.label}</p>
                  </div>
                  <p className="text-xl font-extrabold tracking-[-0.03em] text-gold-bright">
                    {quote.fee === 0 ? "Gratuit" : formatAmount(quote.fee)}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="mc-panel p-5 sm:p-7">
              <StepHeading
                number="03"
                title="Ce que voient les participants"
                description="Gardez la page simple ou rendez-la plus transparente selon votre groupe."
                icon={Eye}
              />
              <CotisationSettingsFields value={settings} onChange={setSettings} />
            </section>

            <div className="sticky bottom-[5.5rem] z-20 rounded-[1.35rem] border border-border/80 bg-white/90 p-3 shadow-[0_20px_55px_-28px_rgb(20_50_104_/_45%)] backdrop-blur-xl md:bottom-5">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={
                  loading || !quote || !submission.ready || hasWave !== true
                }
              >
                {loading
                  ? "Création en cours…"
                  : quote?.isFree
                    ? "Créer gratuitement"
                    : quote
                      ? `Continuer · ${formatAmount(quote.fee)}`
                      : "Créer la cotisation"}
              </Button>
              {hasWave !== true ? (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Configurez d’abord la réception des contributions.
                </p>
              ) : (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Vous pourrez relire et partager la cotisation après création.
                </p>
              )}
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
