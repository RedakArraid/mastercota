import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";
import { AcademyCourseCard } from "@/components/academy/course-card";
import { Button } from "@/components/ui/button";
import { backendFetch } from "@/lib/backend";
import type { AcademyCourse } from "@/lib/types";

export default async function AcademyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; level?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.level) query.set("level", params.level);

  let courses: AcademyCourse[] = [];
  try {
    const data = await backendFetch<{ courses: AcademyCourse[] }>(
      `/api/academy/courses${query.size ? `?${query.toString()}` : ""}`
    );
    courses = data.courses ?? [];
  } catch {
    courses = [];
  }

  const categories = [...new Set(courses.map(course => course.category).filter(Boolean))].slice(0, 8);

  return (
    <div className="bg-[linear-gradient(180deg,#fffdf8_0%,#f8faff_42%,#f5f7fb_100%)]">
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_45%_-5%,rgb(244_184_41_/_20%),transparent_68%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">
              <Sparkles className="size-3.5 text-primary" />
              Mastercota Academy
            </div>
            <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-[-0.055em] text-ink sm:text-5xl lg:text-6xl">
              Apprenez auprès de personnes qui pratiquent vraiment.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Des cours structurés, des quiz, une progression claire et des certificats vérifiables.
              Les instructeurs gardent la maîtrise de leurs contenus et de leurs paiements.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth/phone?next=/learn">
                  Commencer à apprendre
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/phone?next=/teach">
                  <GraduationCap className="size-4" />
                  Devenir instructeur
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              [BookOpen, "Cours structurés", "Leçons, ressources, progression et déblocage progressif."],
              [ShieldCheck, "Accès maîtrisé", "Cours gratuits, payants ou privés sur invitation."],
              [GraduationCap, "Certificats", "Validation par quiz et certificat vérifiable à la fin du parcours."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof BookOpen;
              return (
                <div key={String(title)} className="rounded-2xl border border-border/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                  <I className="size-5 text-primary" />
                  <p className="mt-3 font-bold text-ink">{String(title)}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{String(body)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <form className="mc-panel mb-8 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:p-5">
          <input
            name="q"
            defaultValue={params.q || ""}
            placeholder="Rechercher un cours, un thème…"
            className="h-11 rounded-xl border border-input bg-white px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            name="level"
            defaultValue={params.level || ""}
            className="h-11 rounded-xl border border-input bg-white px-3 text-sm text-ink outline-none"
          >
            <option value="">Tous niveaux</option>
            <option value="beginner">Débutant</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="advanced">Avancé</option>
            <option value="all">Tous niveaux</option>
          </select>
          <Button type="submit">Rechercher</Button>
        </form>

        {categories.length ? (
          <div className="mb-7 flex flex-wrap gap-2">
            <Link href="/academy" className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">
              Tous
            </Link>
            {categories.map(category => (
              <Link
                key={category}
                href={`/academy?category=${encodeURIComponent(category)}`}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-ink"
              >
                {category}
              </Link>
            ))}
          </div>
        ) : null}

        {courses.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map(course => <AcademyCourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <div className="mc-empty">
            <BookOpen className="mx-auto size-10 text-primary" />
            <h2 className="mt-4 text-xl font-bold text-ink">Aucun cours publié pour le moment</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Les premiers cours apparaîtront ici dès leur publication.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
