"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants";

export default function PhonePage() {
  const router = useRouter();
  const [localPhone, setLocalPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const digits = localPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("Entrez un numéro à 10 chiffres");
      return;
    }
    const phone = `${DEFAULT_COUNTRY_CODE}${digits}`;
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      sessionStorage.setItem("mc_phone", phone);
      router.push(`/auth/otp?phone=${encodeURIComponent(phone)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi OTP échoué");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <Logo href="/onboarding" className="mb-10" />
      <h1 className="mb-2 text-3xl font-extrabold text-ink">Votre numéro</h1>
      <p className="mb-8 text-muted-foreground">
        Nous vous enverrons un code SMS à 6 chiffres.
      </p>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <div className="flex gap-2">
            <div className="flex h-9 items-center rounded-lg border border-input bg-secondary px-3 text-sm">
              🇨🇮 {DEFAULT_COUNTRY_CODE}
            </div>
            <Input
              id="phone"
              inputMode="numeric"
              maxLength={10}
              value={localPhone}
              onChange={(e) =>
                setLocalPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="0700000000"
              className="flex-1 tracking-wider"
              required
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Envoi…" : "Recevoir le code"}
        </Button>
      </form>
    </div>
  );
}
