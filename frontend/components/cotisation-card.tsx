import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatAmount, progressPercent, remainingLabel } from "@/lib/format";
import type { Cotisation } from "@/lib/types";
import { statusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function CotisationCard({ cotisation }: { cotisation: Cotisation }) {
  const pct = progressPercent(cotisation.current_amount, cotisation.target_amount);
  const active = cotisation.status === "active";

  return (
    <Link
      href={`/cotisation/${cotisation.id}`}
      className={cn(
        "group block overflow-hidden rounded-[1.35rem] border border-border/80 bg-white/90 p-5",
        "shadow-[0_18px_50px_-38px_rgb(20_50_104_/_45%)] transition-all duration-300",
        "hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_24px_60px_-36px_rgb(20_50_104_/_48%)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <Badge
              variant={active ? "default" : "secondary"}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]",
                active && "bg-ink text-white hover:bg-ink"
              )}
            >
              {statusLabel(cotisation.status)}
            </Badge>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              {Math.round(pct)} %
            </span>
          </div>
          <h3 className="line-clamp-2 text-lg font-bold leading-snug tracking-[-0.02em] text-ink sm:text-xl">
            {cotisation.title}
          </h3>
          {cotisation.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {cotisation.description}
            </p>
          ) : null}
        </div>

        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-ink transition-all group-hover:bg-primary group-hover:text-ink">
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>

      <div className="mt-6">
        <Progress value={pct} className="h-2.5 bg-secondary" />
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xl font-extrabold tracking-[-0.03em] text-ink">
              {formatAmount(cotisation.current_amount)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              sur {formatAmount(cotisation.target_amount)}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-right text-xs font-medium text-muted-foreground">
            <CalendarDays className="size-3.5" />
            <span>
              {cotisation.status === "pending_fee"
                ? "Démarre à l’activation"
                : remainingLabel(cotisation.deadline)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
