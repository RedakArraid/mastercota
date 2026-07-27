"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  nationalFromE164,
  isoFromE164,
} from "@/lib/countries";
import { formatWaveDisplay, normalizeWavePayLink } from "@/lib/wave";
import type { UserProfile } from "@/lib/types";

export default function PayoutSettingsPage() {
  const router = useRouter();
  const [countryIso, setCountryIso] = useState(DEFAULT_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [payLink, setPayLink] = useState("");
  const [existingPhone, setExistingPhone] = useState<string | null>(null);
  const [existingLink, setExistingLink] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const country = getCountryByIso(countryIso);

  useEffect(() => {
    api<{ user: UserProfile }>("/api/profile")
      .then((p) => {
        const w = p.user?.wave_phone;
        if (w) {
          setExistingPhone(w);
          const iso = isoFromE164(w) || DEFAULT_COUNTRY_ISO;
          setCountryIso(iso);
          setNational(nationalFromE164(w, iso) || "");
        }
        if (p.user?.wave_pay_link) {
          setExistingLink(p.user.wave_pay_link);
          setPayLink(p.user.wave_pay_link);
        }
      })
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const hasPhone = national.trim().length > 0;
    const hasLink = payLink.trim().length > 0;
    if (!hasPhone && !hasLink) {
      toast.error("Ajoutez le lien Wave et/ou le numéro");
      return;
    }
    if (hasPhone && !isValidNational(country, national)) {
      toast.error(
        `Numéro invalide — ${country.nationalLength} chiffres (${country.name})`
      );
      return;
    }
    if (hasLink && !normalizeWavePayLink(payLink)) {
      toast.error("Lien invalide — format attendu : https://pay.wave.com/m/…");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      if (hasPhone) payload.wave_phone = buildE164(country, national);
      if (hasLink) payload.wave_pay_link = payLink.trim();
      const data = await api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setExistingPhone(data.user.wave_phone ?? null);
      setExistingLink(data.user.wave_pay_link ?? null);
      toast.success("Wave enregistré");
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
          Pour un paiement <strong>automatique</strong> (montant prérempli),
          ajoutez votre <strong>lien de paiement Wave</strong>. Le numéro sert
          de secours.
        </p>
      </div>

      {(existingLink || existingPhone) && (
        <div className="space-y-2 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm">
          {existingLink ? (
            <div>
              <p className="font-medium text-ink">Lien actuel</p>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {existingLink}
              </p>
            </div>
          ) : null}
          {existingPhone ? (
            <div>
              <p className="font-medium text-ink">Numéro actuel</p>
              <p className="mt-1 text-lg font-semibold">
                {formatWaveDisplay(existingPhone)}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="payLink">Lien de paiement Wave (recommandé)</Label>
          <Input
            id="payLink"
            value={payLink}
            onChange={(e) => setPayLink(e.target.value)}
            placeholder="https://pay.wave.com/m/…"
          />
          <p className="text-xs text-muted-foreground">
            Dans Wave → Recevoir → créer un lien de paiement, puis collez-le
            ici. Les contributeurs ouvriront Wave avec le montant déjà saisi.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Numéro Wave (secours)</Label>
          <PhoneInput
            countryIso={countryIso}
            onCountryChange={(iso) => {
              setCountryIso(iso);
              setNational("");
            }}
            national={national}
            onNationalChange={setNational}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </div>
  );
}
