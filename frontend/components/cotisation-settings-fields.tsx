"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCY } from "@/lib/constants";
import type { CotisationSettings } from "@/lib/types";

export type SettingsFormValue = Required<
  Pick<
    CotisationSettings,
    | "show_progress"
    | "show_target_amount"
    | "show_contributors"
    | "show_best_contributor"
    | "anonymous_allowed"
    | "min_amount"
  >
> & { share_message: string };

export const defaultSettingsForm = (): SettingsFormValue => ({
  show_progress: true,
  show_target_amount: true,
  show_contributors: true,
  show_best_contributor: true,
  anonymous_allowed: false,
  min_amount: 0,
  share_message: "",
});

export function settingsFromCotisation(
  s: CotisationSettings | null | undefined
): SettingsFormValue {
  return {
    show_progress: s?.show_progress !== false,
    show_target_amount: s?.show_target_amount !== false,
    show_contributors: s?.show_contributors !== false,
    show_best_contributor: s?.show_best_contributor !== false,
    anonymous_allowed: s?.anonymous_allowed === true,
    min_amount: Number(s?.min_amount ?? 0) || 0,
    share_message: s?.share_message ?? "",
  };
}

export function settingsToPayload(v: SettingsFormValue): CotisationSettings {
  return {
    show_progress: v.show_progress,
    show_target_amount: v.show_target_amount,
    show_contributors: v.show_contributors,
    show_best_contributor: v.show_best_contributor,
    anonymous_allowed: v.anonymous_allowed,
    min_amount: Number(v.min_amount) || 0,
    share_message: v.share_message.trim() || null,
  };
}

function Row({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function CotisationSettingsFields({
  value,
  onChange,
}: {
  value: SettingsFormValue;
  onChange: (next: SettingsFormValue) => void;
}) {
  return (
    <div className="space-y-1 divide-y divide-border">
      <Row
        label="Afficher la progression"
        hint="Barre de progression sur la page publique"
        checked={value.show_progress}
        onCheckedChange={(show_progress) => onChange({ ...value, show_progress })}
      />
      <Row
        label="Afficher l'objectif"
        hint="Montant cible visible pour les contributeurs"
        checked={value.show_target_amount}
        onCheckedChange={(show_target_amount) =>
          onChange({ ...value, show_target_amount })
        }
      />
      <Row
        label="Liste des contributeurs"
        hint="Noms et montants sur la page publique"
        checked={value.show_contributors}
        onCheckedChange={(show_contributors) =>
          onChange({ ...value, show_contributors })
        }
      />
      <Row
        label="Meilleur contributeur"
        hint="Mettre en avant le plus gros don"
        checked={value.show_best_contributor}
        onCheckedChange={(show_best_contributor) =>
          onChange({ ...value, show_best_contributor })
        }
      />
      <Row
        label="Contribution anonyme"
        hint="Le nom devient optionnel"
        checked={value.anonymous_allowed}
        onCheckedChange={(anonymous_allowed) =>
          onChange({ ...value, anonymous_allowed })
        }
      />
      <div className="space-y-2 py-3">
        <Label htmlFor="min_amount">Montant minimum ({CURRENCY})</Label>
        <Input
          id="min_amount"
          inputMode="numeric"
          value={value.min_amount || ""}
          onChange={(e) =>
            onChange({
              ...value,
              min_amount: Number(e.target.value.replace(/\D/g, "")) || 0,
            })
          }
          placeholder="0 = pas de minimum"
        />
      </div>
      <div className="space-y-2 py-3">
        <Label htmlFor="share_message">Message de partage</Label>
        <Textarea
          id="share_message"
          rows={3}
          value={value.share_message}
          onChange={(e) =>
            onChange({ ...value, share_message: e.target.value })
          }
          placeholder="Ex. Soutenez notre projet — merci !"
        />
      </div>
    </div>
  );
}
