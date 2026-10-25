"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, LockKeyhole, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AcademyCourse } from "@/lib/types";

export default function CreateAcademyCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Général");
  const [level, setLevel] = useState<AcademyCourse["level"]>("all");
  const [accessType, setAccessType] = useState<AcademyCourse["access_type"]>("free");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCourse(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Ajoutez un titre");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ course: AcademyCourse }>("/api/academy/instructor/courses", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          category: category.trim() || "Général",
          level,
          access_type: accessType,
          price: accessType === "paid" ? Number(price || 0) : 0,
        }),
      });
      toast.success("Cours créé");
      router.push(`/teach/${data.course.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création impossible");
      setLoading(false);
    }
  }

  return (
    <div className="mc-page">
      <div className="mx-auto max-w-3xl space-y-7">
        <header>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-ink">
            <Sparkles className="size-3.5 text-primary" />
            Nouveau cours
          </div>
          <h1 className="mt-4 mc-page-title">Posez les bases de votre programme.</h1>
          <p className="mt-3 max-w-2xl mc-body">
            Créez le cours en brouillon. Vous ajouterez ensuite sections, leçons, quiz, coupons et invitations avant publication.
          </p>
        </header>

        <form onSubmit={createCourse} className="mc-panel p-5 sm:p-7">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du cours</Label>
              <Input id="title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex. Marketing WhatsApp de A à Z" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subtitle">Promesse courte</Label>
              <Input id="subtitle" value={subtitle} onChange={event => setSubtitle(event.target.value)} placeholder="Ce que l’apprenant saura faire à la fin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={event => setDescription(event.target.value)} rows={6} placeholder="Objectifs, public cible, méthode, résultats attendus…" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Input id="category" value={category} onChange={event => setCategory(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Niveau</Label>
                <select id="level" value={level} onChange={event => setLevel(event.target.value as AcademyCourse["level"])} className="h-11 w-full rounded-xl border border-input bg-white px-3.5 text-sm">
                  <option value="all">Tous niveaux</option>
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                  <option value="advanced">Avancé</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Modèle d’accès</Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {[
                  ["free", BookOpen, "Gratuit", "Inscription immédiate"],
                  ["paid", Wallet, "Payant", "Paiement direct à l’instructeur"],
                  ["invite", LockKeyhole, "Privé", "Accès par code d’invitation"],
                ].map(([value, Icon, label, body]) => {
                  const I = Icon as typeof BookOpen;
                  const selected = accessType === value;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setAccessType(value as AcademyCourse["access_type"])}
                      className={`rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-accent/70" : "border-border bg-white hover:border-primary/30"}`}
                    >
                      <I className="size-5 text-primary" />
                      <p className="mt-2 text-sm font-bold text-ink">{String(label)}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{String(body)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {accessType === "paid" ? (
              <div className="space-y-2">
                <Label htmlFor="price">Prix du cours (FCFA)</Label>
                <Input id="price" inputMode="numeric" value={price} onChange={event => setPrice(event.target.value)} placeholder="15000" required />
                <p className="text-xs text-muted-foreground">Le paiement sera envoyé directement à votre mode de réception configuré dans Mastercota.</p>
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Création…" : "Créer le brouillon et construire le cours"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
