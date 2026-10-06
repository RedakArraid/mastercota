"use client";

import { useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Payment = {
  id: string;
  cotisation_id: string | null;
  title: string | null;
  slug: string | null;
  user_phone: string;
  user_name: string | null;
  purpose: "create" | "extend";
  amount: number | string;
  status: "pending" | "paid" | "failed";
  application_status: "pending" | "applied" | "review_required";
  review_reason: string | null;
  review_resolved_at: string | null;
  review_resolved_by: string | null;
  review_resolution_note: string | null;
  paystack_reference: string;
  created_at: string;
  paid_at: string | null;
};

const FILTERS = [
  { value: "review_required", label: "À examiner" },
  { value: "review_resolved", label: "Examinés" },
  { value: "pending", label: "En attente" },
  { value: "applied", label: "Appliqués" },
  { value: "all", label: "Tous" },
];

const REASONS: Record<string, string> = {
  duplicate_service: "Un autre paiement a déjà activé ce service.",
  extension_expired: "Le paiement est arrivé après la fin de la prolongation possible.",
  extension_unavailable: "La prolongation ne peut plus être appliquée à cette cotisation.",
  extension_dates_changed: "Les dates de la cotisation ont changé depuis l’ouverture du paiement.",
  cotisation_missing: "La cotisation liée à ce paiement n’est plus disponible.",
  invalid_duration: "La durée de création associée au paiement doit être vérifiée.",
  creation_not_pending: "La cotisation n’attend plus ce paiement de création.",
  creation_not_paid: "Les frais de création doivent être vérifiés avant toute prolongation.",
};

export default function AdminPlatformPaymentsPage() {
  const [filter, setFilter] = useState("review_required");
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setRows([]);
    const search = filter ? `?application_status=${encodeURIComponent(filter)}` : "";
    api<{ payments: Payment[] }>(`/api/admin/platform-payments${search}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then(data => { if (!controller.signal.aborted) setRows(data.payments); })
      .catch(e => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Chargement impossible");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filter, refresh]);

  async function copyReference(reference: string) {
    try {
      await navigator.clipboard.writeText(reference);
      toast.success("Référence copiée");
    } catch {
      toast.error("Copie impossible. Sélectionnez la référence pour la copier.");
    }
  }

  async function resolveReview(payment: Payment, event: React.FormEvent) {
    event.preventDefault();
    if (resolvingId) return;
    const note = (notes[payment.id] ?? "").trim();
    if (!note) { toast.error("Indiquez la conclusion de l’examen pour l’organisateur."); return; }
    setResolvingId(payment.id);
    try {
      const result = await api<{ payment: Payment; already_resolved: boolean }>(`/api/admin/platform-payments/${payment.id}/resolve-review`, {
        method: "POST", body: JSON.stringify({ note }),
      });
      setRows(current => current.flatMap(row => row.id !== payment.id ? [row] : filter === "review_required" ? [] : [{ ...row, ...result.payment }]));
      setNotes(current => { const next = { ...current }; delete next[payment.id]; return next; });
      toast.success(result.already_resolved ? "Cet examen avait déjà été clôturé." : "Examen clôturé. Aucun remboursement n’a été déclenché.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Clôture impossible");
    } finally { setResolvingId(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Frais Mastercota</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Paiements de création et de prolongation. Un paiement « À examiner » a été reçu,
            mais le service n’a pas été appliqué. Vérifiez sa référence dans Paystack et
            traitez le remboursement éventuel auprès du prestataire.
          </p>
        </div>
        <Button variant="outline" disabled={loading || !!resolvingId} onClick={() => setRefresh(value => value + 1)}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filtrer les frais">
        {FILTERS.map(item => (
          <Button key={item.value} size="sm" variant={filter === item.value ? "default" : "outline"}
            aria-pressed={filter === item.value} disabled={!!resolvingId} onClick={() => setFilter(item.value)}>
            {item.label}
          </Button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Chargement des frais…</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">
          {filter === "review_required" ? "Aucun paiement à examiner." : "Aucun paiement pour ce filtre."}
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map(payment => (
          <article key={payment.id} className="min-w-0 space-y-4 rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words font-semibold">{payment.title || "Cotisation indisponible"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {payment.purpose === "extend" ? "Prolongation" : "Création"} · {formatAmount(Number(payment.amount))}
                </p>
              </div>
              <Badge variant={payment.application_status === "review_required" && !payment.review_resolved_at ? "destructive" : "secondary"}>
                {payment.review_resolved_at ? "Examiné" : payment.application_status === "review_required" ? "À examiner"
                  : payment.application_status === "applied" ? "Service appliqué"
                    : payment.status === "failed" ? "Échoué" : "En attente"}
              </Badge>
            </div>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Organisateur</dt><dd className="break-words">{payment.user_name || "Sans nom"} · {payment.user_phone}</dd></div>
              <div><dt className="text-muted-foreground">Paiement</dt><dd>{payment.status === "paid" ? "Reçu" : payment.status === "failed" ? "Échoué" : "Non confirmé"}</dd></div>
              <div><dt className="text-muted-foreground">{payment.paid_at ? "Reçu le" : "Créé le"}</dt><dd>{new Date(payment.paid_at || payment.created_at).toLocaleString("fr-FR")}</dd></div>
              <div><dt className="text-muted-foreground">Référence Paystack</dt><dd className="break-all font-mono text-xs">{payment.paystack_reference}</dd></div>
            </dl>
            {payment.application_status === "review_required" && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                {REASONS[payment.review_reason || ""] || "Ce paiement nécessite une vérification avant de régler la demande de l’organisateur."}
              </p>
            )}
            {payment.review_resolved_at ? (
              <div className="space-y-2 rounded-xl bg-secondary/50 p-3 text-sm">
                <p className="font-medium">Examen clôturé le {new Date(payment.review_resolved_at).toLocaleString("fr-FR")}</p>
                <p className="whitespace-pre-wrap break-words">{payment.review_resolution_note}</p>
                <p className="text-muted-foreground">Cette clôture enregistre l’examen effectué. Aucun remboursement n’est déclenché par cette action ; le service reste non appliqué pour ce paiement.</p>
              </div>
            ) : payment.application_status === "review_required" && payment.status === "paid" ? (
              <form onSubmit={event => resolveReview(payment, event)} className="space-y-3 border-t pt-4">
                <Label htmlFor={`review-note-${payment.id}`}>Conclusion de l’examen</Label>
                <Textarea id={`review-note-${payment.id}`} required maxLength={2000} rows={3}
                  value={notes[payment.id] ?? ""} disabled={!!resolvingId}
                  onChange={event => setNotes(current => ({ ...current, [payment.id]: event.target.value }))}
                  placeholder="Décision prise et instructions pour l’organisateur" />
                <p className="text-xs text-muted-foreground">Cette note est visible par l’organisateur. Clôturer enregistre l’examen effectué ; aucun remboursement n’est déclenché. Traitez toute opération financière auprès du prestataire avant de consigner sa conclusion.</p>
                <Button type="submit" size="sm" disabled={!!resolvingId || !(notes[payment.id] ?? "").trim()}>
                  {resolvingId === payment.id ? "Enregistrement…" : "Clôturer l’examen"}
                </Button>
              </form>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => copyReference(payment.paystack_reference)}>
              <Copy className="mr-2 h-4 w-4" /> Copier la référence
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
