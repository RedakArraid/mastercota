"use client";

import { useEffect, useState } from "react";
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
import type { Cotisation, UserProfile } from "@/lib/types";

export default function CreateCotisationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [settings, setSettings] = useState<SettingsFormValue>(
    defaultSettingsForm()
  );
  const [loading, setLoading] = useState(false);
  const [hasPayout, setHasPayout] = useState<boolean | null>(null);

  useEffect(() => {
    api<{ user: UserProfile }>("/api/profile")
      .then((p) => setHasPayout(Boolean(p.user?.paystack_subaccount_id)))
      .catch(() => setHasPayout(null));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetAmount = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!title.trim() || !targetAmount || !deadline) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ cotisation: Cotisation }>("/api/cotisations", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          target_amount: targetAmount,
          deadline,
          settings: settingsToPayload(settings),
        }),
      });
      toast.success("Cotisation créée");
      router.push(`/cotisation/${data.cotisation.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
      setLoading(false);
    }
  }

  const minDate = new Date().toISOString().slice(0, 10);

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
          Définissez l&apos;objectif, la date limite et ce que vos contributeurs
          verront.
        </p>
      </div>

      {hasPayout === false ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-ink">
            Configurez votre compte de versement
          </p>
          <p className="mt-1 text-muted-foreground">
            Sans compte de retrait, les contributions restent sur la plateforme
            jusqu&apos;à configuration.
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link href="/profile/payout">Configurer le retrait</Link>
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
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="deadline">Date limite</Label>
              <Input
                id="deadline"
                type="date"
                min={minDate}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold text-ink">
            Page publique
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Contrôlez ce que voient les personnes qui contribuent via votre
            lien.
          </p>
          <CotisationSettingsFields value={settings} onChange={setSettings} />
        </section>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Création…" : "Créer la cotisation"}
        </Button>
      </form>
    </div>
  );
}
