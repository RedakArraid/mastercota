"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { Logo } from "@/components/logo";
import { Enter } from "@/components/motion";
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
      toast.error(
        err instanceof Error ? err.message : "Impossible d’envoyer le code"
      );
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-4 py-10 sm:px-6 sm:py-12 md:py-16">
      <Enter>
        <Logo href="/" size="md" />
      </Enter>
      <Enter delayMs={140} className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Étape 1 sur 2 · Connexion
        </p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">
          Votre numéro WhatsApp
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Choisissez votre pays, puis saisissez votre numéro. Nous envoyons un
          code à <strong className="font-semibold text-foreground">6 chiffres</strong>{" "}
          sur WhatsApp. Ce numéro devient votre compte Mastercota.
        </p>
      </Enter>

      <Enter delayMs={280} className="mt-8">
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              {country.flag} {country.name}, indicatif {country.dial}. Gardez
              WhatsApp ouvert pour recevoir le message.
            </p>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Envoi du code…" : "Recevoir le code WhatsApp"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pas encore sûr du parcours ?{" "}
          <Link href="/onboarding" className="font-medium text-foreground underline-offset-4 hover:underline">
            Relire le guide
          </Link>
        </p>
      </Enter>
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
