"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  nationalFromE164,
  isoFromE164,
} from "@/lib/countries";
import { formatWaveDisplay } from "@/lib/wave";
import type { UserProfile } from "@/lib/types";

export default function PayoutSettingsPage() {
  const router = useRouter();
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [existing, setExisting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const country = getCountryByIso(countryIso);

  useEffect(() => {
    api<{ user: UserProfile }>("/api/profile")
      .then((p) => {
        const w = p.user?.wave_phone;
        if (w) {
          setExisting(w);
          const iso = isoFromE164(w) || DEFAULT_COUNTRY_ISO;
          setCountryIso(iso);
          setNational(nationalFromE164(w, iso) || "");
        }
      })
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidNational(country, national)) {
      toast.error(
        `Numéro invalide — ${country.nationalLength} chiffres (${country.name})`
      );
      return;
    }
    setSaving(true);
    try {
      const wave_phone = buildE164(country, national);
      const data = await api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ wave_phone }),
      });
      setExisting(data.user.wave_phone ?? null);
      toast.success("Numéro Wave enregistré");
      router.push("/profile");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement échoué");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <Button asChild variant="ghost" className="-ml-3 mb-2">
          <Link href="/profile">← Profil</Link>
        </Button>
        <h1 className="text-3xl font-extrabold text-ink">Compte Wave</h1>
        <p className="mt-2 text-muted-foreground">
          Les contributeurs envoient l’argent <strong>directement</strong> sur
          ce numéro via Wave. Mastercota ne détient pas les fonds — uniquement
          le suivi et la transparence.
        </p>
      </div>

      {existing ? (
        <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
          <p className="font-medium text-ink">Numéro actuel</p>
          <p className="mt-1 text-lg font-semibold">
            {formatWaveDisplay(existing)}
          </p>
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label>Numéro Wave de réception</Label>
          <PhoneInput
            countryIso={countryIso}
            onCountryChange={(iso) => {
              setCountryIso(iso);
              setNational("");
            }}
            national={national}
            onNationalChange={setNational}
          />
          <p className="text-xs text-muted-foreground">
            Utilisez le numéro lié à votre compte Wave.
          </p>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
