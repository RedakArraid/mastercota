import Link from "next/link";
import { cookies } from "next/headers";
import { Plus, AlertCircle } from "lucide-react";
import { CotisationCard } from "@/components/cotisation-card";
import { Button } from "@/components/ui/button";
import { SESSION_COOKIE } from "@/lib/auth-token";
import { backendFetch } from "@/lib/backend";
import { hasWavePayoutConfigured } from "@/lib/wave";
import type { Cotisation, UserProfile } from "@/lib/types";

export default async function HomePage() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const authInit = {
    cookie: token ? `${SESSION_COOKIE}=${token}` : undefined,
    headers: token
      ? ({ Authorization: `Bearer ${token}` } as HeadersInit)
      : undefined,
  };

  let list: Cotisation[] = [];
  let loadError = false;
  let profile: UserProfile | null = null;

  try {
    const [cots, me] = await Promise.all([
      backendFetch<{ cotisations: Cotisation[] }>("/api/cotisations", authInit),
      backendFetch<{ user: UserProfile }>("/api/profile", authInit).catch(
        () => ({ user: null as unknown as UserProfile })
      ),
    ]);
    list = cots.cotisations ?? [];
    profile = me.user ?? null;
  } catch {
    loadError = true;
    list = [];
  }

  const active = list.filter((c) => c.status === "active");
  const others = list.filter((c) => c.status !== "active");
  const totalRaised = list.reduce(
    (s, c) => s + Number(c.current_amount || 0),
    0
  );
  const needsPayout =
    profile &&
    !hasWavePayoutConfigured({
      mode: profile.wave_payout_mode,
      wavePayLink: profile.wave_pay_link,
      wavePhone: profile.wave_phone,
    });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Tableau de bord
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">
            {profile?.name
              ? `Bonjour, ${profile.name.split(" ")[0]}`
              : "Mes cotisations"}
          </h1>
          {list.length > 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {active.length} active{active.length > 1 ? "s" : ""} ·{" "}
              {list.length} au total ·{" "}
              {new Intl.NumberFormat("fr-FR").format(totalRaised)} FCFA collectés
            </p>
          ) : null}
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/cotisation/create">
            <Plus className="size-4" />
            Nouvelle
          </Link>
        </Button>
      </div>

      {needsPayout ? (
        <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <div>
            <p className="font-medium text-ink">Avant de recevoir : configurez Wave</p>
            <p className="mt-1 leading-relaxed text-muted-foreground">
              Sans Wave, vos contributeurs ne peuvent pas vous payer. Choisissez
              Wave Business (paiement en 1 clic) ou votre numéro Wave (envoi
              manuel). On vous explique chaque étape.
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-3">
              <Link href="/profile/payout">Voir les deux modes et configurer</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-ink">
            Impossible de charger vos cotisations
          </h2>
          <p className="mt-2 text-muted-foreground">
            Vérifiez votre connexion et réessayez.
          </p>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-left md:text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Première cotisation
          </p>
          <h2 className="mt-3 text-2xl font-extrabold text-ink">
            Aucune cotisation pour l’instant
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            Une cotisation, c’est une page publique avec un objectif et une
            durée. Vous la partagez sur WhatsApp ; vos proches paient via Wave ;
            vous confirmez les paiements. Avant de créer, configurez Wave si ce
            n’est pas déjà fait.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href="/cotisation/create">Créer une cotisation</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/profile/payout">D’abord configurer Wave</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                En cours
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((c) => (
                  <CotisationCard key={c.id} cotisation={c} />
                ))}
              </div>
            </section>
          ) : null}
          {others.length > 0 ? (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Terminées / clôturées
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {others.map((c) => (
                  <CotisationCard key={c.id} cotisation={c} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
