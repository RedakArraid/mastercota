"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { api } from "@/lib/api";
import {
  buildE164,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  isValidNational,
} from "@/lib/countries";

function PhoneForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [localPhone, setLocalPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const country = getCountryByIso(countryIso);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidNational(country, localPhone)) {
      toast.error(
        `Entrez un numéro à ${country.nationalLength} chiffres (${country.name})`
      );
      return;
    }
    const phone = buildE164(country, localPhone);
    setLoading(true);
    try {
      await api("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      sessionStorage.setItem("mc_phone", phone);
      const next = searchParams.get("next");
      const qs = new URLSearchParams({ phone });
      if (next?.startsWith("/")) qs.set("next", next);
      router.push(`/auth/otp?${qs.toString()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Envoi OTP échoué");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-6 py-12 md:py-16">
      <h1 className="mb-2 text-3xl font-extrabold text-ink">Votre numéro</h1>
      <p className="mb-8 text-muted-foreground">
        Choisissez votre pays, puis entrez votre numéro. Nous vous enverrons un
        code WhatsApp à 6 chiffres.
      </p>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <PhoneInput
            countryIso={countryIso}
            onCountryChange={(iso) => {
              setCountryIso(iso);
              setLocalPhone("");
            }}
            national={localPhone}
            onNationalChange={setLocalPhone}
          />
          <p className="text-xs text-muted-foreground">
            {country.flag} {country.name} — indicatif {country.dial}
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Envoi…" : "Recevoir le code WhatsApp"}
        </Button>
      </form>
    </div>
  );
}

export default function PhonePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">Chargement…</div>
      }
    >
      <PhoneForm />
    </Suspense>
  );
}
