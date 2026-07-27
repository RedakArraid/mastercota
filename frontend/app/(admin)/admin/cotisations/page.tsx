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
  slug: string;
  title: string;
  status: string;
  target_amount: string | number;
  current_amount: string | number;
  owner_phone: string;
  owner_name: string | null;
  paid_count: string | number;
  created_at: string;
  deadline: string;
};

export default function AdminCotisationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("");

  async function load(filter = status) {
    try {
      const qs = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const data = await api<{ cotisations: Row[] }>(
        `/api/admin/cotisations${qs}`
      );
      setRows(data.cotisations);
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
        <h2 className="text-2xl font-semibold">Cotisations</h2>
        <p className="text-sm text-muted-foreground">
          Toutes les campagnes de la plateforme.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {["", "active", "closed", "completed"].map((s) => (
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
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2">Organisateur</th>
              <th className="px-3 py-2">Progression</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Échéance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-3 py-2">
                  <Link
                    href={`https://mastercota.com/c/${r.slug}`}
                    target="_blank"
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {r.title}
                  </Link>
                  <div className="text-xs text-zinc-500">{r.paid_count} paiements</div>
                </td>
                <td className="px-3 py-2">
                  <div>{r.owner_name || "—"}</div>
                  <div className="font-mono text-xs text-zinc-500">
                    {r.owner_phone}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {formatAmount(Number(r.current_amount))} /{" "}
                  {formatAmount(Number(r.target_amount))}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary">{r.status}</Badge>
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {new Date(r.deadline).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Aucune cotisation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
