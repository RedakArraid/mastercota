import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, CheckCircle2, ShieldCheck } from "lucide-react";
import { backendFetch } from "@/lib/backend";
import { Button } from "@/components/ui/button";

type Certificate = {
  verification_code: string;
  issued_at: string;
  course_title: string;
  learner_name?: string | null;
  learner_phone?: string | null;
  metadata?: {
    course_title?: string;
    learner_name?: string;
  };
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let certificate: Certificate;
  try {
    const data = await backendFetch<{ valid: boolean; certificate: Certificate }>(
      `/api/academy/certificates/${encodeURIComponent(code)}`
    );
    if (!data.valid || !data.certificate) notFound();
    certificate = data.certificate;
  } catch {
    notFound();
  }

  return (
    <div className="bg-[linear-gradient(180deg,#fffdf8_0%,#f5f7fb_100%)] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <section className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-white p-7 text-center shadow-[0_35px_90px_-50px_rgb(20_50_104_/_60%)] sm:p-10">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(ellipse_at_top,_rgb(244_184_41_/_22%),_transparent_70%)]" />
          <div className="relative">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent text-primary">
              <Award className="size-8" />
            </span>
            <p className="mc-kicker mt-6">Certificat vérifié</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
              {certificate.course_title || certificate.metadata?.course_title}
            </h1>
            <p className="mt-5 text-sm text-muted-foreground">Attribué à</p>
            <p className="mt-1 text-xl font-bold text-ink">
              {certificate.learner_name || certificate.metadata?.learner_name || certificate.learner_phone || "Apprenant Mastercota"}
            </p>

            <div className="mx-auto mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/60 p-4">
                <ShieldCheck className="mx-auto size-5 text-emerald-600" />
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Code de vérification</p>
                <p className="mt-1 font-mono text-sm font-bold text-ink">{certificate.verification_code}</p>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-4">
                <CheckCircle2 className="mx-auto size-5 text-emerald-600" />
                <p className="mt-2 text-xs font-semibold text-muted-foreground">Date d’émission</p>
                <p className="mt-1 text-sm font-bold text-ink">{new Date(certificate.issued_at).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>

            <p className="mx-auto mt-7 max-w-xl text-sm leading-6 text-muted-foreground">
              Ce certificat a été émis par Mastercota Academy après validation du parcours et des évaluations requises.
            </p>

            <Button asChild variant="outline" className="mt-7">
              <Link href="/academy">Découvrir d’autres cours</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
