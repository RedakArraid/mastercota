"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  contributor_name: string;
  contributor_phone: string;
  amount: string | number;
  status: string;
  payment_method: string | null;
  paystack_reference: string | null;
  created_at: string;
  cotisation_title: string;
  slug: string;
};

export default function AdminContributionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load(filter = status) {
    try {
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const data = await api<{ contributions: Row[] }>(
        `/api/admin/contributions${qs}`
      );
      setRows(data.contributions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Contributions</h2>
        <p className="text-sm text-muted-foreground">
          Paiements et contributions manuelles.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["", "paid", "pending", "failed"].map((s) => (
          <Button
            key={s || "all"}
            size="sm"
            variant={status === s ? "default" : "outline"}
            onClick={() => {
              setStatus(s);
              load(s);
            }}
          >
            {s || "Toutes"}
          </Button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-3 py-2">Contributeur</th>
              <th className="px-3 py-2">Cotisation</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Réf.</th>
              <th className="px-3 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <div>{r.contributor_name}</div>
                  <div className="font-mono text-xs text-zinc-500">
                    {r.contributor_phone}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Link
                    href={`https://mastercota.com/c/${r.slug}`}
                    target="_blank"
                    className="underline-offset-2 hover:underline"
                  >
                    {r.cotisation_title}
                  </Link>
                </td>
                <td className="px-3 py-2">{formatAmount(Number(r.amount))}</td>
                <td className="px-3 py-2">
                  <Badge variant="secondary">{r.status}</Badge>
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {r.paystack_reference || r.payment_method || "—"}
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {new Date(r.created_at).toLocaleString("fr-FR")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Aucune contribution.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
