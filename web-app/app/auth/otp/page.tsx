"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

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
      const supabase = createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (userId) {
        await supabase.from("users").upsert({ id: userId, phone });
      }
      router.replace("/home");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Code invalide");
      setLoading(false);
    }
  }

  async function resend() {
    if (!phone || countdown > 0) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setCountdown(60);
      toast.success("Nouveau code envoyé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Renvoi impossible");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Logo href="/auth/phone" className="mb-10" />
      <h1 className="mb-2 text-3xl font-extrabold text-ink">Code SMS</h1>
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
