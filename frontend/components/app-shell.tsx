"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, Menu } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/home", label: "Accueil", icon: Home },
  { href: "/cotisation/create", label: "Créer", icon: PlusCircle },
  { href: "/profile", label: "Profil", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar/80 p-6 backdrop-blur md:flex md:flex-col">
        <Logo href="/home" className="mb-10" />
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/home" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-ink"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:hidden">
          <Logo href="/home" size="sm" />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Logo href="/home" className="mb-8" />
              <nav className="flex flex-col gap-1">
                {nav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>

        <nav className="sticky bottom-0 z-30 grid grid-cols-3 border-t border-border bg-background/95 backdrop-blur md:hidden">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/home" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground"
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
  );
}
