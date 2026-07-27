"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  published: boolean;
  nav_label: string;
  nav_placement: string;
  sort_order: number;
};

export default function AdminPagesPage() {
  const [pages, setPages] = useState<PageRow[]>([]);
  const [selected, setSelected] = useState<PageRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await api<{ pages: PageRow[] }>("/api/admin/pages");
      setPages(data.pages);
      if (selected) {
        setSelected(data.pages.find((p) => p.id === selected.id) ?? null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const { page } = await api<{ page: PageRow }>(
        `/api/admin/pages/${selected.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: selected.title,
            excerpt: selected.excerpt,
            body_md: selected.body_md,
            published: selected.published,
            nav_label: selected.nav_label,
            nav_placement: selected.nav_placement,
            sort_order: selected.sort_order,
          }),
        }
      );
      toast.success("Page enregistrée");
      setSelected(page);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Pages CMS</h2>
        <p className="text-sm text-muted-foreground">
          Contenu des pages légales et « Comment ça marche ».
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-1">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                selected?.id === p.id
                  ? "bg-zinc-900 text-white"
                  : "hover:bg-zinc-100"
              }`}
            >
              {p.title}
              <span className="mt-0.5 block text-xs opacity-70">/{p.slug}</span>
            </button>
          ))}
        </div>
        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle>{selected.slug}</CardTitle>
              <CardDescription>Markdown supporté dans le corps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input
                  value={selected.title}
                  onChange={(e) =>
                    setSelected({ ...selected, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Extrait</Label>
                <Input
                  value={selected.excerpt}
                  onChange={(e) =>
                    setSelected({ ...selected, excerpt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Corps (Markdown)</Label>
                <Textarea
                  rows={14}
                  value={selected.body_md}
                  onChange={(e) =>
                    setSelected({ ...selected, body_md: e.target.value })
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={selected.published}
                  onCheckedChange={(published) =>
                    setSelected({ ...selected, published })
                  }
                />
                <Label>Publiée</Label>
              </div>
              <Button onClick={save} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sélectionnez une page à modifier.
          </p>
        )}
      </div>
    </div>
  );
}
