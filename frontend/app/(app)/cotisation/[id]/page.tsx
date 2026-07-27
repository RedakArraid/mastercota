"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Share2, Lock, Pencil, Save } from "lucide-react";
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
import { api } from "@/lib/api";
import { APP_URL, CURRENCY } from "@/lib/constants";
import {
  buildE164,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  isValidNational,
} from "@/lib/countries";
import { formatAmount, progressPercent, daysRemaining } from "@/lib/format";
import { paymentMethodLabel, statusLabel } from "@/lib/labels";
import type { Cotisation, Contribution } from "@/lib/types";

export default function CotisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cotisation, setCotisation] = useState<Cotisation | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const load = useCallback(async () => {
    try {
      const [c, contrib] = await Promise.all([
        api<{ cotisation: Cotisation }>(`/api/cotisations/${id}`),
        api<{ contributions: Contribution[] }>(
          `/api/cotisations/${id}/contributions`
        ),
      ]);
      setCotisation(c.cotisation);
      setContributions(contrib.contributions ?? []);
      setTitle(c.cotisation.title);
      setDescription(c.cotisation.description ?? "");
      setTarget(String(c.cotisation.target_amount));
      setDeadline(String(c.cotisation.deadline).slice(0, 10));
      setSettings(settingsFromCotisation(c.cotisation.settings));
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
    setSaving(true);
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            target_amount: Number(target.replace(/\s/g, "").replace(",", ".")),
            deadline,
          }),
        }
      );
      setCotisation(data.cotisation);
      toast.success("Informations enregistrées");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ settings: settingsToPayload(settings) }),
        }
      );
      setCotisation(data.cotisation);
      toast.success("Réglages enregistrés");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function closeCotisation() {
    if (!confirm("Clôturer cette cotisation ? Les contributions seront fermées."))
      return;
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "closed" }),
        }
      );
      setCotisation(data.cotisation);
      toast.success("Cotisation clôturée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function reopenCotisation() {
    try {
      const data = await api<{ cotisation: Cotisation }>(
        `/api/cotisations/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        }
      );
      setCotisation(data.cotisation);
      toast.success("Cotisation réouverte");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
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
    const amount = Number(mAmount.replace(/\s/g, "").replace(",", "."));
    if (!mName.trim() || !amount) {
      toast.error("Nom et montant requis");
      return;
    }
    const country = getCountryByIso(mCountryIso);
    if (!isValidNational(country, mPhone)) {
      toast.error(
        `Numéro invalide — ${country.nationalLength} chiffres (${country.name})`
      );
      return;
    }
    setMSaving(true);
    try {
      await api(`/api/cotisations/${id}/contributions`, {
        method: "POST",
        body: JSON.stringify({
          contributor_name: mName.trim(),
          contributor_phone: buildE164(country, mPhone),
          amount,
        }),
      });
      toast.success("Contribution ajoutée");
      setManualOpen(false);
      setMName("");
      setMPhone("");
      setMCountryIso(DEFAULT_COUNTRY_ISO);
      setMAmount("");
      load();
    } catch (err) {
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
  const days = daysRemaining(cotisation.deadline);
  const showBest =
    cotisation.settings?.show_best_contributor !== false && best;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Button
          variant="ghost"
          className="-ml-3 mb-2"
          onClick={() => router.push("/home")}
        >
          ← Retour
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-extrabold text-ink">{cotisation.title}</h1>
          <Badge variant="secondary">{statusLabel(cotisation.status)}</Badge>
        </div>
        {cotisation.description ? (
          <p className="mt-2 text-muted-foreground">{cotisation.description}</p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          {days >= 0
            ? `${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`
            : "Échéance dépassée"}
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-semibold">
            {formatAmount(Number(cotisation.current_amount))}
          </span>
          <span className="text-muted-foreground">
            objectif {formatAmount(Number(cotisation.target_amount))}
          </span>
        </div>
        <Progress value={pct} className="h-3" />
        <p className="mt-2 text-xs text-muted-foreground">{pct.toFixed(0)} %</p>
        {showBest ? (
          <p className="mt-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm">
            Meilleur contributeur :{" "}
            <span className="font-semibold">{best.contributor_name}</span> —{" "}
            {formatAmount(Number(best.amount))}
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={share}>
          <Share2 className="size-4" />
          Partager
        </Button>
        <Button variant="secondary" onClick={copyLink}>
          <Copy className="size-4" />
          Copier le lien
        </Button>
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Pencil className="size-4" />
              Contribution manuelle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une contribution</DialogTitle>
            </DialogHeader>
            <form onSubmit={addManual} className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
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
                <Label>Montant ({CURRENCY})</Label>
                <Input
                  value={mAmount}
                  onChange={(e) => setMAmount(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={mSaving}>
                {mSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        {cotisation.status === "active" ? (
          <Button variant="destructive" onClick={closeCotisation}>
            <Lock className="size-4" />
            Clôturer
          </Button>
        ) : (
          <Button variant="secondary" onClick={reopenCotisation}>
            Réouvrir
          </Button>
        )}
      </div>

      <p className="rounded-xl bg-secondary px-4 py-3 text-sm break-all text-muted-foreground">
        {publicUrl}
      </p>

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
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {contributions.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{c.contributor_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {statusLabel(c.status)} ·{" "}
                      {paymentMethodLabel(c.payment_method)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatAmount(Number(c.amount))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <form
            onSubmit={saveInfo}
            className="space-y-4 rounded-2xl border border-border bg-card p-5"
          >
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Objectif ({CURRENCY})</Label>
                <Input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Date limite</Label>
                <Input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="size-4" />
              {saving ? "…" : "Enregistrer"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <form
            onSubmit={saveSettings}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <CotisationSettingsFields
              value={settings}
              onChange={setSettings}
            />
            <Button type="submit" className="mt-4" disabled={saving}>
              <Save className="size-4" />
              {saving ? "…" : "Enregistrer les réglages"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
