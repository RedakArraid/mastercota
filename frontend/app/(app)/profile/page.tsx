"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { SiteConfig, UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, c] = await Promise.all([
          api<{ user: UserProfile }>("/api/profile"),
          api<{ config: SiteConfig }>("/api/site-config"),
        ]);
        setProfile(p.user);
        setConfig(c.config);
        setName(p.user?.name ?? "");
      } catch {
        setLoadError(true);
      }
    }
    load();
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      setProfile(data.user);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/auth/phone");
    router.refresh();
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <p className="text-muted-foreground">Impossible de charger le profil.</p>
        <Button onClick={() => window.location.reload()}>Réessayer</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Compte
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">Profil</h1>
        <p className="mt-2 text-muted-foreground">
          Gérez votre identité et vos paramètres de versement.
        </p>
      </div>

      <form
        onSubmit={saveProfile}
        className="space-y-4 rounded-2xl border border-border bg-card p-6"
      >
        <div className="space-y-2">
          <Label>Téléphone</Label>
          <Input value={profile?.phone ?? "…"} disabled />
          <p className="text-xs text-muted-foreground">
            Identifiant WhatsApp — non modifiable.
          </p>
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
        <h2 className="mb-2 font-semibold">Compte de versement</h2>
        <p className="mb-1 text-sm text-muted-foreground">
          {profile?.paystack_subaccount_id
            ? "Vos contributions seront versées automatiquement (frais de service ~3 % payés par le contributeur)."
            : "Configurez Wave, MTN, Orange ou une banque pour recevoir les fonds."}
        </p>
        {profile?.paystack_subaccount_id ? (
          <p className="mb-4 font-mono text-xs text-muted-foreground break-all">
            ID : {profile.paystack_subaccount_id}
          </p>
        ) : (
          <div className="mb-4" />
        )}
        <Button asChild variant="secondary">
          <Link href="/profile/payout">
            {profile?.paystack_subaccount_id
              ? "Modifier le compte"
              : "Configurer le retrait"}
          </Link>
        </Button>
      </div>

      {config ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <Separator />
          <p>
            Support :{" "}
            <a
              className="text-foreground hover:text-primary"
              href={`mailto:${config.email_support || "support@mastercota.com"}`}
            >
              {config.email_support || "support@mastercota.com"}
            </a>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/p/cgu" className="hover:text-primary">
              CGU
            </Link>
            <Link href="/p/confidentialite" className="hover:text-primary">
              Confidentialité
            </Link>
            <Link href="/p/mentions-legales" className="hover:text-primary">
              Mentions légales
            </Link>
          </div>
        </div>
      ) : null}

      <Button variant="destructive" onClick={signOut}>
        Se déconnecter
      </Button>
    </div>
  );
}
