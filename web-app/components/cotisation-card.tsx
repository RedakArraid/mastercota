import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatAmount, progressPercent, daysRemaining } from "@/lib/format";
import type { Cotisation } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  active: "Active",
  completed: "Atteinte",
  closed: "Clôturée",
};

export function CotisationCard({ cotisation }: { cotisation: Cotisation }) {
  const pct = progressPercent(cotisation.current_amount, cotisation.target_amount);
  const days = daysRemaining(cotisation.deadline);

  return (
    <Link
      href={`/cotisation/${cotisation.id}`}
      className={cn(
        "block rounded-2xl border border-border bg-card p-5 shadow-sm transition",
        "hover:border-primary/40 hover:shadow-md"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug text-foreground">
          {cotisation.title}
        </h3>
        <Badge variant={cotisation.status === "active" ? "default" : "secondary"}>
          {statusLabel[cotisation.status] ?? cotisation.status}
        </Badge>
      </div>
      {cotisation.description ? (
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {cotisation.description}
        </p>
      ) : null}
      <Progress value={pct} className="mb-3 h-2" />
      <div className="flex items-end justify-between gap-2 text-sm">
        <div>
          <p className="font-semibold text-foreground">
            {formatAmount(cotisation.current_amount)}
          </p>
          <p className="text-muted-foreground">
            sur {formatAmount(cotisation.target_amount)}
          </p>
        </div>
        <p className="text-muted-foreground">
          {days >= 0 ? `${days} j restants` : "Expirée"}
        </p>
      </div>
    </Link>
  );
}
