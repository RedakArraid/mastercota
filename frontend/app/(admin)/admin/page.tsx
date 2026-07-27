"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  PiggyBank,
  HandCoins,
  Wallet,
  MessageCircle,
  Clock3,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Stats = {
  users: number;
  usersWeek: number;
  cotisations: number;
  cotisationsActive: number;
  cotisationsClosed: number;
  cotisationsCompleted: number;
  contributions: number;
  contributionsPaid: number;
  contributionsPending: number;
  contributionsFailed: number;
  contributionsWeek: number;
  volumePaid: number;
  volumeWeek: number;
  otpLast24h: number;
};

type Charts = {
  volumeByDay: { day: string; volume: number; count: number }[];
  usersByDay: { day: string; count: number }[];
  contributionStatus: { status: string; count: number; volume: number }[];
  cotisationStatus: { status: string; count: number }[];
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

type TopCotisation = {
  id: string;
  title: string;
  slug: string;
  target_amount: string | number;
  current_amount: string | number;
  status: string;
  progress: string;
};

const STATUS_FR: Record<string, string> = {
  paid: "Payé",
  pending: "En attente",
  failed: "Échoué",
  active: "Active",
  closed: "Clôturée",
  completed: "Atteinte",
};

const PIE_COLORS = ["#da9810", "#143268", "#6b7a95", "#2d6a4f"];

function shortDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className="overflow-hidden border-[#d8e0ec] shadow-sm">
      <CardContent className="relative p-5">
        <div
          className={cn(
            "absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-15",
            accent
          )}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6b7a95]">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-[#143268]">
              {value}
            </p>
            {hint && (
              <p className="mt-1 flex items-center gap-1 text-xs text-[#6b7a95]">
                <TrendingUp className="h-3 w-3 text-[#da9810]" />
                {hint}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-white",
              accent
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [top, setTop] = useState<TopCotisation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{
      stats: Stats;
      charts: Charts;
      recentContributions: Recent[];
      topCotisations: TopCotisation[];
    }>("/api/admin/stats")
      .then((d) => {
        setStats(d.stats);
        setCharts(d.charts);
        setRecent(d.recentContributions);
        setTop(d.topCotisations);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  const volumeData = useMemo(
    () =>
      (charts?.volumeByDay || []).map((r) => ({
        ...r,
        label: shortDay(r.day),
      })),
    [charts]
  );

  const usersData = useMemo(
    () =>
      (charts?.usersByDay || []).map((r) => ({
        ...r,
        label: shortDay(r.day),
      })),
    [charts]
  );

  const pieData = useMemo(
    () =>
      (charts?.contributionStatus || []).map((r) => ({
        name: STATUS_FR[r.status] || r.status,
        value: r.count,
      })),
    [charts]
  );

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats || !charts) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl bg-white/70"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#143268] md:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-[#6b7a95]">
            Activité des cotisations, paiements et connexions OTP.
          </p>
        </div>
        <p className="text-xs text-[#6b7a95]">
          Mis à jour · {new Date().toLocaleString("fr-FR")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Volume encaissé"
          value={formatAmount(stats.volumePaid)}
          hint={`+${formatAmount(stats.volumeWeek)} sur 7 j`}
          icon={Wallet}
          accent="bg-[#da9810]"
        />
        <StatCard
          label="Contributions payées"
          value={String(stats.contributionsPaid)}
          hint={`${stats.contributionsWeek} cette semaine · ${stats.contributionsPending} en attente`}
          icon={HandCoins}
          accent="bg-[#143268]"
        />
        <StatCard
          label="Cotisations actives"
          value={String(stats.cotisationsActive)}
          hint={`${stats.cotisations} au total · ${stats.cotisationsCompleted} atteintes`}
          icon={PiggyBank}
          accent="bg-[#2b4575]"
        />
        <StatCard
          label="Utilisateurs"
          value={String(stats.users)}
          hint={`+${stats.usersWeek} cette semaine`}
          icon={Users}
          accent="bg-[#2d6a4f]"
        />
        <StatCard
          label="OTP (24 h)"
          value={String(stats.otpLast24h)}
          hint="Codes de connexion WhatsApp"
          icon={MessageCircle}
          accent="bg-[#b8731a]"
        />
        <StatCard
          label="Paiements en attente"
          value={String(stats.contributionsPending)}
          hint={
            stats.contributionsFailed
              ? `${stats.contributionsFailed} échoué(s)`
              : "À surveiller"
          }
          icon={Clock3}
          accent="bg-[#6b7a95]"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-[#d8e0ec] shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#143268]">
              Encaissements (14 jours)
            </CardTitle>
            <CardDescription>
              Volume journalier des contributions payées
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#da9810" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#da9810" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7a95", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7a95", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #d8e0ec",
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    formatAmount(Number(value ?? 0)),
                    "Volume",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#da9810"
                  strokeWidth={2.5}
                  fill="url(#volFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#d8e0ec] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#143268]">Statut paiements</CardTitle>
            <CardDescription>Répartition des contributions</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#6b7a95]">
                Pas encore de données
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #d8e0ec",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-[-12px] flex flex-wrap justify-center gap-3 text-xs text-[#6b7a95]">
              {pieData.map((p, i) => (
                <span key={p.name} className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  {p.name} ({p.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="border-[#d8e0ec] shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#143268]">
              Nouveaux utilisateurs
            </CardTitle>
            <CardDescription>Inscriptions quotidiennes · 14 jours</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#6b7a95", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#6b7a95", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #d8e0ec",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="#143268" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#d8e0ec] shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#143268]">Top cotisations</CardTitle>
                <CardDescription>Campagnes actives les plus avancées</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {top.length === 0 && (
              <p className="py-8 text-center text-sm text-[#6b7a95]">
                Aucune cotisation active.
              </p>
            )}
            {top.map((c) => {
              const progress = Math.min(100, Number(c.progress) || 0);
              return (
                <div key={c.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`https://mastercota.com/c/${c.slug}`}
                        target="_blank"
                        className="line-clamp-1 text-sm font-semibold text-[#143268] hover:underline"
                      >
                        {c.title}
                      </Link>
                      <p className="text-xs text-[#6b7a95]">
                        {formatAmount(Number(c.current_amount))} /{" "}
                        {formatAmount(Number(c.target_amount))}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#da9810]">
                      {progress}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#eef2f8]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#da9810] to-[#f4b829]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#d8e0ec] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-[#143268]">
              Dernières contributions
            </CardTitle>
            <CardDescription>Flux récent des paiements</CardDescription>
          </div>
          <Link
            href="/admin/contributions"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#143268] hover:text-[#da9810]"
          >
            Tout voir
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e6ebf3] text-[#6b7a95]">
                  <th className="px-2 py-3 font-medium">Contributeur</th>
                  <th className="px-2 py-3 font-medium">Cotisation</th>
                  <th className="px-2 py-3 font-medium">Montant</th>
                  <th className="px-2 py-3 font-medium">Statut</th>
                  <th className="px-2 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#f0f3f8] last:border-0"
                  >
                    <td className="px-2 py-3 font-medium text-[#143268]">
                      {row.contributor_name}
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`https://mastercota.com/c/${row.slug}`}
                        target="_blank"
                        className="text-[#2b4575] hover:underline"
                      >
                        {row.cotisation_title}
                      </Link>
                    </td>
                    <td className="px-2 py-3">
                      {formatAmount(Number(row.amount))}
                    </td>
                    <td className="px-2 py-3">
                      <Badge
                        variant="secondary"
                        className={cn(
                          row.status === "paid" &&
                            "bg-emerald-50 text-emerald-700",
                          row.status === "pending" &&
                            "bg-amber-50 text-amber-700",
                          row.status === "failed" && "bg-red-50 text-red-700"
                        )}
                      >
                        {STATUS_FR[row.status] || row.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 text-[#6b7a95]">
                      {new Date(row.created_at).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-10 text-center text-[#6b7a95]"
                    >
                      Aucune contribution pour l’instant.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
