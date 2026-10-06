import Link from "next/link";
import { ShieldCheck, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/motion";
import { HowItWorksSteps } from "@/components/how-it-works";
import { getSiteChrome, type LandingContent } from "@/lib/site";

export default async function LandingPage() {
  const { config } = await getSiteChrome();
  const landing: LandingContent = config.landing ?? {
    hero_title: "Une cotisation WhatsApp. L’argent arrive sur votre Wave.",
    hero_subtitle:
      "Créez une page, partagez le lien. Vos proches paient via Wave. Mastercota prend 0 % sur ce qu’ils envoient.",
    cta_primary: "Créer ma cotisation (gratuit 35 jours)",
    cta_secondary: "Voir les frais",
    features: [],
  };

  return (
    <div className="overflow-x-clip">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(218_152_16_/_22%),transparent),radial-gradient(ellipse_50%_40%_at_100%_0%,rgb(20_50_104_/_12%),transparent)]" />
        <div className="relative mx-auto flex min-h-[min(86dvh,920px)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-24 md:py-32">
          <div className="mc-enter" style={{ ["--mc-delay" as string]: "0ms" }}>
            <Logo href={null} size="lg" className="mb-6 sm:mb-8" />
          </div>
          <h1
            className="mc-enter max-w-3xl text-balance text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-6xl"
            style={{ ["--mc-delay" as string]: "120ms" }}
          >
            {landing.hero_title}
          </h1>
          <p
            className="mc-enter mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg md:text-xl"
            style={{ ["--mc-delay" as string]: "260ms" }}
          >
            {landing.hero_subtitle}
          </p>
          <div
            className="mc-enter mt-8 flex w-full flex-col gap-3 sm:mt-12 sm:w-auto sm:flex-row sm:flex-wrap"
            style={{ ["--mc-delay" as string]: "420ms" }}
          >
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/auth/phone">{landing.cta_primary}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              <Link href="/frais">{landing.cta_secondary}</Link>
            </Button>
          </div>
          <p
            className="mc-enter mt-5 text-sm text-muted-foreground sm:mt-6"
            style={{ ["--mc-delay" as string]: "560ms" }}
          >
            Connexion WhatsApp · Argent direct sur Wave · 0&nbsp;% sur les
            contributions
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-card/50" id="pour-qui">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Pour qui ?
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-extrabold text-ink sm:text-3xl md:text-4xl">
              Vous organisez une cotisation. Vos proches contribuent. Vous voyez
              tout.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:mt-5 md:text-lg">
              Mariage, funérailles, projet… Mastercota n’est pas une banque. Nous
              donnons la page publique et le suivi. L’argent va directement sur
              votre Wave.
            </p>
          </Reveal>
        </div>
      </section>

      <section
        id="comment-ca-marche"
        className="scroll-mt-20 border-t border-border"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Comment ça marche
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-extrabold text-ink sm:text-3xl md:text-4xl">
              Quatre étapes, sans surprise
            </h2>
          </Reveal>

          <HowItWorksSteps />

          <Reveal delayMs={160} className="mt-10">
            <Link
              href="/comment-ca-marche"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Voir le détail →
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Argent & frais
            </p>
            <h2 className="mt-3 max-w-2xl text-2xl font-extrabold text-ink sm:text-3xl md:text-4xl">
              0&nbsp;% sur les contributions. Frais seulement pour la durée.
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-5 sm:mt-12 sm:gap-8 md:grid-cols-2">
            <Reveal delayMs={80}>
              <div className="h-full rounded-2xl border border-border bg-background p-5 sm:p-6 md:p-8">
                <ShieldCheck className="size-6 text-primary" />
                <h3 className="mt-4 text-lg font-bold text-ink sm:text-xl">
                  0&nbsp;% sur les contributions
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Si un proche envoie 10&nbsp;000&nbsp;F, vous recevez
                  10&nbsp;000&nbsp;F sur Wave. Mastercota ne prend aucun
                  pourcentage sur ce montant.
                </p>
              </div>
            </Reveal>
            <Reveal delayMs={180}>
              <div className="h-full rounded-2xl border border-border bg-background p-5 sm:p-6 md:p-8">
                <Clock3 className="size-6 text-primary" />
                <h3 className="mt-4 text-lg font-bold text-ink sm:text-xl">
                  Frais de durée (organisateur)
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Pour garder la page ouverte, l’organisateur paie des frais de
                  durée. La 1re cotisation par téléphone est gratuite 35&nbsp;jours.
                  Ce n’est pas un prélèvement sur les contributions.
                </p>
                <Link
                  href="/frais"
                  className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  Voir les tarifs →
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-24">
          <Reveal>
            <h2 className="max-w-2xl text-2xl font-extrabold text-ink sm:text-3xl md:text-4xl">
              Prêt à lancer votre cotisation ?
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:mt-5 md:text-lg">
              Première cotisation gratuite 35&nbsp;jours. Connexion en une minute
              avec WhatsApp.
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:flex-wrap">
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
                <Link href="/comment-ca-marche">Comment ça marche</Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
