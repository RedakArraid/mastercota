"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Clock3, GraduationCap, PlayCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AcademyEnrollment } from "@/lib/types";

type Certificate = {
  id: string;
  course_id: string;
  verification_code: string;
  issued_at: string;
  course_title: string;
  slug: string;
};

export default function LearnPage() {
  const [enrollments, setEnrollments] = useState<AcademyEnrollment[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ enrollments: AcademyEnrollment[]; certificates: Certificate[] }>("/api/academy/me")
      .then(data => {
        setEnrollments(data.enrollments || []);
        setCertificates(data.certificates || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const active = useMemo(() => enrollments.filter(item => ["active", "completed"].includes(item.status)), [enrollments]);
  const pending = useMemo(() => enrollments.filter(item => item.status === "pending"), [enrollments]);

  if (loading) {
    return <div className="mc-page py-16 text-center text-sm text-muted-foreground">Chargement de vos cours…</div>;
  }

  return (
    <div className="mc-page space-y-8">
      <section className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#143268_0%,#214b86_100%)] p-6 text-white shadow-[0_28px_70px_-40px_rgb(20_50_104_/_90%)] sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold-bright/15 blur-2xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-bright">Mastercota Academy</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Mes cours</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Reprenez là où vous vous êtes arrêté, validez vos quiz et retrouvez vos certificats.
            </p>
          </div>
          <Button asChild size="lg" className="bg-gold-bright text-ink hover:bg-gold-bright">
            <Link href="/academy"><BookOpen className="size-4" /> Explorer les cours</Link>
          </Button>
        </div>
      </section>

      {pending.length ? (
        <section className="mc-panel border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 size-5 text-amber-700" />
            <div>
              <h2 className="font-bold text-ink">Accès en attente de confirmation</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {pending.length} inscription{pending.length > 1 ? "s" : ""} attend{pending.length > 1 ? "ent" : ""} la confirmation d’un paiement par l’instructeur.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pending.map(item => (
                  <Link key={item.id} href={item.slug ? `/academy/${item.slug}` : "/academy"} className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink">
                    {item.title || "Cours"}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {active.length ? (
        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="mc-kicker">Apprentissage</p>
              <h2 className="mt-1 mc-section-title">Continuer à apprendre</h2>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground">{active.length} cours</span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {active.map(item => {
              const total = Number(item.lessons_count || 0);
              const completed = Number(item.completed_lessons || 0);
              const pct = total ? Math.round((completed / total) * 100) : 0;
              return (
                <Link key={item.id} href={`/learn/${item.course_id}`} className="group mc-panel overflow-hidden transition hover:-translate-y-1">
                  <div className="flex gap-4 p-5">
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                      {item.status === "completed" ? <CheckCircle2 className="size-6" /> : <PlayCircle className="size-6" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground">{item.instructor_name || "Mastercota Academy"}</p>
                      <h3 className="mt-1 line-clamp-2 text-lg font-extrabold tracking-[-0.025em] text-ink">{item.title}</h3>
                      {item.subtitle ? <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.subtitle}</p> : null}
                    </div>
                  </div>
                  <div className="border-t border-border/70 px-5 py-4">
                    <div className="mb-2 flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">{completed}/{total} leçons</span>
                      <span className="text-ink">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="mc-empty">
          <GraduationCap className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold text-ink">Votre espace d’apprentissage est prêt</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Inscrivez-vous à un cours pour retrouver ici vos leçons, quiz, progression et certificats.
          </p>
          <Button asChild className="mt-5"><Link href="/academy">Explorer Academy</Link></Button>
        </section>
      )}

      {certificates.length ? (
        <section>
          <div className="mb-5">
            <p className="mc-kicker">Réussites</p>
            <h2 className="mt-1 mc-section-title">Mes certificats</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map(cert => (
              <div key={cert.id} className="mc-panel flex items-center gap-4 p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                  <Award className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{cert.course_title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Code : {cert.verification_code}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/academy/certificate/${cert.verification_code}`}>Vérifier</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
