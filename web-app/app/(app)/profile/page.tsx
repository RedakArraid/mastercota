"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import type { SiteConfig, UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("site_config").select("*").eq("id", 1).maybeSingle(),
      ]);
      setProfile((p as UserProfile) ?? null);
      setConfig((c as SiteConfig) ?? null);
      setName((p as UserProfile | null)?.name ?? "");
    }
    load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");
      const { error } = await supabase.from("users").upsert({
        id: user.id,
        phone: user.phone ?? profile?.phone,
        name: name.trim(),
      });
      if (error) throw error;
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/phone");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Compte
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">Profil</h1>
      </div>

      <form
        onSubmit={saveProfile}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input value={profile?.phone ?? ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nom affiché</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-2 font-semibold">Compte de retrait</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {profile?.paystack_subaccount_id
            ? "Sous-compte Paystack configuré."
            : "Configurez Wave, MTN, Orange ou une banque pour recevoir les fonds."}
        </p>
        <Button asChild variant="secondary">
          <Link href="/profile/payout">Paramètres de retrait</Link>
        </Button>
      </div>

      {config ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <Separator />
          <p>Support : {config.email_support || "support@mastercota.com"}</p>
          {config.doc_cgu_url ? (
            <a href={config.doc_cgu_url} className="text-primary underline">
              CGU
            </a>
          ) : null}
          {config.doc_privacy_url ? (
            <a href={config.doc_privacy_url} className="ml-3 text-primary underline">
              Confidentialité
            </a>
          ) : null}
        </div>
      ) : null}

      <Button variant="destructive" onClick={signOut}>
        Se déconnecter
      </Button>
    </div>
  );
}
