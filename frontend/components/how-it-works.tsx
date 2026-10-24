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
    title: "2. Configurez la réception",
    body: "Les contributions sont versées directement chez vous. Aujourd’hui, Mastercota prend en charge Wave Business ou un numéro Wave.",
  },
  {
    icon: Share2,
    title: "3. Créez et partagez la cotisation",
    body: "Ajoutez un titre, un objectif et une durée, puis partagez le lien dans votre groupe. Les participants n’ont pas besoin de compte.",
  },
  {
    icon: LineChart,
    title: "4. Gardez le suivi fiable",
    body: "Après son transfert, le participant le signale. Vous vérifiez la réception puis vous confirmez : seuls les montants confirmés alimentent le total.",
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
