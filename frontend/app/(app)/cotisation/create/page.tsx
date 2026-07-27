"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { api } from "@/lib/api";
import { CURRENCY } from "@/lib/constants";
import {
  DURATION_PRESETS,
  FREE_DURATION_DAYS,
  quoteDuration,
} from "@/lib/fees";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Cotisation } from "@/lib/types";

type BillingInfo = {
  freeEligible: boolean;
  freeDurationDays: number;
  maxDurationDays: number;
  presets: { days: number; fee: number; label: string }[];
  extension: { days: number; fee: number };
};

export default function CreateCotisationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [settings, setSettings] = useState<SettingsFormValue>(
    defaultSettingsForm()
  );
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [useFree, setUseFree] = useState(true);
  const [durationDays, setDurationDays] = useState(35);
  const [loading, setLoading] = useState(false);
  const [hasWave, setHasWave] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ user: { wave_phone?: string | null } }>("/api/profile")
      .then((p) => setHasWave(Boolean(p.user?.wave_phone)))
      .catch(() => setHasWave(null));
    api<BillingInfo>("/api/cotisations/billing-info")
      .then((info) => {
        setBilling(info);
        if (info.freeEligible) {
          setUseFree(true);
          setDurationDays(info.freeDurationDays);
        } else {
          setUseFree(false);
          setDurationDays(15);
        }
      })
      .catch(() => setBilling(null));
  }, []);

  const quote = useMemo(() => {
    if (!billing) return null;
    return quoteDuration({
      durationDays,
      freeEligible: billing.freeEligible,
      useFree: useFree && billing.freeEligible,
    });
  }, [billing, durationDays, useFree]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetAmount = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!title.trim() || !targetAmount || !quote) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
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
          title: title.trim(),
          description: description.trim() || null,
          target_amount: targetAmount,
          duration_days: quote.durationDays,
          use_free: quote.isFree,
          settings: settingsToPayload(settings),
        }),
      });
      if (data.payment_required && data.authorization_url) {
        toast.message(
          `Paiement des frais : ${formatAmount(data.fee ?? quote.fee)}`
        );
        window.location.href = data.authorization_url;
        return;
      }
      toast.success(
        quote.isFree
          ? "Cotisation gratuite créée (35 jours)"
          : "Cotisation créée"
      );
      router.push(`/cotisation/${data.cotisation.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Nouvelle caisse
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">
          Créer une cotisation
        </h1>
        <p className="mt-2 text-muted-foreground">
          0 % sur les contributions. Vous payez uniquement les frais de
          durée Mastercota (1re gratuite).
        </p>
      </div>

      {hasWave === false ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-ink">Configurez votre numéro Wave</p>
          <p className="mt-1 text-muted-foreground">
            Sans numéro Wave, les contributeurs ne pourront pas vous envoyer
            l&apos;argent en direct.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/profile/payout">Ajouter mon Wave</Link>
          </Button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-ink">Informations</h2>
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Mariage de Aya"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Expliquez le but de la cotisation…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Objectif ({CURRENCY})</Label>
            <Input
              id="target"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="500000"
              required
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">Durée & frais</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Max 60 jours. Prolongation possible plus tard (+10 j / 2&nbsp;000&nbsp;F).
            </p>
          </div>

          {billing?.freeEligible ? (
            <button
              type="button"
              onClick={() => {
                setUseFree(true);
                setDurationDays(FREE_DURATION_DAYS);
              }}
              className={cn(
                "w-full rounded-2xl border px-4 py-4 text-left transition",
                useFree
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/40"
              )}
            >
              <p className="font-semibold text-ink">1re cotisation gratuite</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {FREE_DURATION_DAYS} jours · 0 {CURRENCY} · liée à votre numéro
              </p>
            </button>
          ) : (
            <p className="rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
              Votre cotisation gratuite a déjà été utilisée sur ce numéro.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {(billing?.presets ?? DURATION_PRESETS).map((p) => {
              const selected = !useFree && durationDays === p.days;
              return (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => {
                    setUseFree(false);
                    setDurationDays(p.days);
                  }}
                  className={cn(
                    "rounded-2xl border px-3 py-4 text-left transition",
                    selected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <p className="font-semibold text-ink">{p.days} jours</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatAmount(p.fee)}
                  </p>
                </button>
              );
            })}
          </div>

          {quote ? (
            <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Offre</span>
                <span className="font-medium text-foreground">{quote.label}</span>
              </div>
              <div className="mt-1 flex justify-between font-semibold">
                <span>À régler</span>
                <span>
                  {quote.fee === 0 ? "Gratuit" : formatAmount(quote.fee)}
                </span>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold text-ink">Page publique</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Contrôlez ce que voient les personnes qui contribuent via votre lien.
          </p>
          <CotisationSettingsFields value={settings} onChange={setSettings} />
        </section>

        <Button type="submit" size="lg" className="w-full" disabled={loading || !quote}>
          {loading
            ? "…"
            : quote?.isFree
              ? "Créer gratuitement"
              : quote
                ? `Continuer · ${formatAmount(quote.fee)}`
                : "Créer la cotisation"}
        </Button>
      </form>
    </div>
  );
}
