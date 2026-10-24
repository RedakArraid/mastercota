"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Share2,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Enter } from "@/components/motion";
import { cn } from "@/lib/utils";

const slides = [
  {
    icon: MessageCircle,
    title: "Connexion WhatsApp",
    lead: "Pas de mot de passe. Un code suffit.",
    body: "Vous entrez votre numéro. Mastercota envoie un code à 6 chiffres sur WhatsApp. Vous le saisissez et vous êtes connecté.",
    detail: "Utilisez un numéro que vous contrôlez et gardez accès à WhatsApp pour recevoir vos codes de connexion.",
  },
  {
    icon: Wallet,
    title: "Recevoir directement",
    lead: "L’argent reste entre le participant et vous.",
    body: "Configurez votre mode de réception. Aujourd’hui, Mastercota prend en charge Wave Business ou votre numéro Wave.",
    detail: "Mastercota ne conserve pas les fonds de la cotisation.",
  },
  {
    icon: Share2,
    title: "Créer et partager",
    lead: "Une page publique pour vos proches.",
    body: "Titre, objectif, durée. Vous partagez le lien dans votre groupe. Après leur transfert, les participants le signalent et vous confirmez ce qui a réellement été reçu.",
    detail: "Première cotisation : 35 jours offerts. Mastercota prend 0 % sur les contributions.",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  return (
    <div className="mx-auto flex min-h-[80dvh] max-w-lg flex-col px-4 py-10 sm:px-6 sm:py-12 md:py-16">
      <Enter delayMs={0}>
        <div className="flex items-center justify-between gap-3">
          <Logo href="/" size="md" />
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/phone">Passer</Link>
          </Button>
        </div>
      </Enter>

      <Enter delayMs={140} className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Guide rapide · {step + 1} / {slides.length}
        </p>
        <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">
          Comprendre Mastercota en 1 minute
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Trois points utiles. Vous pouvez passer et créer votre compte quand
          vous voulez.
        </p>
      </Enter>

      <div className="mt-8 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Étape ${i + 1}`}
            onClick={() => setStep(i)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-500",
              i === step
                ? "bg-primary"
                : i < step
                  ? "bg-primary/40"
                  : "bg-border"
            )}
          />
        ))}
      </div>

      <div
        key={step}
        className="mc-enter mt-10 flex flex-1 flex-col"
        style={{ ["--mc-delay" as string]: "80ms" }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Icon className="size-6" />
        </div>
        <h2 className="mt-6 text-2xl font-extrabold text-ink md:text-3xl">
          {slide.title}
        </h2>
        <p className="mt-2 text-base font-medium text-ink/80">{slide.lead}</p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {slide.body}
        </p>
        <div className="mt-6 rounded-2xl border border-border bg-secondary/40 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
          {slide.detail}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-3 pb-4">
        <div className="flex gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="flex-1"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="size-4" />
              Précédent
            </Button>
          ) : (
            <Button asChild variant="secondary" size="lg" className="flex-1">
              <Link href="/">Accueil</Link>
            </Button>
          )}

          {!isLast ? (
            <Button
              type="button"
              size="lg"
              className="flex-1"
              onClick={() => setStep((s) => s + 1)}
            >
              Continuer
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button asChild size="lg" className="flex-1">
              <Link href="/auth/phone">
                <CheckCircle2 className="size-4" />
                Créer mon compte
              </Link>
            </Button>
          )}
        </div>
        {!isLast ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/phone">Passer et créer mon compte</Link>
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Ensuite : WhatsApp → code → configurer la réception
          </p>
        )}
      </div>
    </div>
  );
}
