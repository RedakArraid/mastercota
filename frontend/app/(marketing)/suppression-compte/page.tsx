import Link from "next/link";
import { ArrowRight, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Supprimer son compte",
  description: "Demander la suppression définitive d’un compte Mastercota et de ses données associées.",
};

export default function AccountDeletionPage() {
  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#fffdf8_0%,#f6f8fc_100%)] px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <Logo href="/" size="sm" />
        <section className="mc-panel mt-8 p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <Trash2 className="size-5" />
          </span>
          <p className="mc-kicker mt-6">Confidentialité</p>
          <h1 className="mt-2 mc-page-title">Supprimer votre compte Mastercota</h1>
          <p className="mt-4 mc-body">
            Vous pouvez supprimer votre compte depuis l’application mobile ou depuis
            le web. La suppression efface votre compte, vos cotisations et les données
            personnelles associées.
          </p>

          <div className="mt-6 rounded-2xl bg-secondary/60 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" />
              <div className="space-y-2">
                <p>
                  Si vous avez contribué à une cotisation organisée par une autre personne,
                  le montant confirmé peut être conservé pour préserver son total, mais votre
                  nom, votre téléphone et votre note sont anonymisés.
                </p>
                <p>
                  Si l’offre de première cotisation a déjà été utilisée, une empreinte
                  cryptographique du numéro peut être conservée uniquement pour empêcher la
                  réutilisation abusive de cette offre. Le numéro n’est pas conservé en clair
                  dans cet historique.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/phone?next=%2Fprofile%3Fdelete%3D1">
                Se connecter et supprimer
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/p/confidentialite">Lire la politique de confidentialité</Link>
            </Button>
          </div>

          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Besoin d’aide ? Écrivez à support@mastercota.com. Ne transmettez jamais
            votre code OTP WhatsApp.
          </p>
        </section>
      </div>
    </div>
  );
}
