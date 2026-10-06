import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { HowItWorksSteps } from "@/components/how-it-works";
import { Reveal } from "@/components/motion";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description:
    "Quatre étapes pour créer une cotisation WhatsApp et recevoir sur Wave avec Mastercota.",
};

export default function CommentCaMarchePage() {
  return (
    <div>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Comment ça marche
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
              Quatre étapes, sans surprise
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Vous créez une page, vous la partagez, vos proches paient via Wave.
              L’argent arrive chez vous, pas dans Mastercota.
            </p>
          </Reveal>

          <HowItWorksSteps />

          <Reveal
            delayMs={200}
            className="mt-12 flex flex-col gap-3 sm:mt-16 sm:flex-row sm:flex-wrap"
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/phone">
                Créer ma cotisation (gratuit 35 jours)
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Link href="/frais">Voir les frais</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
