import Link from "next/link";
import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import { CotisationCard } from "@/components/cotisation-card";
import { Button } from "@/components/ui/button";
import { SESSION_COOKIE } from "@/lib/auth-token";
import { APP_URL } from "@/lib/constants";
import type { Cotisation } from "@/lib/types";

async function fetchCotisations(): Promise<Cotisation[]> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const res = await fetch(`${APP_URL}/api/cotisations`, {
    headers: token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {},
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.cotisations as Cotisation[]) ?? [];
}

export default async function HomePage() {
  // Direct DB preferred for SSR reliability behind Traefik
  const { getSessionFromCookies } = await import("@/lib/auth");
  const { query } = await import("@/lib/db");
  const session = await getSessionFromCookies();
  let list: Cotisation[] = [];
  if (session) {
    try {
      const { rows } = await query(
        `SELECT * FROM cotisations WHERE owner_id = $1 ORDER BY created_at DESC`,
        [session.id]
      );
      list = rows as Cotisation[];
    } catch {
      list = await fetchCotisations();
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Tableau de bord
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-ink">
            Mes cotisations
          </h1>
        </div>
        <Button asChild>
          <Link href="/cotisation/create">
            <Plus className="size-4" />
            Nouvelle
          </Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <h2 className="text-xl font-semibold text-ink">Aucune cotisation</h2>
          <p className="mt-2 text-muted-foreground">
            Créez votre première caisse et partagez le lien.
          </p>
          <Button asChild className="mt-6">
            <Link href="/cotisation/create">Créer une cotisation</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((c) => (
            <CotisationCard key={c.id} cotisation={c} />
          ))}
        </div>
      )}
    </div>
  );
}
