import { notFound } from "next/navigation";
import { Award, BookOpen, CheckCircle2, Clock3, GraduationCap, LockKeyhole, Star, Users } from "lucide-react";
import { CourseEnrollCard } from "@/components/academy/course-enroll-card";
import { Badge } from "@/components/ui/badge";
import { backendFetch } from "@/lib/backend";
import { formatAmount } from "@/lib/format";
import type { AcademyCourse, AcademySection } from "@/lib/types";

type Review = { id: string; rating: number; body?: string | null; created_at: string; user_name?: string | null };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const data = await backendFetch<{ course: AcademyCourse }>(`/api/academy/courses/${slug}`);
    return {
      title: `${data.course.title} · Mastercota Academy`,
      description: data.course.subtitle || data.course.description || "Cours Mastercota Academy",
    };
  } catch {
    return { title: "Cours · Mastercota Academy" };
  }
}

export default async function AcademyCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data: { course: AcademyCourse; outline: AcademySection[]; reviews: Review[] };
  try {
    data = await backendFetch(`/api/academy/courses/${slug}`);
  } catch {
    notFound();
  }

  const { course, outline, reviews } = data;
  const price = Number(course.price || 0);
  const lessonCount = outline.reduce((sum, section) => sum + section.lessons.length, 0);
  const duration = outline.reduce((sum, section) => sum + section.lessons.reduce((s, lesson) => s + Number(lesson.duration_minutes || 0), 0), 0);

  return (
    <div className="bg-[linear-gradient(180deg,#fffdf8_0%,#f8faff_45%,#f5f7fb_100%)]">
      <section className="border-b border-border/70 bg-[linear-gradient(135deg,#102a59_0%,#1d447e_58%,#2b558f_100%)] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_380px] lg:px-8 lg:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/10 text-white hover:bg-white/10">{course.category}</Badge>
              <Badge className="bg-gold-bright/15 text-gold-bright hover:bg-gold-bright/15">
                {course.level === "beginner" ? "Débutant" : course.level === "intermediate" ? "Intermédiaire" : course.level === "advanced" ? "Avancé" : "Tous niveaux"}
              </Badge>
            </div>

            <h1 className="mt-5 max-w-4xl text-balance text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">
              {course.title}
            </h1>
            {course.subtitle ? (
              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">{course.subtitle}</p>
            ) : null}
            {course.description ? (
              <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-white/60 sm:text-base">{course.description}</p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/65">
              <span className="inline-flex items-center gap-1.5"><Star className="size-4 text-gold-bright" /> {Number(course.rating || 0).toFixed(1)} ({course.reviews_count || 0} avis)</span>
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" /> {course.learners_count || 0} apprenants</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen className="size-4" /> {lessonCount} leçons</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" /> {Math.max(1, Math.round(duration / 60))} h</span>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-white/10">
                <GraduationCap className="size-5 text-gold-bright" />
              </span>
              <div>
                <p className="text-xs text-white/45">Votre instructeur</p>
                <p className="font-bold">{course.instructor_name || "Instructeur Mastercota"}</p>
                {course.instructor_headline ? <p className="text-xs text-white/55">{course.instructor_headline}</p> : null}
              </div>
            </div>
          </div>

          <aside className="self-start rounded-[1.5rem] bg-white p-5 text-ink shadow-[0_35px_80px_-45px_rgb(0_0_0_/_80%)] sm:p-6 lg:sticky lg:top-24">
            {course.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={course.cover_url} alt="" className="mb-5 aspect-video w-full rounded-2xl object-cover" />
            ) : (
              <div className="mb-5 flex aspect-video items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#143268,#2a5798)]">
                <BookOpen className="size-12 text-gold-bright" />
              </div>
            )}

            <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
              {course.access_type === "invite" ? "Accès privé" : price === 0 ? "Accès gratuit" : "Prix du cours"}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-[-0.04em]">
              {course.access_type === "invite" ? "Invitation" : price === 0 ? "Gratuit" : formatAmount(price)}
            </p>
            <div className="mt-5">
              <CourseEnrollCard courseId={course.id} accessType={course.access_type} price={price} />
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <p className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-emerald-600" /> Progression sauvegardée</p>
              <p className="flex items-center gap-2"><Award className="size-3.5 text-primary" /> Certificat {course.certificate_enabled === false ? "désactivé" : "à la complétion"}</p>
              <p className="flex items-center gap-2"><LockKeyhole className="size-3.5 text-primary" /> Accès contrôlé par votre compte</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8 lg:py-16">
        <div>
          <p className="mc-kicker">Programme</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink">Ce que vous allez apprendre</h2>

          <div className="mt-6 space-y-4">
            {outline.map((section, sectionIndex) => (
              <div key={section.id} className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-white/85">
                <div className="border-b border-border/70 bg-secondary/45 px-5 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Section {sectionIndex + 1}</p>
                  <h3 className="mt-1 font-bold text-ink">{section.title}</h3>
                </div>
                <ul className="divide-y divide-border/70">
                  {section.lessons.map(lesson => (
                    <li key={lesson.id} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-ink">
                          {lesson.preview ? <BookOpen className="size-4" /> : <LockKeyhole className="size-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{lesson.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{lesson.lesson_type}{lesson.preview ? " · aperçu" : ""}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-muted-foreground">{lesson.duration_minutes || 0} min</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {reviews.length ? (
            <div className="mt-12">
              <p className="mc-kicker">Avis</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ink">Ce qu’en pensent les apprenants</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {reviews.map(review => (
                  <blockquote key={review.id} className="mc-panel p-5">
                    <div className="flex items-center gap-1 text-primary">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-4 ${i < Number(review.rating) ? "fill-current" : "opacity-20"}`} />)}
                    </div>
                    {review.body ? <p className="mt-3 text-sm leading-6 text-muted-foreground">“{review.body}”</p> : null}
                    <footer className="mt-4 text-xs font-semibold text-ink">{review.user_name || "Apprenant"}</footer>
                  </blockquote>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside>
          <div className="mc-panel p-5">
            <p className="mc-kicker">À propos</p>
            <h3 className="mt-2 text-lg font-bold text-ink">{course.instructor_name || "Instructeur Mastercota"}</h3>
            {course.instructor_headline ? <p className="mt-1 text-sm font-medium text-primary">{course.instructor_headline}</p> : null}
            {course.instructor_bio ? <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{course.instructor_bio}</p> : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
