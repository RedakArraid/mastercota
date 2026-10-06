import Link from "next/link";
import { cn } from "@/lib/utils";

/** @deprecated Anciennes méthodes — redirigées vers /frais */
export const METHOD_NAV = [
  { href: "/frais#gratuit", label: "Essai gratuit", short: "Gratuit" },
  { href: "/frais#durees", label: "Durées payantes", short: "Tarifs" },
  { href: "/frais#wave", label: "Recevoir (Wave)", short: "Wave" },
] as const;

export function MarketingPageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
  showMethods?: boolean;
  currentMethod?: string;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 md:py-20">
      <div className="mc-enter">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
          {lead}
        </p>
      </div>
      <div className="mt-8 space-y-8 sm:mt-10 sm:space-y-10">{children}</div>
    </article>
  );
}

export function InfoBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card/60 p-4 sm:p-6",
        className
      )}
    >
      <h2 className="text-base font-bold text-ink sm:text-lg">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}

export function MethodSwitcher({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {METHOD_NAV.map((item) => {
        const active = current === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
