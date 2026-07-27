"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const fromQuery = searchParams.get("phone");
    const fromStorage =
      typeof window !== "undefined"
        ? sessionStorage.getItem("mc_phone")
        : null;
    setPhone(fromQuery || fromStorage || "");
  }, [searchParams]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || token.length !== 6) {
      toast.error("Code à 6 chiffres requis");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{
        user?: { name?: string | null; role?: string };
      }>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, token }),
      });
      const next = searchParams.get("next");
      if (next?.startsWith("/")) {
        router.replace(next);
      } else if (data.user?.role === "admin" && typeof window !== "undefined") {
        const host = window.location.hostname;
        if (host.startsWith("admin.")) {
          router.replace("/admin");
        } else if (!data.user?.name) {
          router.replace("/profile");
        } else {
          router.replace("/home");
        }
      } else if (!data.user?.name) {
        router.replace("/profile");
      } else {
        router.replace("/home");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Code invalide");
      setLoading(false);
    }
  }

  async function resend() {
    if (!phone || countdown > 0) return;
    try {
      await api("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setCountdown(60);
      toast.success("Nouveau code envoyé sur WhatsApp");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Renvoi impossible");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-6 py-12 md:py-16">
      <h1 className="mb-2 text-3xl font-extrabold text-ink">Code WhatsApp</h1>
      <p className="mb-8 text-muted-foreground">
        Entrez le code envoyé au{" "}
        <span className="font-medium text-foreground">{phone || "…"}</span>
      </p>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="otp">Code à 6 chiffres</Label>
          <Input
            id="otp"
            inputMode="numeric"
            maxLength={6}
            value={token}
            onChange={(e) =>
              setToken(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="••••••"
            className="text-center text-2xl tracking-[0.4em]"
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Vérification…" : "Valider"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={countdown > 0}
          onClick={resend}
        >
          {countdown > 0 ? `Renvoyer (${countdown}s)` : "Renvoyer le code"}
        </Button>
      </form>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Chargement…</div>}>
      <OtpForm />
    </Suspense>
  );
}
