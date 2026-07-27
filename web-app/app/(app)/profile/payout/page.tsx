"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { PAYOUT_PROVIDERS } from "@/lib/constants";

export default function PayoutSettingsPage() {
  const [provider, setProvider] = useState<string>(PAYOUT_PROVIDERS[0].code);
  const [account, setAccount] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  async function verify() {
    if (!account.trim()) {
      toast.error("Saisissez le numéro de compte");
      return;
    }
    setVerifying(true);
    setVerifiedName(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "paystack-verify-account",
        {
          body: {
            account_number: account.trim(),
            bank_code: provider,
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const name = (data?.account_name as string) ?? "";
      setVerifiedName(name);
      if (!businessName.trim()) setBusinessName(name);
      toast.success("Compte vérifié");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vérification échouée");
    } finally {
      setVerifying(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !account.trim()) {
      toast.error("Nom et numéro requis");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke(
        "paystack-subaccount",
        {
          body: {
            business_name: businessName.trim(),
            settlement_bank: provider,
            account_number: account.trim(),
          },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Compte de versement configuré");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Configuration échouée");
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
        <h1 className="text-3xl font-extrabold text-ink">Retrait</h1>
        <p className="mt-2 text-muted-foreground">
          Mobile Money ou banque pour recevoir les contributions (moins 1&nbsp;%).
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label>Opérateur / banque</Label>
          <Select
            value={provider}
            onValueChange={(v) => {
              setProvider(v);
              setVerifiedName(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {PAYOUT_PROVIDERS.map((p) => (
                <SelectItem key={p.code} value={p.code}>
                  {p.name} ({p.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="account">Numéro de compte</Label>
          <div className="flex gap-2">
            <Input
              id="account"
              value={account}
              onChange={(e) => {
                setAccount(e.target.value);
                setVerifiedName(null);
              }}
              placeholder="07XXXXXXXX"
              className="flex-1"
              required
            />
            <Button
              type="button"
              variant="secondary"
              onClick={verify}
              disabled={verifying}
            >
              {verifying ? "…" : "Vérifier"}
            </Button>
          </div>
          {verifiedName ? (
            <p className="text-sm text-success">✓ {verifiedName}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="business">Nom du bénéficiaire</Label>
          <Input
            id="business"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer le sous-compte"}
        </Button>
      </form>
    </div>
  );
}
