"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  PiggyBank,
  HandCoins,
  FileText,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  {
    href: "/admin",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/admin/cotisations", label: "Cotisations", icon: PiggyBank },
  { href: "/admin/contributions", label: "Contributions", icon: HandCoins },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/openwa", label: "WhatsApp / OTP", icon: MessageCircle },
  { href: "/admin/pages", label: "Pages CMS", icon: FileText },
];

type Me = { id: string; phone: string; name: string | null; role: string };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ user: Me }>("/api/auth/me");
        if (cancelled) return;
        if (!data.user || data.user.role !== "admin") {
          setError("Compte non administrateur");
          setMe(null);
        } else {
          setMe(data.user);
        }
      } catch {
        if (!cancelled) {
          setError("Connexion requise");
          router.replace("/auth/phone?next=/admin");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/auth/phone");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1f3d] text-sm text-white/70">
        Chargement de l’administration…
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#1a3360_0%,_#0b162c_70%)] p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#da9810]">
            Mastercota
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#143268]">
            Administration
          </h1>
          <p className="mt-2 text-sm text-[#6b7a95]">
            {error || "Accès refusé. Connectez-vous avec un compte admin."}
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/auth/phone?next=/admin">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  const sidebar = (
    <aside className="flex h-full w-[260px] flex-col bg-[#0f1f3d] text-white">
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#da9810] text-sm font-extrabold text-[#143268]">
            M
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">Mastercota</p>
            <p className="text-[11px] text-white/50">Console admin</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Menu
        </p>
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-[#da9810] font-semibold text-[#143268] shadow-lg shadow-[#da9810]/20"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <a
          href="https://mastercota.com"
          target="_blank"
          rel="noreferrer"
          className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/45 hover:text-white/80"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Voir le site
        </a>
        <div className="rounded-xl bg-white/5 px-3 py-3">
          <p className="truncate text-sm font-medium">
            {me.name || "Administrateur"}
          </p>
          <p className="truncate font-mono text-[11px] text-white/45">
            {me.phone}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/15"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[#eef2f8]">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex">{sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#d8e0ec] bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6b7a95]">
                Administration
              </p>
              <p className="text-sm font-semibold text-[#143268]">
                {NAV.find((n) =>
                  n.exact ? pathname === n.href : pathname.startsWith(n.href)
                )?.label || "Mastercota"}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-[#f4f7fb] px-3 py-1.5 text-xs text-[#6b7a95] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Système opérationnel
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
