import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSiteChrome, type LandingContent } from "@/lib/site";

export default async function LandingPage() {
  const { config } = await getSiteChrome();
  const landing: LandingContent = config.landing ?? {
    hero_title: "Cotisez ensemble, facilement",
    hero_subtitle: "Créez, partagez, collectez.",
    cta_primary: "Commencer",
    cta_secondary: "En savoir plus",
    features: [],
  };

  return (
    <div>
      {/* Hero — une composition, marque dominante */}
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
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-3 md:px-6">
          {(landing.features ?? []).map((f) => (
            <div key={f.title} className="space-y-2">
              <h2 className="text-xl font-bold text-ink">{f.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 md:flex-row md:items-center md:px-6">
          <div>
            <h2 className="text-2xl font-extrabold text-ink md:text-3xl">
              Prêt à lancer votre caisse ?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Connexion par WhatsApp, configuration en moins de 2 minutes.
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
