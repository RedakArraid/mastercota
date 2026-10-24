"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { Enter } from "@/components/motion";
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
      if (next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
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
    <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
      <Enter>
        <Logo href="/" size="md" />
      </Enter>
      <Enter delayMs={140} className="mt-8">
        <p className="mc-kicker">
          Étape 2 sur 2 · Vérification
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
          Code reçu sur WhatsApp
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Ouvrez WhatsApp sur le numéro{" "}
          <span className="font-semibold text-foreground">{phone || "…"}</span>
          . Saisissez le code à 6 chiffres ci-dessous. Prenez votre temps, le
          code reste valable quelques minutes.
        </p>
      </Enter>
      <Enter delayMs={280} className="mc-panel mt-8 p-5 sm:p-6">
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
            {loading ? "Vérification…" : "Valider et entrer"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={countdown > 0}
            onClick={resend}
          >
            {countdown > 0
              ? `Renvoyer le code dans ${countdown}s`
              : "Je n’ai rien reçu, renvoyer"}
          </Button>
        </form>
      </Enter>
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
