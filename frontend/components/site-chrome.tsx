import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SiteHeader({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-8">
          <Logo href="/" size="sm" />
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/auth/phone">Connexion</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth/phone">Commencer</Link>
          </Button>
        </div>
      </div>
      {links.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto border-t border-border/60 px-4 py-2 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="shrink-0 text-xs font-medium text-muted-foreground"
            >
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
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
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <Logo href="/" size="sm" />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Cotisations communautaires pour l&apos;Afrique francophone.
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
                <a href={`mailto:${supportEmail}`} className="hover:text-primary">
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground md:px-6">
        <span>© {new Date().getFullYear()} Mastercota</span>
        <span>Frais de service ~3 %</span>
      </div>
    </footer>
  );
}
