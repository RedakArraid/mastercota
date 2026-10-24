"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, User, Menu, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/home", label: "Accueil", icon: Home },
  { href: "/cotisation/create", label: "Créer", icon: Plus },
  { href: "/profile", label: "Profil", icon: User },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/home" && pathname.startsWith(href));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = (
    <nav className="space-y-1.5">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all",
              active
                ? "bg-ink text-white shadow-[0_14px_30px_-20px_rgb(20_50_104_/_85%)]"
                : "text-muted-foreground hover:bg-secondary/80 hover:text-ink"
            )}
          >
            <span
              className={cn(
                "grid size-8 place-items-center rounded-xl transition-colors",
                active
                  ? "bg-white/10 text-gold-bright"
                  : "bg-secondary text-ink group-hover:bg-white"
              )}
            >
              <Icon className="size-4" />
            </span>
            <span>{item.label}</span>
            {active ? <span className="ml-auto size-1.5 rounded-full bg-gold-bright" /> : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#fbfcfe_0%,#f6f8fc_100%)]">
      <div className="mx-auto flex min-h-dvh max-w-[1440px]">
        <aside className="sticky top-0 hidden h-dvh w-[276px] shrink-0 border-r border-border/80 bg-white/75 p-5 backdrop-blur-xl md:flex md:flex-col">
          <div className="px-2 pb-8 pt-1">
            <Logo href="/home" />
            <p className="mt-2 pl-11 text-xs leading-5 text-muted-foreground">
              Vos cotisations, clairement suivies.
            </p>
          </div>

          <Button asChild size="lg" className="mb-6 w-full justify-between">
            <Link href="/cotisation/create">
              <span className="inline-flex items-center gap-2">
                <Plus className="size-4" />
                Nouvelle cotisation
              </span>
              <ArrowUpRight className="size-4 opacity-70" />
            </Link>
          </Button>

          <div className="flex-1">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">
              Espace organisateur
            </p>
            {navigation}
          </div>

          <div className="rounded-[1.35rem] border border-border/80 bg-[linear-gradient(145deg,#143268_0%,#1e427d_100%)] p-4 text-white shadow-[0_18px_50px_-30px_rgb(20_50_104_/_75%)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              Mastercota
            </p>
            <p className="mt-2 text-sm font-semibold leading-5">
              0 % de commission sur les contributions.
            </p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Vous gardez la maîtrise de vos fonds. Mastercota simplifie le suivi.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-white/[0.08]0 px-4 py-3 backdrop-blur-xl md:hidden">
            <Logo href="/home" size="sm" />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Ouvrir le menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] border-l-border bg-white p-5">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Logo href="/home" className="mb-8" />
                <Button asChild size="lg" className="mb-6 w-full">
                  <Link href="/cotisation/create">
                    <Plus className="size-4" />
                    Nouvelle cotisation
                  </Link>
                </Button>
                {navigation}
              </SheetContent>
            </Sheet>
          </header>

          <main className="flex-1 px-4 py-6 pb-28 sm:px-6 md:px-8 md:py-8 md:pb-10 lg:px-10">
            {children}
          </main>

          <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-3 rounded-[1.4rem] border border-white/20 bg-ink/95 p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-[0_20px_50px_-22px_rgb(20_50_104_/_90%)] backdrop-blur-xl md:hidden">
            {nav.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[11px] font-semibold transition",
                    active
                      ? "bg-gold-bright text-ink"
                      : "text-white/60 active:bg-white/10 active:text-white"
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
