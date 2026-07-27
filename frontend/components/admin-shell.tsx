"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/admin", label: "Activité", exact: true },
  { href: "/admin/openwa", label: "WhatsApp / OTP" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/cotisations", label: "Cotisations" },
  { href: "/admin/contributions", label: "Contributions" },
  { href: "/admin/pages", label: "Pages CMS" },
];

type Me = { id: string; phone: string; name: string | null; role: string };

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/auth/phone");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Chargement admin…
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
        <h1 className="text-xl font-semibold">Administration</h1>
        <p className="text-sm text-muted-foreground">
          {error || "Accès refusé. Connectez-vous avec un compte admin."}
        </p>
        <Button asChild>
          <Link href="/auth/phone?next=/admin">Se connecter</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4f0] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Mastercota
            </p>
            <h1 className="text-lg font-semibold">Administration</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-zinc-500 sm:inline">
              {me.name || me.phone}
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              Déconnexion
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  active
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
