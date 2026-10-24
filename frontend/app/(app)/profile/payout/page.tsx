"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { WaveBusinessGuide } from "@/components/wave-business-guide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/phone-input";
import { api } from "@/lib/api";
import {
  buildE164,
  DEFAULT_COUNTRY_ISO,
  getCountryByIso,
  isValidNational,
  isoFromE164,
  nationalFromE164,
} from "@/lib/countries";
import {
  normalizeWavePayLink,
  normalizeWavePhone,
  resolveWavePayoutMode,
  type WavePayoutMode,
} from "@/lib/wave";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function PayoutSettingsPage() {
  const router = useRouter();
  const [mode, setMode] = useState<WavePayoutMode>("business");
  const [payLink, setPayLink] = useState("");
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [saving, setSaving] = useState(false);
  const country = getCountryByIso(countryIso);

  useEffect(() => {
    api<{ user: UserProfile }>("/api/profile")
      .then((p) => {
        const u = p.user;
        if (!u) return;
        const resolved = resolveWavePayoutMode({
          mode: u.wave_payout_mode,
          wavePayLink: u.wave_pay_link,
          wavePhone: u.wave_phone,
        });
        if (resolved) setMode(resolved);
        if (u.wave_pay_link) setPayLink(u.wave_pay_link);
        if (u.wave_phone) {
          const iso = isoFromE164(u.wave_phone) || DEFAULT_COUNTRY_ISO;
          setCountryIso(iso);
          setNational(nationalFromE164(u.wave_phone, iso));
        }
      })
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, string | null> = {
      wave_payout_mode: mode,
    };

    if (mode === "business") {
      if (!normalizeWavePayLink(payLink)) {
        toast.error(
          "Collez un lien Wave Business : https://pay.wave.com/m/M_…/c/ci/"
        );
        return;
      }
      payload.wave_pay_link = payLink.trim();
      payload.wave_phone = null;
    } else {
      if (!isValidNational(country, national)) {
        toast.error(
          `Numéro invalide (${country.nationalLength} chiffres pour ${country.name})`
        );
        return;
      }
      const phone = normalizeWavePhone(buildE164(country, national));
      if (!phone) {
        toast.error("Numéro Wave invalide");
        return;
      }
      payload.wave_phone = phone;
      payload.wave_pay_link = null;
    }

    setSaving(true);
    try {
      await api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      toast.success(
        mode === "business"
          ? "Mode Wave Business enregistré"
          : "Mode numéro Wave enregistré"
      );
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
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Recevoir via Wave</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Choisissez <strong className="font-semibold text-foreground">un seul mode</strong>.
          Les contributions sont versées directement chez vous. Mastercota ne
          conserve pas les fonds et prélève 0&nbsp;% sur les contributions.
          Aujourd’hui, la réception est assurée via Wave.
        </p>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => setMode("business")}
          className={cn(
            "rounded-2xl border px-4 py-4 text-left transition",
            mode === "business"
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-secondary/40"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-ink">Avec Wave Business</p>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Recommandé
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Lien pay.wave.com, parcours plus simple et montant prérempli.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setMode("phone")}
          className={cn(
            "rounded-2xl border px-4 py-4 text-left transition",
            mode === "phone"
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:bg-secondary/40"
          )}
        >
          <p className="font-semibold text-ink">Sans Business (numéro Wave)</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Compte perso : le contributeur copie le numéro et saisit le montant
            dans Wave.
          </p>
        </button>
      </div>

      {mode === "business" ? <WaveBusinessGuide /> : null}

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        {mode === "business" ? (
          <div className="space-y-2">
            <Label htmlFor="payLink">Lien Wave Business</Label>
            <Input
              id="payLink"
              value={payLink}
              onChange={(e) => setPayLink(e.target.value)}
              placeholder="https://pay.wave.com/m/M_…/c/ci/"
              required
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Votre numéro Wave</Label>
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
              Affiché aux contributeurs pour qu’ils vous envoient l’argent
              manuellement.
            </p>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
