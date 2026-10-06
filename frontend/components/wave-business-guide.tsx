import { ExternalLink } from "lucide-react";

const PLAY_STORE =
  "https://play.google.com/store/apps/details?id=com.wave.business";
const APP_STORE = "https://apps.apple.com/ci/app/wave-business/id1623089106";

const STEPS = [
  {
    title: "Téléchargez Wave Business",
    detail:
      "App gratuite (Android / iPhone), distincte de Wave perso. Support CI : 1315.",
  },
  {
    title: "Créez votre compte marchand",
    detail:
      "Inscrivez-vous avec votre numéro. C’est gratuit et rapide. Wave le présente pour les petites activités.",
  },
  {
    title: "Créez un lien de paiement",
    detail:
      "Accueil → Demander un paiement / Recevoir → Lien de paiement. Laissez le montant vide (Mastercota l’ajoute).",
  },
  {
    title: "Copiez le lien",
    detail:
      "Il ressemble à pay.wave.com/m/M_…/c/ci/. Collez-le ci-dessous une seule fois.",
  },
] as const;

export function WaveBusinessGuide({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "space-y-3 text-sm"
          : "space-y-4 rounded-2xl border border-border bg-card p-6"
      }
    >
      {!compact ? (
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Comment obtenir le lien (gratuit)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pas besoin de compte API ni de RCCM pour ce parcours. L’app Wave
            Business suffit.
          </p>
        </div>
      ) : null}

      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3 text-sm">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div>
              <p className="font-medium text-ink">{step.title}</p>
              <p className="mt-0.5 text-muted-foreground">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2 pt-1">
        <a
          href={PLAY_STORE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-ink hover:bg-secondary"
        >
          <ExternalLink className="size-3.5" />
          Google Play
        </a>
        <a
          href={APP_STORE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs font-medium text-ink hover:bg-secondary"
        >
          <ExternalLink className="size-3.5" />
          App Store
        </a>
      </div>

      {!compact ? (
        <p className="text-xs text-muted-foreground">
          Frais Wave (pas Mastercota) : les{" "}
          <strong className="font-medium text-foreground">
            20&nbsp;000 F/jour
          </strong>{" "}
          de paiements marchands sont gratuits pour vous, puis environ{" "}
          <strong className="font-medium text-foreground">1&nbsp;%</strong>. Les
          contributeurs ne paient pas de frais Wave sur ce paiement. Retrait
          vers Wave perso / agent : gratuit.
        </p>
      ) : null}
    </div>
  );
}
