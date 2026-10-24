"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, ShieldCheck, Trash2, UserRound, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { SiteConfig, UserProfile } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [profileData, configData] = await Promise.all([
          api<{ user: UserProfile }>("/api/profile"),
          api<{ config: SiteConfig }>("/api/site-config"),
        ]);
        setProfile(profileData.user);
        setConfig(configData.config);
        setName(profileData.user?.name ?? "");
      } catch {
        setLoadError(true);
      }
    }
    load();
  }, []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await api<{ user: UserProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      });
      setProfile(data.user);
      toast.success("Profil mis à jour");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/auth/phone");
    router.refresh();
  }

  async function deleteAccount() {
    if (deleteText.trim() !== "SUPPRIMER" || deleting) return;
    setDeleting(true);
    try {
      await api("/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ confirmation: "SUPPRIMER" }),
      });
      toast.success("Votre compte a été supprimé");
      router.replace("/auth/phone");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible");
      setDeleting(false);
    }
  }


  if (loadError) {
    return (
      <div className="mc-page py-16 text-center">
        <div className="mc-empty mx-auto max-w-xl">
          <p className="font-semibold text-ink">Impossible de charger le profil.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const waveConfigured = Boolean(profile?.wave_pay_link || profile?.wave_phone);

  return (
    <div className="mc-page">
      <div className="mx-auto max-w-3xl space-y-7">
        <header>
          <p className="mc-kicker">Compte</p>
          <h1 className="mt-1 mc-page-title">Votre profil Mastercota</h1>
          <p className="mt-3 max-w-2xl mc-body">
            Gérez votre identité, la réception des contributions et les informations
            utiles liées à votre compte.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-[1.05fr_.95fr]">
          <form onSubmit={saveProfile} className="mc-panel p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-ink">
                <UserRound className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-ink">Identité</h2>
                <p className="text-sm text-muted-foreground">
                  Ce nom peut apparaître sur vos pages publiques.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="font-semibold text-ink">Téléphone</Label>
                <Input value={profile?.phone ?? "…"} disabled />
                <p className="text-xs leading-5 text-muted-foreground">
                  Votre numéro WhatsApp sert d’identifiant de connexion.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="font-semibold text-ink">
                  Nom affiché
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Votre nom"
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>

          <section className="mc-panel overflow-hidden">
            <div className="bg-[linear-gradient(145deg,#143268_0%,#214b86_100%)] p-5 text-white sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-white/10 text-gold-bright">
                  <Wallet className="size-5" />
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/70">
                  <span className={waveConfigured ? "mc-status-dot" : "size-2 rounded-full bg-amber-400"} />
                  {waveConfigured ? "Configuré" : "À configurer"}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold">Recevoir les contributions</h2>
              <p className="mt-2 text-sm leading-6 text-white/60">
                {profile?.wave_payout_mode === "phone" ||
                (!profile?.wave_pay_link && profile?.wave_phone)
                  ? "Mode numéro Wave : les participants envoient manuellement au numéro enregistré."
                  : profile?.wave_pay_link
                    ? "Mode Wave Business : paiement en un clic avec montant prérempli."
                    : "Configurez votre mode de réception avant de partager une cotisation."}
              </p>
            </div>

            <div className="p-5 sm:p-6">
              {profile?.wave_pay_link ? (
                <div className="mb-4 rounded-2xl bg-secondary/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Lien de réception
                  </p>
                  <p className="mt-1 break-all text-xs font-medium text-ink">
                    {profile.wave_pay_link}
                  </p>
                </div>
              ) : null}
              {profile?.wave_phone ? (
                <div className="mb-4 rounded-2xl bg-secondary/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Numéro de réception
                  </p>
                  <p className="mt-1 font-bold text-ink">{profile.wave_phone}</p>
                </div>
              ) : null}

              <Button asChild variant={waveConfigured ? "outline" : "default"} className="w-full">
                <Link href="/profile/payout">
                  {waveConfigured ? "Modifier la réception" : "Configurer la réception"}
                </Link>
              </Button>
            </div>
          </section>
        </div>

        <section className="mc-panel p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-bold text-ink">Compte & assistance</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Retrouvez les informations légales et contactez le support si un
                paiement ou une cotisation nécessite une vérification.
              </p>
            </div>
          </div>

          {config ? (
            <>
              <Separator className="my-5" />
              <div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <a
                  id="support"
                  href={`mailto:${config.email_support || "support@mastercota.com"}`}
                  className="font-semibold text-ink hover:text-primary"
                >
                  {config.email_support || "support@mastercota.com"}
                </a>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-muted-foreground">
                  <Link href="/p/cgu" className="hover:text-primary">CGU</Link>
                  <Link href="/p/confidentialite" className="hover:text-primary">Confidentialité</Link>
                  <Link href="/p/mentions-legales" className="hover:text-primary">Mentions légales</Link>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section id="delete-account" className="mc-panel border-destructive/20 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-ink">Supprimer le compte</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                Supprime définitivement votre compte, vos cotisations et les données
                associées. Les contributions déjà confirmées chez d’autres organisateurs
                sont conservées sans vos informations personnelles afin de préserver leurs totaux.
              </p>
            </div>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="shrink-0">
              <Trash2 className="size-4" />
              Supprimer mon compte
            </Button>
          </div>
        </section>

        <div className="flex justify-end">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="size-4" />
            Se déconnecter
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(open) => {
        setDeleteOpen(open);
        if (!open) setDeleteText("");
      }}>
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Supprimer définitivement votre compte ?</DialogTitle>
            <DialogDescription>
              Cette action ne peut pas être annulée. Tapez SUPPRIMER pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteText}
            onChange={(event) => setDeleteText(event.target.value)}
            placeholder="SUPPRIMER"
            autoComplete="off"
            disabled={deleting}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteText.trim() !== "SUPPRIMER" || deleting}
              onClick={deleteAccount}
            >
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
