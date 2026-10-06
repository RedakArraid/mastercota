import {
  MessageCircle,
  Wallet,
  Share2,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/motion";

export const HOW_IT_WORKS_STEPS: {
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    icon: MessageCircle,
    title: "1. Connectez-vous avec WhatsApp",
    body: "Entrez votre numéro. Vous recevez un code à 6 chiffres. Pas de mot de passe.",
  },
  {
    icon: Wallet,
    title: "2. Dites comment vous voulez être payé",
    body: "Recommandé : Wave Business, vos proches paient en un clic. Sinon : votre numéro Wave, ils envoient à la main.",
  },
  {
    icon: Share2,
    title: "3. Créez la cotisation et partagez le lien",
    body: "Titre, objectif, durée. Vous envoyez le lien sur WhatsApp. Personne n’a besoin de compte pour contribuer.",
  },
  {
    icon: LineChart,
    title: "4. Confirmez les paiements",
    body: "Après Wave, le proche clique « J’ai payé ». Vous vérifiez, vous validez d’un tap. Le total se met à jour.",
  },
];

export function HowItWorksSteps({
  animated = true,
}: {
  animated?: boolean;
}) {
  return (
    <ol className="mt-10 space-y-8 sm:mt-14 sm:space-y-10 md:space-y-14">
      {HOW_IT_WORKS_STEPS.map((step, i) => {
        const Icon = step.icon;
        const inner = (
          <div className="flex gap-4 sm:gap-5 md:gap-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:h-12 sm:w-12">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 max-w-2xl">
              <h3 className="text-lg font-bold text-ink sm:text-xl md:text-2xl">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
                {step.body}
              </p>
            </div>
          </div>
        );
        if (!animated) {
          return <li key={step.title}>{inner}</li>;
        }
        return (
          <Reveal key={step.title} delayMs={i * 120} as="li">
            {inner}
          </Reveal>
        );
      })}
    </ol>
  );
}
