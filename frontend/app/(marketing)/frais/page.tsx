import Link from "next/link";
import type { Metadata } from "next";
import { Gift, Clock3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion";
import {
  DURATION_PRESETS,
  EXTENSION_DAYS,
  EXTENSION_FEE,
  FREE_COTISATIONS_PER_PHONE,
  FREE_DURATION_DAYS,
  MAX_DURATION_DAYS,
} from "@/lib/fees";

export const metadata: Metadata = {
  title: "Frais",
  description:
    "0 % sur les contributions. Frais de durée Mastercota et réception Wave, conditions claires.",
};

export default function FraisPage() {
  return (
    <div>
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Frais
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl md:text-5xl">
              0&nbsp;% sur les contributions. Frais seulement pour la durée.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Mastercota ne prend rien sur ce que vos proches envoient. Vous
              payez uniquement pour garder la page ouverte. Wave a ses propres
              règles selon comment vous êtes payé.
            </p>
          </Reveal>

          {/* Bloc 1 — Mastercota */}
          <div id="duree" className="mt-12 scroll-mt-24 sm:mt-16">
            <Reveal>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Clock3 className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Frais Mastercota
                  </p>
                  <h2 className="text-2xl font-extrabold text-ink">
                    Durée de la cotisation
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Vous payez une fois pour la durée choisie. Ce n’est jamais un
                prélèvement sur les contributions.
              </p>
            </Reveal>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <Reveal delayMs={80}>
                <article
                  id="gratuit"
                  className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Gift className="size-5" />
                    <p className="text-xs font-semibold uppercase tracking-widest">
                      Essai gratuit
                    </p>
                  </div>
                  <h3 className="mt-3 text-xl font-extrabold text-ink">
                    1re cotisation · {FREE_DURATION_DAYS} jours · 0&nbsp;F
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Pour tester Mastercota. Une seule fois par numéro de
                    téléphone.
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-foreground/85">
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>
                        {FREE_COTISATIONS_PER_PHONE} cotisation gratuite / numéro
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>Durée fixe : {FREE_DURATION_DAYS} jours</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>
                        Connexion WhatsApp + Wave à configurer avant de partager
                      </span>
                    </li>
                  </ul>
                </article>
              </Reveal>

              <Reveal delayMs={160}>
                <article
                  id="durees"
                  className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Après l’essai / autres durées
                  </p>
                  <h3 className="mt-3 text-xl font-extrabold text-ink">
                    Grille des durées
                  </h3>
                  <ul className="mt-5 space-y-3 text-sm">
                    {DURATION_PRESETS.map((p) => (
                      <li
                        key={p.days}
                        className="flex items-center justify-between gap-3 border-b border-border/70 pb-3"
                      >
                        <span className="font-medium text-ink">{p.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {p.fee.toLocaleString("fr-FR")} FCFA
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between gap-3">
                      <span className="font-medium text-ink">
                        Prolongation (+{EXTENSION_DAYS} j)
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {EXTENSION_FEE.toLocaleString("fr-FR")} FCFA
                      </span>
                    </li>
                  </ul>
                  <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                    Max {MAX_DURATION_DAYS} jours. Une prolongation max, sans
                    dépasser le plafond. Payé par l’organisateur.
                  </p>
                </article>
              </Reveal>
            </div>
          </div>

          {/* Bloc 2 — Wave */}
          <div id="wave" className="mt-14 scroll-mt-24 border-t border-border pt-12 sm:mt-20 sm:pt-16">
            <Reveal>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Comment vous êtes payé
                  </p>
                  <h2 className="text-2xl font-extrabold text-ink">
                    Réception via Wave
                  </h2>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                L’argent ne passe pas par Mastercota. Il arrive sur votre Wave.
                Mastercota : toujours 0&nbsp;% sur les contributions. Les frais
                éventuels viennent de Wave, pas de nous.
              </p>
            </Reveal>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <Reveal delayMs={80}>
                <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Recommandé
                  </p>
                  <h3 className="mt-2 text-lg font-extrabold text-ink">
                    Wave Business
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    App gratuite « Wave Business ». Vous collez votre lien de
                    paiement. Vos proches paient en un clic, montant déjà rempli.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>Mastercota : 0&nbsp;% sur la contribution</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>
                        Frais Wave marchand : selon Wave (voir dans votre app).
                        Support CI : 1315
                      </span>
                    </li>
                  </ul>
                </article>
              </Reveal>
              <Reveal delayMs={160}>
                <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Sans Business
                  </p>
                  <h3 className="mt-2 text-lg font-extrabold text-ink">
                    Numéro Wave
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Vous donnez votre numéro. Le proche copie et envoie dans
                    Wave. Plus simple à configurer, plus d’erreurs possibles.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-foreground/85">
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                      <span>Mastercota : 0&nbsp;% sur la contribution</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                      <span>
                        Frais d’envoi Wave éventuels côté expéditeur (grille
                        Wave)
                      </span>
                    </li>
                  </ul>
                </article>
              </Reveal>
            </div>

            <Reveal delayMs={200}>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Dans les deux cas : après le paiement Wave, le proche clique «
                J’ai payé ». Vous validez dans Mastercota. Sans validation, le
                total affiché n’augmente pas.
              </p>
            </Reveal>
          </div>

          <Reveal
            delayMs={120}
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
              <Link href="/comment-ca-marche">Comment ça marche</Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
