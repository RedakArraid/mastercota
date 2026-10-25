"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, LockKeyhole, Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount } from "@/lib/format";

type EnrollResult = {
  owner?: boolean;
  payment_required?: boolean;
  amount_due?: number;
  currency?: string;
  enrollment?: { id: string; status: string };
  payout?: {
    mode?: "business" | "phone" | null;
    wave_phone?: string | null;
    wave_pay_link?: string | null;
    instructor_name?: string | null;
  };
};

export function CourseEnrollCard({
  courseId,
  accessType,
  price,
}: {
  courseId: string;
  accessType: "free" | "paid" | "invite";
  price: number;
}) {
  const [coupon, setCoupon] = useState("");
  const [invite, setInvite] = useState("");
  const [result, setResult] = useState<EnrollResult | null>(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);

  async function enroll() {
    setLoading(true);
    try {
      const data = await api<EnrollResult>(`/api/academy/courses/${courseId}/enroll`, {
        method: "POST",
        body: JSON.stringify({
          ...(coupon.trim() ? { coupon_code: coupon.trim() } : {}),
          ...(invite.trim() ? { invite_code: invite.trim() } : {}),
        }),
      });
      setResult(data);
      if (!data.payment_required) toast.success(data.owner ? "Vous êtes l’instructeur de ce cours." : "Accès au cours activé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  }

  async function reportPayment() {
    if (!result?.enrollment?.id) return;
    setLoading(true);
    try {
      await api(`/api/academy/enrollments/${result.enrollment.id}/payment-report`, {
        method: "POST",
        body: JSON.stringify({ reference: reference.trim() || null, note: note.trim() || null }),
      });
      setReported(true);
      toast.success("Paiement signalé à l’instructeur");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Signalement impossible");
    } finally {
      setLoading(false);
    }
  }

  if (result?.owner) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">Vous êtes l’instructeur de ce cours.</p>
        <Button asChild className="w-full"><Link href={`/teach/${courseId}`}>Gérer ce cours</Link></Button>
      </div>
    );
  }

  if (result?.enrollment && !result.payment_required && result.enrollment.status !== "pending") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mb-2 size-5" />
          Votre accès est actif.
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href={`/learn/${courseId}`}>Ouvrir le cours</Link>
        </Button>
      </div>
    );
  }

  if (reported) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <CheckCircle2 className="size-6 text-amber-700" />
        <p className="mt-3 font-bold text-ink">Paiement signalé</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          L’instructeur doit vérifier la réception avant l’activation du cours. Vous retrouverez l’état dans « Mes cours ».
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href="/learn">Voir mes cours</Link>
        </Button>
      </div>
    );
  }

  if (result?.payment_required && result.enrollment) {
    const payout = result.payout;
    return (
      <div className="space-y-5">
        <div className="rounded-2xl bg-ink p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/50">Montant à envoyer</p>
          <p className="mt-1 text-2xl font-extrabold text-gold-bright">{formatAmount(Number(result.amount_due || 0))}</p>
          <p className="mt-2 text-xs leading-5 text-white/60">Le paiement va directement à l’instructeur. Mastercota n’encaisse pas ce montant.</p>
        </div>

        {payout?.wave_pay_link ? (
          <Button asChild size="lg" className="w-full">
            <a href={payout.wave_pay_link} target="_blank" rel="noreferrer">
              <Wallet className="size-4" />
              Ouvrir le paiement
            </a>
          </Button>
        ) : payout?.wave_phone ? (
          <div className="rounded-2xl border border-border bg-secondary/50 p-4">
            <p className="text-xs font-semibold text-muted-foreground">Envoyez à</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-extrabold text-ink">{payout.wave_phone}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(payout.wave_phone || "");
                  toast.success("Numéro copié");
                }}
              >
                <Copy className="size-3.5" />
                Copier
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 border-t border-border pt-4">
          <div>
            <Label htmlFor="payment-reference">Référence du transfert (facultatif)</Label>
            <Input id="payment-reference" value={reference} onChange={event => setReference(event.target.value)} placeholder="Ex. référence Wave" />
          </div>
          <div>
            <Label htmlFor="payment-note">Note (facultatif)</Label>
            <Textarea id="payment-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Information utile pour l’instructeur" />
          </div>
          <Button className="w-full" onClick={reportPayment} disabled={loading}>
            <Send className="size-4" />
            {loading ? "Envoi…" : "J’ai effectué le paiement"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accessType === "invite" ? (
        <div className="space-y-2">
          <Label htmlFor="invite-code">Code d’invitation</Label>
          <Input id="invite-code" value={invite} onChange={event => setInvite(event.target.value)} placeholder="Votre code privé" />
        </div>
      ) : null}
      {accessType === "paid" ? (
        <div className="space-y-2">
          <Label htmlFor="coupon-code">Coupon (facultatif)</Label>
          <Input id="coupon-code" value={coupon} onChange={event => setCoupon(event.target.value)} placeholder="Ex. BIENVENUE20" />
        </div>
      ) : null}

      <Button size="lg" className="w-full" onClick={enroll} disabled={loading || (accessType === "invite" && !invite.trim())}>
        {accessType === "invite" ? <LockKeyhole className="size-4" /> : <Wallet className="size-4" />}
        {loading
          ? "Vérification…"
          : accessType === "free"
            ? "S’inscrire gratuitement"
            : accessType === "invite"
              ? "Utiliser mon invitation"
              : `Accéder au cours · ${formatAmount(price)}`}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Votre progression, vos quiz et votre certificat seront liés à votre compte Mastercota.
      </p>
    </div>
  );
}
