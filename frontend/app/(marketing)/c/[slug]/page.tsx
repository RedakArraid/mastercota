import { notFound } from "next/navigation";
import {
  HeartHandshake,
  ShieldCheck,
  Trophy,
  Users,
  Clock3,
} from "lucide-react";
import ContributeForm from "@/components/contribute-form";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { backendFetch } from "@/lib/backend";
import {
  formatAmount,
  progressPercent,
  daysRemaining,
  remainingLabel,
} from "@/lib/format";
import type { Cotisation, Contribution } from "@/lib/types";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await backendFetch<{ cotisation: Cotisation }>(
      `/api/cotisations/by-slug/${slug}`
    );
    return {
      title: data.cotisation.title,
      description:
        data.cotisation.description ??
        `Contribuez à ${data.cotisation.title}`,
    };
  } catch {
    return { title: "Cotisation" };
  }
}

export default async function PublicContributionPage({ params }: Props) {
  const { slug } = await params;
  let cot: Cotisation;

  try {
    const data = await backendFetch<{ cotisation: Cotisation }>(
      `/api/cotisations/by-slug/${slug}`
    );
    cot = data.cotisation;
  } catch {
    notFound();
  }

  const settings = cot.settings ?? {};
  const showProgress = settings.show_progress !== false;
  const showTarget = settings.show_target_amount !== false;
  const showContributors = settings.show_contributors !== false;
  const showBest = settings.show_best_contributor !== false;
  const pct =
    cot.progress_percent ??
    progressPercent(Number(cot.current_amount), Number(cot.target_amount));
  const days = daysRemaining(cot.deadline);
  const canContribute = cot.status === "active" && days >= 0;

  let contributions: Contribution[] = [];
  if (showContributors || showBest) {
    try {
      const data = await backendFetch<{ contributions: Contribution[] }>(
        `/api/cotisations/${cot.id}/contributions`
      );
      contributions = (data.contributions ?? []).filter(
        (contribution) => contribution.status === "paid"
      );
    } catch {
      contributions = [];
    }
  }

  const best =
    showBest && contributions.length > 0
      ? contributions.reduce((a, b) =>
          Number(a.amount) >= Number(b.amount) ? a : b
        )
      : null;

  const statusText =
    cot.status === "active"
      ? days >= 0
        ? remainingLabel(cot.deadline)
        : "Expirée"
      : cot.status === "closed"
        ? "Clôturée"
        : cot.status === "completed"
          ? "Objectif atteint"
          : cot.status;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#fffdf8_0%,#f8faff_45%,#f5f7fb_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,_rgb(244_184_41_/_20%),_transparent_68%)]" />
      <div className="pointer-events-none absolute -right-24 top-40 size-72 rounded-full bg-ink/5 blur-3xl" />

      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Logo href="/" size="sm" />
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/75 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            Suivi sécurisé par Mastercota
          </div>
        </header>

        <section className="mc-panel relative overflow-hidden p-6 text-center sm:p-8 md:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(ellipse_at_top,_rgb(244_184_41_/_17%),_transparent_72%)]" />

          <div className="relative">
            <Badge
              variant="secondary"
              className="mx-auto rounded-full border border-border/80 bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-sm"
            >
              {statusText}
            </Badge>

            <h1 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-extrabold tracking-[-0.045em] text-ink sm:text-4xl md:text-5xl">
              {cot.title}
            </h1>

            {cot.description ? (
              <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                {cot.description}
              </p>
            ) : null}

            {showProgress ? (
              <div className="mx-auto mt-7 max-w-xl rounded-2xl border border-border/80 bg-secondary/45 p-4 text-left sm:p-5">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      Collecté
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tracking-[-0.035em] text-ink sm:text-3xl">
                      {formatAmount(Number(cot.current_amount))}
                    </p>
                  </div>
                  {showTarget ? (
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                        Objectif
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink sm:text-base">
                        {formatAmount(Number(cot.target_amount))}
                      </p>
                    </div>
                  ) : null}
                </div>

                <Progress value={pct} className="h-3 bg-white" />

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-ink">
                    {Math.round(pct)} % atteint
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="size-3.5" />
                    {statusText}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="mx-auto mt-5 grid max-w-xl gap-2 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/75 px-3 py-3 text-sm">
                <HeartHandshake className="mx-auto size-4 text-primary" />
                <p className="mt-1.5 font-semibold text-ink">Paiement direct</p>
              </div>
              <div className="rounded-2xl bg-white/75 px-3 py-3 text-sm">
                <ShieldCheck className="mx-auto size-4 text-primary" />
                <p className="mt-1.5 font-semibold text-ink">0 % Mastercota</p>
              </div>
              <div className="rounded-2xl bg-white/75 px-3 py-3 text-sm">
                <Users className="mx-auto size-4 text-primary" />
                <p className="mt-1.5 font-semibold text-ink">
                  {contributions.length} contribution{contributions.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </section>

        {best ? (
          <div className="mx-auto mt-4 flex max-w-xl items-center gap-3 rounded-2xl border border-primary/20 bg-accent/80 px-4 py-3 text-sm">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-sm">
              <Trophy className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                Meilleur contributeur
              </p>
              <p className="truncate font-bold text-ink">
                {best.contributor_name} · {formatAmount(Number(best.amount))}
              </p>
            </div>
          </div>
        ) : null}

        <section className="mc-panel mt-6 p-5 sm:p-7">
          <div className="mb-5">
            <p className="mc-kicker">
              {canContribute ? "Participer" : "Signalement"}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.025em] text-ink sm:text-2xl">
              {canContribute
                ? "Je contribue à cette cotisation"
                : "Vous avez déjà effectué un transfert ?"}
            </h2>
            {!canContribute ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Les nouveaux transferts sont fermés, mais vous pouvez encore
                signaler un paiement déjà envoyé à l’organisateur.
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Renseignez vos informations, envoyez le montant puis revenez
                confirmer votre transfert.
              </p>
            )}
          </div>

          <ContributeForm cotisation={cot} reportOnly={!canContribute} />
        </section>

        {showContributors && contributions.length > 0 ? (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="mc-kicker">Transparence</p>
                <h2 className="mt-1 text-lg font-bold text-ink">Contributeurs confirmés</h2>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                {contributions.length}
              </span>
            </div>

            <ul className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-white/80 shadow-[0_18px_50px_-40px_rgb(20_50_104_/_45%)]">
              {contributions.map((contribution) => (
                <li
                  key={contribution.id}
                  className="flex items-center justify-between gap-4 border-b border-border/70 px-4 py-3.5 text-sm last:border-b-0 sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-ink">
                      {contribution.contributor_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate font-semibold text-ink">
                      {contribution.contributor_name}
                    </span>
                  </div>
                  <span className="shrink-0 font-bold text-muted-foreground">
                    {formatAmount(Number(contribution.amount))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="pb-8 pt-10 text-center text-xs leading-5 text-muted-foreground">
          Mastercota organise le suivi. Les fonds sont envoyés directement à
          l’organisateur.
        </footer>
      </div>
    </div>
  );
}
