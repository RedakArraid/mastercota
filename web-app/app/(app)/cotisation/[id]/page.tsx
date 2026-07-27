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
import { createClient } from "@/lib/supabase/client";
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
    const supabase = createClient();
    const [{ data: cot }, { data: contribs }] = await Promise.all([
      supabase.from("cotisations").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("contributions")
        .select("*")
        .eq("cotisation_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setCotisation((cot as Cotisation) ?? null);
    setContributions((contribs as Contribution[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`cotisation-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cotisations", filter: `id=eq.${id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contributions",
          filter: `cotisation_id=eq.${id}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  if (loading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if (!cotisation) {
    return <p className="text-destructive">Cotisation introuvable</p>;
  }

  const pct = progressPercent(
    cotisation.current_amount,
    cotisation.target_amount
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
        text: cotisation!.settings?.share_message ?? cotisation!.title,
        url: publicUrl,
      });
    } else {
      await copyLink();
    }
  }

  async function closeCotisation() {
    const supabase = createClient();
    const { error } = await supabase
      .from("cotisations")
      .update({ status: "closed" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cotisation clôturée");
    load();
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
      const supabase = createClient();
      const phone = mPhone.startsWith("+")
        ? mPhone
        : `${DEFAULT_COUNTRY_CODE}${mPhone.replace(/\D/g, "")}`;
      const { error } = await supabase.from("contributions").insert({
        cotisation_id: id,
        contributor_name: mName.trim(),
        contributor_phone: phone,
        amount,
        status: "paid",
        payment_method: "manual",
      });
      if (error) throw error;
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
      <div className="flex flex-wrap items-start justify-between gap-4">
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
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <Progress value={pct} className="mb-4 h-3" />
        <div className="flex flex-wrap justify-between gap-3 text-sm">
          <div>
            <p className="text-2xl font-bold">
              {formatAmount(cotisation.current_amount)}
            </p>
            <p className="text-muted-foreground">
              sur {formatAmount(cotisation.target_amount)}
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
          <p className="text-sm text-muted-foreground">Aucune contribution pour l&apos;instant.</p>
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
                <p className="font-semibold">{formatAmount(c.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
