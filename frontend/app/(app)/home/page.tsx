import Link from "next/link";
import { cookies } from "next/headers";
import {
  Plus,
  AlertCircle,
  Wallet,
  Activity,
  Target,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { CotisationCard } from "@/components/cotisation-card";
import { Button } from "@/components/ui/button";
import { SESSION_COOKIE } from "@/lib/auth-token";
import { backendFetch } from "@/lib/backend";
import { hasWavePayoutConfigured } from "@/lib/wave";
import { formatAmount } from "@/lib/format";
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
  const completed = list.filter((c) => c.status === "completed");
  const others = list.filter((c) => c.status !== "active");
  const totalRaised = list.reduce(
    (sum, c) => sum + Number(c.current_amount || 0),
    0
  );
  const totalTarget = list.reduce(
    (sum, c) => sum + Number(c.target_amount || 0),
    0
  );
  const globalProgress =
    totalTarget > 0 ? Math.min(100, Math.round((totalRaised / totalTarget) * 100)) : 0;

  const needsPayout =
    profile &&
    !hasWavePayoutConfigured({
      mode: profile.wave_payout_mode,
      wavePayLink: profile.wave_pay_link,
      wavePhone: profile.wave_phone,
    });

  return (
    <div className="mc-page space-y-7 sm:space-y-9">
      <section className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#143268_0%,#1d447e_58%,#2b558f_100%)] p-6 text-white shadow-[0_28px_70px_-38px_rgb(20_50_104_/_95%)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-gold-bright/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold text-white/75">
              <Sparkles className="size-3.5 text-gold-bright" />
              Espace organisateur
            </div>
            <h1 className="text-balance text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl lg:text-5xl">
              {profile?.name
                ? `Bonjour, ${profile.name.split(" ")[0]}.`
                : "Pilotez vos cotisations simplement."}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
              Suivez l’avancement, confirmez les contributions et partagez vos
              collectes sans perdre le fil dans les messages.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="w-full bg-gold-bright text-ink hover:bg-gold-bright sm:w-auto"
          >
            <Link href="/cotisation/create">
              <Plus className="size-4" />
              Nouvelle cotisation
            </Link>
          </Button>
        </div>

        {list.length > 0 ? (
          <div className="relative mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium text-white/55">
                <Wallet className="size-3.5 text-gold-bright" />
                Total collecté
              </div>
              <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                {formatAmount(totalRaised)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium text-white/55">
                <Activity className="size-3.5 text-gold-bright" />
                Cotisations actives
              </div>
              <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                {active.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-medium text-white/55">
                <Target className="size-3.5 text-gold-bright" />
                Progression globale
              </div>
              <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                {globalProgress} %
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {needsPayout ? (
        <section className="mc-panel flex flex-col gap-4 border-amber-500/25 bg-amber-50/75 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
              <AlertCircle className="size-5" />
            </span>
            <div>
              <p className="font-bold text-ink">Configurez votre réception Wave</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Vos contributeurs pourront vous payer dès que votre lien Wave
                Business ou votre numéro Wave sera renseigné.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/profile/payout">
              Configurer maintenant
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      ) : null}

      {loadError ? (
        <section className="mc-empty border-destructive/30 bg-destructive/5">
          <h2 className="text-lg font-bold text-ink">
            Impossible de charger vos cotisations
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vérifiez votre connexion puis actualisez la page.
          </p>
        </section>
      ) : list.length === 0 ? (
        <section className="mc-panel relative overflow-hidden px-6 py-12 text-center sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,_rgb(244_184_41_/_14%),_transparent_70%)]" />
          <div className="relative mx-auto max-w-xl">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary">
              <Plus className="size-6" />
            </span>
            <p className="mc-kicker mt-6">Première cotisation</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink sm:text-3xl">
              Transformez votre prochain groupe WhatsApp en collecte claire.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
              Créez la page, partagez le lien, recevez directement et gardez une
              vision nette de chaque contribution.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/cotisation/create">Créer ma cotisation</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/profile/payout">Configurer la réception</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-10">
          {active.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="mc-kicker">En cours</p>
                  <h2 className="mt-1 mc-section-title">Cotisations actives</h2>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  {active.length} active{active.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {active.map((cotisation) => (
                  <CotisationCard key={cotisation.id} cotisation={cotisation} />
                ))}
              </div>
            </section>
          ) : null}

          {others.length > 0 ? (
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="mc-kicker">Historique</p>
                  <h2 className="mt-1 mc-section-title">Autres cotisations</h2>
                </div>
                {completed.length > 0 ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {completed.length} objectif{completed.length > 1 ? "s" : ""} atteint{completed.length > 1 ? "s" : ""}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {others.map((cotisation) => (
                  <CotisationCard key={cotisation.id} cotisation={cotisation} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
