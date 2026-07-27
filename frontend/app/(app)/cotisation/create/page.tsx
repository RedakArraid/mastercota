"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { CURRENCY } from "@/lib/constants";
import type { Cotisation } from "@/lib/types";

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
    if (!title.trim() || !targetAmount || !deadline) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ cotisation: Cotisation }>("/api/cotisations", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          target_amount: targetAmount,
          deadline,
          settings: {
            show_best_contributor: true,
            show_contributors: true,
            show_progress: true,
            show_target_amount: true,
            anonymous_allowed: false,
            min_amount: 0,
          },
        }),
      });
      toast.success("Cotisation créée");
      router.push(`/cotisation/${data.cotisation.id}`);
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
