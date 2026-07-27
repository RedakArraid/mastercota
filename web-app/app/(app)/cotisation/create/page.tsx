"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { CURRENCY } from "@/lib/constants";
import { generateSlug } from "@/lib/format";

export default function CreateCotisationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetAmount = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!title.trim()) {
      toast.error("Titre requis");
      return;
    }
    if (!targetAmount || targetAmount <= 0) {
      toast.error("Objectif invalide");
      return;
    }
    if (!deadline) {
      toast.error("Date limite requise");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expirée");

      await supabase.from("users").upsert(
        { id: user.id, phone: user.phone ?? null },
        { onConflict: "id" }
      );

      const slug = generateSlug(title);
      const { data, error } = await supabase
        .from("cotisations")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          target_amount: targetAmount,
          current_amount: 0,
          deadline,
          owner_id: user.id,
          slug,
          status: "active",
          settings: {
            show_best_contributor: true,
            show_contributors: true,
            show_progress: true,
            show_target_amount: true,
            anonymous_allowed: false,
            min_amount: 0,
          },
        })
        .select("id")
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          throw new Error("Ce titre existe déjà. Essayez un autre.");
        }
        throw error;
      }
      toast.success("Cotisation créée");
      router.push(`/cotisation/${data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Nouvelle caisse
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-ink">
          Créer une cotisation
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="title">Titre</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Mariage de Aya"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexte pour vos contributeurs"
            rows={4}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="target">Objectif ({CURRENCY})</Label>
            <Input
              id="target"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="500000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Date limite</Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
            />
          </div>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Création…" : "Créer"}
        </Button>
      </form>
    </div>
  );
}
