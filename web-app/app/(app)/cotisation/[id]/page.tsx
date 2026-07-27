"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Share2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants";
import { formatAmount, progressPercent, daysRemaining } from "@/lib/format";
import type { Cotisation, Contribution } from "@/lib/types";

export default function CotisationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cotisation, setCotisation] = useState<Cotisation | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState("");
  const [mPhone, setMPhone] = useState("");
  const [mAmount, setMAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, contrib] = await Promise.all([
        api<{ cotisation: Cotisation }>(`/api/cotisations/${id}`),
        api<{ contributions: Contribution[] }>(
          `/api/cotisations/${id}/contributions`
        ),
      ]);
      setCotisation(c.cotisation);
      setContributions(contrib.contributions);
    } catch {
      setCotisation(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return <p className="text-muted-foreground">Chargement…</p>;
  if (!cotisation) {
    return <p className="text-destructive">Cotisation introuvable</p>;
  }

  const pct = progressPercent(
    Number(cotisation.current_amount),
    Number(cotisation.target_amount)
  );
  const days = daysRemaining(cotisation.deadline);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${cotisation.slug}`
      : `https://mastercota.com/c/${cotisation.slug}`;

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Lien copié");
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({
        title: cotisation!.title,
        url: publicUrl,
      });
    } else {
      await copyLink();
    }
  }

  async function closeCotisation() {
    try {
      await api(`/api/cotisations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "closed" }),
      });
      toast.success("Cotisation clôturée");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(mAmount.replace(/\s/g, "").replace(",", "."));
    if (!mName.trim() || !amount) {
      toast.error("Nom et montant requis");
      return;
    }
    setSaving(true);
    try {
      const phone = mPhone.startsWith("+")
        ? mPhone
        : `${DEFAULT_COUNTRY_CODE}${mPhone.replace(/\D/g, "")}`;
      await api(`/api/cotisations/${id}/contributions`, {
        method: "POST",
        body: JSON.stringify({
          contributor_name: mName.trim(),
          contributor_phone: phone,
          amount,
        }),
      });
      toast.success("Contribution ajoutée");
      setManualOpen(false);
      setMName("");
      setMPhone("");
      setMAmount("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Button variant="ghost" className="-ml-3 mb-2" onClick={() => router.push("/home")}>
          ← Retour
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-extrabold text-ink">{cotisation.title}</h1>
          <Badge>{cotisation.status}</Badge>
        </div>
        {cotisation.description ? (
          <p className="mt-2 text-muted-foreground">{cotisation.description}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <Progress value={pct} className="mb-4 h-3" />
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <div>
            <p className="text-2xl font-bold">
              {formatAmount(Number(cotisation.current_amount))}
            </p>
            <p className="text-muted-foreground">
              sur {formatAmount(Number(cotisation.target_amount))}
            </p>
          </div>
          <p className="text-muted-foreground">
            {days >= 0 ? `${days} jours restants` : "Échéance dépassée"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={shareLink}>
          <Share2 className="size-4" />
          Partager
        </Button>
        <Button variant="secondary" onClick={copyLink}>
          <Copy className="size-4" />
          Copier le lien
        </Button>
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Contribution manuelle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une contribution</DialogTitle>
            </DialogHeader>
            <form onSubmit={addManual} className="space-y-4">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={mName} onChange={(e) => setMName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={mPhone} onChange={(e) => setMPhone(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Montant</Label>
                <Input value={mAmount} onChange={(e) => setMAmount(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        {cotisation.status === "active" ? (
          <Button variant="destructive" onClick={closeCotisation}>
            <Lock className="size-4" />
            Clôturer
          </Button>
        ) : null}
      </div>

      <p className="rounded-xl bg-secondary px-4 py-3 text-sm break-all text-muted-foreground">
        {publicUrl}
      </p>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Contributions</h2>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune contribution.</p>
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
                    {c.status} · {c.payment_method ?? "paystack"}
                  </p>
                </div>
                <p className="font-semibold">{formatAmount(Number(c.amount))}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
