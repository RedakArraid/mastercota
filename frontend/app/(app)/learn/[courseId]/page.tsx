"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, Clock3, ExternalLink, Megaphone, PlayCircle } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AcademyCohortScheduleItem, AcademyCourse, AcademyEnrollment, AcademySection } from "@/lib/types";

type LessonProgress = { lesson_id: string; status: "started" | "completed"; progress_seconds: number };
type Announcement = { id: string; title: string; body: string; created_at: string };

export default function LearningCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const [courseId, setCourseId] = useState("");
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [enrollment, setEnrollment] = useState<AcademyEnrollment | null>(null);
  const [outline, setOutline] = useState<AcademySection[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedule, setSchedule] = useState<AcademyCohortScheduleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ courseId: id }) => {
      setCourseId(id);
      Promise.all([
        api<{ course: AcademyCourse; enrollment: AcademyEnrollment | null; outline: AcademySection[]; progress: LessonProgress[]; announcements: Announcement[] }>(`/api/academy/learning/${id}`),
        api<{ schedule: AcademyCohortScheduleItem[] }>(`/api/academy/learning/${id}/schedule`).catch(() => ({ schedule: [] })),
      ])
        .then(([data, calendar]) => {
          setCourse(data.course);
          setEnrollment(data.enrollment);
          setOutline(data.outline || []);
          setProgress(data.progress || []);
          setAnnouncements(data.announcements || []);
          setSchedule(calendar.schedule || []);
        })
        .catch(err => setError(err instanceof Error ? err.message : "Cours indisponible"));
    });
  }, [params]);

  const totalLessons = useMemo(() => outline.reduce((sum, section) => sum + section.lessons.length, 0), [outline]);
  const completed = useMemo(() => progress.filter(item => item.status === "completed").length, [progress]);
  const percent = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;

  if (error) {
    return (
      <div className="mc-page py-16">
        <div className="mc-empty mx-auto max-w-xl">
          <h1 className="text-xl font-bold text-ink">Cours inaccessible</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild className="mt-5"><Link href="/learn">Retour à mes cours</Link></Button>
        </div>
      </div>
    );
  }

  if (!course) return <div className="mc-page py-16 text-center text-sm text-muted-foreground">Chargement du cours…</div>;

  const firstIncomplete = outline.flatMap(section => section.lessons).find(lesson => !progress.some(item => item.lesson_id === lesson.id && item.status === "completed"));

  return (
    <div className="mc-page space-y-7">
      <section className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#143268_0%,#214b86_100%)] p-6 text-white sm:p-8">
        <div className="relative">
          <Button asChild variant="ghost" className="-ml-3 mb-4 text-white/70 hover:bg-white/10 hover:text-white">
            <Link href="/learn"><ArrowLeft className="size-4" /> Mes cours</Link>
          </Button>
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-gold-bright">{course.category}</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{course.title}</h1>
              {course.subtitle ? <p className="mt-3 text-sm leading-6 text-white/65 sm:text-base">{course.subtitle}</p> : null}
            </div>
            {firstIncomplete ? (
              <Button asChild size="lg" className="bg-gold-bright text-ink hover:bg-gold-bright">
                <Link href={`/learn/${courseId}/lesson/${firstIncomplete.id}`}>
                  <PlayCircle className="size-4" />
                  Continuer
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.08] p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold">
              <span className="text-white/60">{completed}/{totalLessons} leçons terminées</span>
              <span className="text-gold-bright">{percent}%</span>
            </div>
            <Progress value={percent} className="h-2.5 bg-white/10" />
          </div>
        </div>
      </section>

      {schedule.length ? (
        <section className="mc-panel p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="mc-kicker">Cohorte & live</p>
              <h2 className="mt-1 text-xl font-bold text-ink">{schedule[0].cohort_title}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {schedule.filter(item => item.session_id).map(item => (
                  <div key={item.session_id} className="rounded-2xl border border-border/80 bg-secondary/35 p-4">
                    <p className="font-bold text-ink">{item.session_title}</p>
                    {item.starts_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.starts_at).toLocaleString("fr-FR")} · {item.duration_minutes || 60} min
                      </p>
                    ) : null}
                    {item.notes ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.notes}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.meeting_url ? (
                        <Button asChild size="sm">
                          <a href={item.meeting_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3.5" /> Rejoindre
                          </a>
                        </Button>
                      ) : null}
                      {item.recording_url ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={item.recording_url} target="_blank" rel="noreferrer">Replay</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {announcements.length ? (
        <section className="mc-panel p-5">
          <div className="flex items-start gap-3">
            <Megaphone className="mt-0.5 size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="mc-kicker">Annonce récente</p>
              <h2 className="mt-1 font-bold text-ink">{announcements[0].title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{announcements[0].body}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mc-kicker">Programme</p>
            <h2 className="mt-1 mc-section-title">Leçons du cours</h2>
          </div>
          {enrollment?.status === "completed" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" /> Terminé
            </span>
          ) : null}
        </div>

        <div className="space-y-4">
          {outline.map((section, sectionIndex) => (
            <div key={section.id} className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-white/85 shadow-sm">
              <div className="border-b border-border/70 bg-secondary/45 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Section {sectionIndex + 1}</p>
                <h3 className="mt-1 font-bold text-ink">{section.title}</h3>
              </div>
              <div className="divide-y divide-border/70">
                {section.lessons.map((lesson, lessonIndex) => {
                  const state = progress.find(item => item.lesson_id === lesson.id);
                  const done = state?.status === "completed";
                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${courseId}/lesson/${lesson.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-secondary/30"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${done ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-ink"}`}>
                          {done ? <CheckCircle2 className="size-4" /> : <BookOpen className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{lessonIndex + 1}. {lesson.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{lesson.lesson_type}{lesson.quiz_id ? " · quiz" : ""}</p>
                        </div>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" /> {lesson.duration_minutes || 0} min
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
