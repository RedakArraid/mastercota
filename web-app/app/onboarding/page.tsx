import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { APP_TAGLINE } from "@/lib/constants";

const slides = [
  {
    title: "Créez votre cotisation",
    body: "Fixez un objectif, une échéance, et partagez un lien unique.",
  },
  {
    title: "Recevez via Mobile Money",
    body: "Wave, MTN, Orange — les contributions arrivent en temps réel.",
  },
  {
    title: "Suivez la progression",
    body: "Dashboard live pour vous et vos contributeurs.",
  },
];

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-between px-6 py-10">
      <div>
        <Logo size="lg" href="/onboarding" />
        <p className="mt-3 text-lg text-muted-foreground">{APP_TAGLINE}</p>
      </div>

      <div className="space-y-8 py-12">
        {slides.map((slide, i) => (
          <div key={slide.title} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              0{i + 1}
            </p>
            <h2 className="text-2xl font-bold text-ink">{slide.title}</h2>
            <p className="text-muted-foreground">{slide.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Button asChild size="lg" className="w-full">
          <Link href="/auth/phone">Commencer</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Connexion par SMS — Côte d&apos;Ivoire (+225)
        </p>
      </div>
    </div>
  );
}
