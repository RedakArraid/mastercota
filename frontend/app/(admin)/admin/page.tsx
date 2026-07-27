"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format";

type Stats = {
  users: number;
  cotisations: number;
  cotisationsActive: number;
  contributions: number;
  contributionsPaid: number;
  contributionsPending: number;
  volumePaid: number;
  otpLast24h: number;
};

type Recent = {
  id: string;
  contributor_name: string;
  amount: string | number;
  status: string;
  created_at: string;
  cotisation_title: string;
  slug: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ stats: Stats; recentContributions: Recent[] }>("/api/admin/stats")
      .then((d) => {
        setStats(d.stats);
        setRecent(d.recentContributions);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!stats) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const cards = [
    { label: "Utilisateurs", value: String(stats.users) },
    {
      label: "Cotisations",
      value: `${stats.cotisationsActive} actives / ${stats.cotisations}`,
    },
    {
      label: "Contributions payées",
      value: `${stats.contributionsPaid} / ${stats.contributions}`,
    },
    {
      label: "Volume encaissé",
      value: formatAmount(Number(stats.volumePaid)),
    },
    { label: "OTP (24 h)", value: String(stats.otpLast24h) },
    {
      label: "En attente",
      value: String(stats.contributionsPending),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Activité</h2>
        <p className="text-sm text-muted-foreground">
          Vue d’ensemble de la plateforme Mastercota.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Dernières contributions</h3>
          <Link
            href="/admin/contributions"
            className="text-sm text-zinc-600 underline-offset-4 hover:underline"
          >
            Tout voir
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Contributeur</th>
                <th className="px-3 py-2 font-medium">Cotisation</th>
                <th className="px-3 py-2 font-medium">Montant</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{row.contributor_name}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`https://mastercota.com/c/${row.slug}`}
                      className="underline-offset-2 hover:underline"
                      target="_blank"
                    >
                      {row.cotisation_title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {formatAmount(Number(row.amount))}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(row.created_at).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    Aucune contribution pour l’instant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
