import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_TAGLINE } from "@/lib/constants";

const slides = [
  {
    title: "Créez votre cotisation",
    body: "Fixez un objectif, une échéance, et partagez un lien unique.",
  },
  {
    title: "Recevez via Mobile Money",
    body: "Wave, MTN, Orange — les contributions arrivent automatiquement.",
  },
  {
    title: "Suivez la progression",
    body: "Dashboard live pour vous et vos contributeurs.",
  },
];

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">
        Mastercota
      </p>
      <h1 className="mt-3 text-3xl font-extrabold text-ink">{APP_TAGLINE}</h1>

      <div className="mt-12 space-y-8">
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

      <div className="mt-12 space-y-3">
        <Button asChild size="lg" className="w-full">
          <Link href="/auth/phone">Commencer</Link>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Connexion WhatsApp — Côte d&apos;Ivoire (+225)
        </p>
      </div>
    </div>
  );
}
