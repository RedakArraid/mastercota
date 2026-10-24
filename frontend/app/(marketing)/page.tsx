import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Reveal } from "@/components/motion";
import { HowItWorksSteps } from "@/components/how-it-works";
import { getSiteChrome, type LandingContent } from "@/lib/site";

export default async function LandingPage() {
  const { config } = await getSiteChrome();
  const landing: LandingContent = config.landing ?? {
    hero_title: "Organisez votre cotisation. Gardez le suivi clair.",
    hero_subtitle:
      "Créez une page, partagez-la dans votre groupe et suivez les contributions au même endroit. L’argent va directement à l’organisateur : Mastercota prend 0 % sur les contributions.",
    cta_primary: "Créer ma première cotisation",
    cta_secondary: "Comment ça marche",
    features: [],
  };

  return (
    <div className="overflow-x-clip bg-[linear-gradient(180deg,#fffdf8_0%,#fafbfd_28%,#fafbfd_100%)]">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_78%_54%_at_40%_-8%,rgb(244_184_41_/_24%),transparent_66%),radial-gradient(ellipse_42%_32%_at_100%_8%,rgb(20_50_104_/_10%),transparent_72%)]" />

        <div className="relative mx-auto grid min-h-[min(90dvh,940px)] max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
          <div>
            <div className="mc-enter" style={{ ["--mc-delay" as string]: "0ms" }}>
              <Logo href={null} size="md" className="mb-8" />
            </div>

            <div
              className="mc-enter inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/75 px-3 py-1.5 text-xs font-bold text-ink shadow-sm backdrop-blur"
              style={{ ["--mc-delay" as string]: "80ms" }}
            >
              <Sparkles className="size-3.5 text-primary" />
              La cotisation de groupe, sans listes ni captures d’écran
            </div>

            <h1
              className="mc-enter mt-5 max-w-4xl text-balance text-4xl font-extrabold tracking-[-0.055em] text-ink sm:text-5xl lg:text-6xl xl:text-7xl"
              style={{ ["--mc-delay" as string]: "140ms" }}
            >
              {landing.hero_title}
            </h1>

            <p
              className="mc-enter mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8"
              style={{ ["--mc-delay" as string]: "260ms" }}
            >
              {landing.hero_subtitle}
            </p>

            <div
              className="mc-enter mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              style={{ ["--mc-delay" as string]: "380ms" }}
            >
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/auth/phone">
                  {landing.cta_primary}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/frais">{landing.cta_secondary}</Link>
              </Button>
            </div>

            <div
              className="mc-enter mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground sm:text-sm"
              style={{ ["--mc-delay" as string]: "500ms" }}
            >
              {[
                "0 % sur les contributions",
                "Fonds versés directement à l’organisateur",
                "Pensé pour les groupes WhatsApp",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <span className="grid size-5 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <Check className="size-3" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            className="mc-enter relative mx-auto w-full max-w-xl lg:mx-0"
            style={{ ["--mc-delay" as string]: "220ms" }}
          >
            <div className="absolute -inset-6 rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_40%,rgb(244_184_41_/_22%),transparent_65%)] blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 p-4 shadow-[0_40px_90px_-46px_rgb(20_50_104_/_65%)] backdrop-blur sm:p-6">
              <div className="rounded-[1.55rem] bg-[linear-gradient(145deg,#143268_0%,#204a86_100%)] p-5 text-white sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                      Cotisation en cours
                    </p>
                    <p className="mt-2 text-xl font-bold sm:text-2xl">
                      Mariage de Mariam & Idrissa
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-gold-bright">
                    18 jours
                  </span>
                </div>

                <div className="mt-8 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs text-white/55">Collecté</p>
                    <p className="mt-1 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                      685 000 F
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white/60">/ 1 000 000 F</p>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[68.5%] rounded-full bg-gold-bright" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["68 %", "atteint"],
                    ["42", "contributions"],
                    ["0 %", "commission"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl bg-white/[0.07] px-2 py-3">
                      <p className="text-sm font-bold text-gold-bright">{value}</p>
                      <p className="mt-0.5 text-[10px] text-white/45">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-secondary/45 p-4">
                  <MessageCircle className="size-4 text-primary" />
                  <p className="mt-2 text-sm font-bold text-ink">Partage WhatsApp</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Un lien clair pour tout le groupe.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/80 bg-secondary/45 p-4">
                  <Wallet className="size-4 text-primary" />
                  <p className="mt-2 text-sm font-bold text-ink">Suivi centralisé</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Qui a payé, combien et où en est l’objectif.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-white/65">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 py-5 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            ["Fonds directs", "Les contributions sont versées directement à l’organisateur."],
            ["Suivi lisible", "Contributions, confirmations et progression au même endroit."],
            ["Prix prévisible", "Le forfait dépend de la durée, pas du montant collecté."],
          ].map(([title, body]) => (
            <div key={title} className="flex items-start gap-3 rounded-2xl px-3 py-3">
              <span className="mt-0.5 size-2 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm font-bold text-ink">{title}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pour-qui">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <p className="mc-kicker">Pour qui ?</p>
            <div className="mt-3 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <h2 className="max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
                Une page claire pour une habitude que votre groupe connaît déjà.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:justify-self-end">
                Mariage, funérailles, entraide, association ou projet commun :
                Mastercota remplace les captures d’écran, les listes manuelles et
                les calculs dispersés par une page commune et un suivi compréhensible.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="comment-ca-marche" className="border-y border-border/70 bg-white/55">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <p className="mc-kicker">Comment ça marche</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
              Quatre étapes. Pas de jargon.
            </h2>
          </Reveal>

          <HowItWorksSteps />

          <Reveal delayMs={160} className="mt-10">
            <Button asChild variant="outline">
              <Link href="/comment-ca-marche">
                Voir le fonctionnement en détail
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <Reveal>
            <p className="mc-kicker">Confiance & frais</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
              L’argent reste chez l’organisateur. Le suivi reste dans Mastercota.
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Reveal delayMs={80}>
              <div className="mc-panel h-full p-6 sm:p-8">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink">
                  0 % sur les contributions
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  Mastercota ne prélève aucun pourcentage sur les contributions.
                  Les fonds ne sont ni encaissés ni redistribués par Mastercota.
                </p>
              </div>
            </Reveal>

            <Reveal delayMs={180}>
              <div className="mc-panel h-full p-6 sm:p-8">
                <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary">
                  <Clock3 className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-bold text-ink">
                  Un forfait pour utiliser l’outil
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                  L’organisateur paie un forfait Mastercota selon la durée de la
                  cotisation. Le prix ne dépend pas de la somme collectée. La
                  première cotisation est offerte selon les conditions affichées.
                </p>
                <Link
                  href="/frais"
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  Voir les tarifs <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#143268_0%,#214b86_100%)] px-6 py-10 text-white shadow-[0_35px_80px_-45px_rgb(20_50_104_/_90%)] sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-bright">
                Prêt à commencer ?
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
                Votre prochaine cotisation peut être beaucoup plus simple.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
                Créez la page, partagez le lien et gardez un historique clair
                des contributions signalées et confirmées.
              </p>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
              <Button asChild size="lg" className="bg-gold-bright text-ink hover:bg-gold-bright">
                <Link href="/auth/phone">
                  Créer ma cotisation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/comment-ca-marche">Comment ça marche</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
