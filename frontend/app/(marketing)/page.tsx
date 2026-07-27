import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSiteChrome, type LandingContent } from "@/lib/site";

export default async function LandingPage() {
  const { config } = await getSiteChrome();
  const landing: LandingContent = config.landing ?? {
    hero_title: "Cotisez ensemble, facilement",
    hero_subtitle:
      "Créez une cotisation, partagez un lien, recevez via Mobile Money. Pensé pour l'Afrique.",
    cta_primary: "Créer une cotisation",
    cta_secondary: "Comment ça marche",
    features: [
      {
        title: "Lien public",
        body: "Partagez votre page sur WhatsApp. Contribution sans compte.",
      },
      {
        title: "Mobile Money",
        body: "Wave en direct — argent immédiat chez l’organisateur, suivi transparent.",
      },
      {
        title: "Suivi en direct",
        body: "Progression et contributeurs mis à jour en continu.",
      },
    ],
  };

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(218_152_16_/_22%),transparent),radial-gradient(ellipse_50%_40%_at_100%_0%,rgb(20_50_104_/_12%),transparent)]" />
        <div className="relative mx-auto flex min-h-[78dvh] max-w-6xl flex-col justify-center px-4 py-20 md:px-6 md:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Mastercota
          </p>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-ink md:text-6xl">
            {landing.hero_title}
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground md:text-xl">
            {landing.hero_subtitle}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/auth/phone">{landing.cta_primary}</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/p/comment-ca-marche">{landing.cta_secondary}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <h2 className="max-w-xl text-2xl font-extrabold text-ink md:text-3xl">
            Tout ce qu&apos;il faut pour une cotisation réussie
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {(landing.features ?? []).map((f, i) => (
              <div key={f.title} className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  0{i + 1}
                </p>
                <h3 className="text-xl font-bold text-ink">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3 md:px-6">
          {[
            {
              title: "1. Créez",
              body: "Objectif, date limite et réglages de la page publique en quelques minutes.",
            },
            {
              title: "2. Partagez",
              body: "Un lien unique à envoyer sur WhatsApp, SMS ou réseaux sociaux.",
            },
            {
              title: "3. Recevez",
              body: "Les fonds arrivent sur votre Mobile Money ou compte bancaire.",
            },
          ].map((s) => (
            <div key={s.title} className="space-y-2">
              <h3 className="text-lg font-bold text-ink">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-[linear-gradient(135deg,rgb(20_50_104_/_08%),rgb(218_152_16_/_12%))]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-2xl font-extrabold text-ink md:text-3xl">
              Prêt à lancer votre caisse ?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Connexion WhatsApp, configuration en moins de 2 minutes. Frais
              ~3&nbsp;% payés par le contributeur.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/auth/phone">Ouvrir un compte</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
