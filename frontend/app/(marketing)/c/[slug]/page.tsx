import { notFound } from "next/navigation";
import ContributeForm from "@/components/contribute-form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { backendFetch } from "@/lib/backend";
import { formatAmount, progressPercent, daysRemaining } from "@/lib/format";
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
        data.cotisation.description ?? `Contribuez à ${data.cotisation.title}`,
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
  const pct = progressPercent(
    Number(cot.current_amount),
    Number(cot.target_amount)
  );
  const days = daysRemaining(cot.deadline);
  const canContribute = cot.status === "active" && days >= 0;

  let contributions: Contribution[] = [];
  if (showContributors) {
    try {
      const data = await backendFetch<{ contributions: Contribution[] }>(
        `/api/cotisations/${cot.id}/contributions`
      );
      contributions = data.contributions ?? [];
    } catch {
      contributions = [];
    }
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgb(218_152_16_/_18%),_transparent_55%)]" />
      <div className="relative mx-auto flex max-w-lg flex-col px-4 py-10 md:py-14">
        <section className="mb-8 space-y-4 text-center">
          <Badge variant="secondary" className="mx-auto">
            {cot.status === "active"
              ? days >= 0
                ? `${days} j restants`
                : "Expirée"
              : cot.status}
          </Badge>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            {cot.title}
          </h1>
          {cot.description ? (
            <p className="text-pretty text-muted-foreground">{cot.description}</p>
          ) : null}

          {showProgress ? (
            <div className="mx-auto max-w-sm space-y-2 pt-2 text-left">
              <Progress value={pct} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="font-semibold">
                  {formatAmount(Number(cot.current_amount))}
                </span>
                {showTarget ? (
                  <span className="text-muted-foreground">
                    objectif {formatAmount(Number(cot.target_amount))}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        {canContribute ? (
          <section className="rounded-2xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold">Je contribue</h2>
            <ContributeForm cotisation={cot} />
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-secondary/60 p-5 text-center text-sm text-muted-foreground">
            Les contributions sont fermées pour cette cotisation.
          </section>
        )}

        {showContributors && contributions.length > 0 ? (
          <>
            <Separator className="my-8" />
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Contributeurs
              </h2>
              <ul className="space-y-3">
                {contributions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{c.contributor_name}</span>
                    <span className="text-muted-foreground">
                      {formatAmount(Number(c.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
