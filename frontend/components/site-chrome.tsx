"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function SiteHeader({
  links,
}: {
  links: { href: string; label: string; shortLabel?: string }[];
}) {
  const pathname = usePathname();
  const isAuth = pathname.startsWith("/auth");

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 md:gap-6">
          <Logo href="/" size="sm" className="shrink-0" />
          {!isAuth ? (
            <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              {links.map((l) => {
                const active = isActive(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:px-2.5 sm:text-sm",
                      active
                        ? "bg-primary/15 text-ink"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="sm:hidden">{l.shortLabel ?? l.label}</span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
        {!isAuth ? (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden px-2 sm:inline-flex"
            >
              <Link href="/auth/phone">Connexion</Link>
            </Button>
            <Button asChild size="sm" className="px-2.5 text-xs sm:px-3 sm:text-sm">
              <Link href="/auth/phone">Commencer</Link>
            </Button>
          </div>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Accueil</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

export function SiteFooter({
  links,
  supportEmail,
  phoneWhatsapp,
}: {
  links: { href: string; label: string }[];
  supportEmail?: string;
  phoneWhatsapp?: string;
}) {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:gap-10 sm:py-12 md:grid-cols-3 md:px-6">
        <div>
          <Logo href="/" size="sm" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Cotisations communautaires : 0&nbsp;% sur les contributions, argent
            reçu directement sur Wave.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Liens
          </p>
          <ul className="mt-3 space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-foreground/80 hover:text-primary"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Contact
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {supportEmail ? (
              <li>
                <a
                  href={`mailto:${supportEmail}`}
                  className="break-all hover:text-primary"
                >
                  {supportEmail}
                </a>
              </li>
            ) : null}
            {phoneWhatsapp ? (
              <li>
                <a
                  href={`https://wa.me/${phoneWhatsapp.replace(/\D/g, "")}`}
                  className="hover:text-primary"
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp {phoneWhatsapp}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <Separator />
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-6">
        <span>© {new Date().getFullYear()} Mastercota</span>
        <span>0&nbsp;% sur les dons · frais de durée pour l’organisateur</span>
      </div>
    </footer>
  );
}
