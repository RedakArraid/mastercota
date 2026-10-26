"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, CheckCircle2, ClipboardList, Download, ExternalLink, MessageCircle, Save, Send, Video } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { AcademyAssignment, AcademyAssignmentSubmission, AcademyCourse, AcademyLesson, AcademyLessonNote, AcademyQuiz } from "@/lib/types";

type LessonPremiumPayload = {
  assignment: AcademyAssignment | null;
  submission: AcademyAssignmentSubmission | null;
  note: AcademyLessonNote | null;
};

type LessonPayload = {
  lesson: AcademyLesson;
  course: AcademyCourse;
  progress: { status: "started" | "completed"; progress_seconds: number } | null;
  quiz: AcademyQuiz | null;
  discussions: Array<{ id: string; parent_id?: string | null; body: string; created_at: string; user_name?: string | null }>;
};

export default function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const [courseId, setCourseId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [data, setData] = useState<LessonPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean; feedback?: Record<string, { correct: boolean; explanation?: string | null }> } | null>(null);
  const [discussion, setDiscussion] = useState("");
  const [premium, setPremium] = useState<LessonPremiumPayload>({ assignment: null, submission: null, note: null });
  const [noteBody, setNoteBody] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [assignmentText, setAssignmentText] = useState("");
  const [assignmentUrl, setAssignmentUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(id: string) {
    try {
      const [payload, premiumPayload] = await Promise.all([
        api<LessonPayload>(`/api/academy/lessons/${id}`),
        api<LessonPremiumPayload>(`/api/academy/lessons/${id}/premium`).catch(() => ({ assignment: null, submission: null, note: null })),
      ]);
      setData(payload);
      setPremium(premiumPayload);
      setNoteBody(premiumPayload.note?.body || "");
      setBookmarked(premiumPayload.note?.bookmarked === true);
      setAssignmentText(premiumPayload.submission?.text_content || "");
      setAssignmentUrl(premiumPayload.submission?.submission_url || "");
      if (!payload.progress) {
        await api(`/api/academy/lessons/${id}/progress`, {
          method: "POST",
          body: JSON.stringify({ status: "started", progress_seconds: 0 }),
        }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Leçon indisponible");
    }
  }

  useEffect(() => {
    params.then(({ courseId: cId, lessonId: lId }) => {
      setCourseId(cId);
      setLessonId(lId);
      load(lId);
    });
  }, [params]);

  async function completeLesson() {
    if (!lessonId) return;
    setBusy(true);
    try {
      const result = await api<{ progress: { status: string }; completion?: { completed?: boolean } | null }>(
        `/api/academy/lessons/${lessonId}/progress`,
        {
          method: "POST",
          body: JSON.stringify({ status: "completed", progress_seconds: 0 }),
        }
      );
      setData(current => current ? { ...current, progress: { status: "completed", progress_seconds: current.progress?.progress_seconds || 0 } } : current);
      toast.success(result.completion?.completed ? "Cours terminé !" : "Leçon terminée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Progression impossible");
    } finally {
      setBusy(false);
    }
  }

  function updateAnswer(questionId: string, value: string, multiple: boolean) {
    if (!multiple) {
      setAnswers(current => ({ ...current, [questionId]: value }));
      return;
    }
    setAnswers(current => {
      const selected = Array.isArray(current[questionId]) ? current[questionId] as string[] : [];
      return {
        ...current,
        [questionId]: selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value],
      };
    });
  }

  async function submitQuiz() {
    if (!data?.quiz) return;
    setBusy(true);
    try {
      const result = await api<{ attempt: { score: number; passed: boolean }; feedback: Record<string, { correct: boolean; explanation?: string | null }> }>(
        `/api/academy/quizzes/${data.quiz.id}/attempt`,
        { method: "POST", body: JSON.stringify({ answers }) }
      );
      setQuizResult({ ...result.attempt, feedback: result.feedback });
      toast[result.attempt.passed ? "success" : "error"](
        result.attempt.passed ? `Quiz réussi : ${result.attempt.score}%` : `Score : ${result.attempt.score}%`
      );
      await load(lessonId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Quiz impossible");
    } finally {
      setBusy(false);
    }
  }

  async function postDiscussion() {
    if (!discussion.trim() || !data) return;
    setBusy(true);
    try {
      const result = await api<{ discussion: LessonPayload["discussions"][number] }>(
        `/api/academy/courses/${courseId}/discussions`,
        {
          method: "POST",
          body: JSON.stringify({ lesson_id: lessonId, body: discussion.trim() }),
        }
      );
      setData(current => current ? { ...current, discussions: [...current.discussions, result.discussion] } : current);
      setDiscussion("");
      toast.success("Question publiée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publication impossible");
    } finally {
      setBusy(false);
    }
  }

  async function savePrivateNote() {
    if (!lessonId) return;
    setBusy(true);
    try {
      const result = await api<{ note: AcademyLessonNote }>(`/api/academy/lessons/${lessonId}/note`, {
        method: "PUT",
        body: JSON.stringify({ body: noteBody, bookmarked }),
      });
      setPremium(current => ({ ...current, note: result.note }));
      toast.success("Note privée enregistrée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setBusy(false);
    }
  }

  async function submitAssignment() {
    if (!premium.assignment) return;
    setBusy(true);
    try {
      const result = await api<{ submission: AcademyAssignmentSubmission }>(
        `/api/academy/assignments/${premium.assignment.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            text_content: assignmentText.trim() || null,
            submission_url: assignmentUrl.trim() || null,
          }),
        }
      );
      setPremium(current => ({ ...current, submission: result.submission }));
      toast.success("Devoir remis à l’instructeur");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remise impossible");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="mc-page py-16">
        <div className="mc-empty mx-auto max-w-xl">
          <h1 className="text-xl font-bold text-ink">Leçon verrouillée ou indisponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button asChild className="mt-5"><Link href={courseId ? `/learn/${courseId}` : "/learn"}>Retour au cours</Link></Button>
        </div>
      </div>
    );
  }
  if (!data) return <div className="mc-page py-16 text-center text-sm text-muted-foreground">Chargement de la leçon…</div>;

  const { lesson, course, quiz } = data;
  const completed = data.progress?.status === "completed";

  return (
    <div className="mc-page">
      <div className="mx-auto max-w-5xl space-y-7">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost">
            <Link href={`/learn/${courseId}`}><ArrowLeft className="size-4" /> Programme</Link>
          </Button>
          {completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" /> Terminée
            </span>
          ) : null}
        </div>

        <section className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-white shadow-[0_24px_65px_-42px_rgb(20_50_104_/_50%)]">
          {lesson.lesson_type === "video" && lesson.video_url ? (
            <div className="aspect-video bg-black">
              {/\.(mp4|webm|ogg)(\?|$)/i.test(lesson.video_url) ? (
                <video controls className="h-full w-full" src={lesson.video_url} />
              ) : (
                <iframe
                  src={lesson.video_url}
                  title={lesson.title}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          ) : lesson.lesson_type === "live" && lesson.live_url ? (
            <div className="flex min-h-64 flex-col items-center justify-center bg-[linear-gradient(135deg,#143268,#214b86)] p-6 text-center text-white">
              <Video className="size-10 text-gold-bright" />
              <h2 className="mt-4 text-xl font-bold">Session en direct</h2>
              <p className="mt-2 max-w-md text-sm text-white/60">Utilisez le lien fourni par l’instructeur pour rejoindre la session.</p>
              <Button asChild className="mt-5 bg-gold-bright text-ink hover:bg-gold-bright">
                <a href={lesson.live_url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Rejoindre le live</a>
              </Button>
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            <p className="mc-kicker">{course.title}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-ink">{lesson.title}</h1>

            {lesson.content ? (
              <div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-foreground/80 sm:text-base sm:leading-8">
                {lesson.content}
              </div>
            ) : null}

            {lesson.resource_url ? (
              <Button asChild variant="outline" className="mt-6">
                <a href={lesson.resource_url} target="_blank" rel="noreferrer"><Download className="size-4" /> Télécharger la ressource</a>
              </Button>
            ) : null}

            {Array.isArray(lesson.resources) && lesson.resources.length ? (
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {lesson.resources.map((resource, index) => resource?.url ? (
                  <a key={index} href={resource.url} target="_blank" rel="noreferrer" className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm font-semibold text-ink hover:border-primary/30">
                    {resource.title || `Ressource ${index + 1}`}
                  </a>
                ) : null)}
              </div>
            ) : null}

            <div className="mt-8 flex justify-end border-t border-border pt-5">
              <Button onClick={completeLesson} disabled={busy || completed}>
                <CheckCircle2 className="size-4" />
                {completed ? "Leçon terminée" : "Marquer comme terminée"}
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="mc-panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-ink">
                <Bookmark className="size-4" />
              </span>
              <div>
                <p className="mc-kicker">Notes privées</p>
                <h2 className="mt-1 text-lg font-bold text-ink">Votre carnet de cours</h2>
              </div>
            </div>
            <Textarea
              className="mt-4 min-h-36"
              value={noteBody}
              onChange={event => setNoteBody(event.target.value)}
              placeholder="Résumé, idées à retenir, questions à approfondir…"
            />
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <input type="checkbox" checked={bookmarked} onChange={event => setBookmarked(event.target.checked)} />
              Ajouter cette leçon à mes favoris
            </label>
            <Button className="mt-4" variant="outline" onClick={savePrivateNote} disabled={busy}>
              <Save className="size-4" /> Enregistrer
            </Button>
          </div>

          <div className="mc-panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-accent text-primary">
                <ClipboardList className="size-4" />
              </span>
              <div>
                <p className="mc-kicker">Travail pratique</p>
                <h2 className="mt-1 text-lg font-bold text-ink">
                  {premium.assignment ? premium.assignment.title : "Aucun devoir pour cette leçon"}
                </h2>
              </div>
            </div>

            {premium.assignment ? (
              <div className="mt-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {premium.assignment.instructions}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-muted-foreground">
                    Seuil : {premium.assignment.passing_score} %
                  </span>
                  {premium.assignment.required ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
                      Obligatoire pour le certificat
                    </span>
                  ) : null}
                </div>

                {premium.assignment.submission_type !== "url" ? (
                  <Textarea
                    className="mt-4 min-h-32"
                    value={assignmentText}
                    onChange={event => setAssignmentText(event.target.value)}
                    placeholder="Votre réponse…"
                  />
                ) : null}
                {premium.assignment.submission_type !== "text" ? (
                  <input
                    className="mt-3 h-11 w-full rounded-xl border border-input bg-white px-3.5 text-sm"
                    value={assignmentUrl}
                    onChange={event => setAssignmentUrl(event.target.value)}
                    placeholder="https://…"
                    inputMode="url"
                  />
                ) : null}

                {premium.submission ? (
                  <div className="mt-4 rounded-2xl bg-secondary/45 p-3 text-sm">
                    <p className="font-bold text-ink">
                      {premium.submission.status === "graded"
                        ? premium.submission.passed
                          ? "Devoir validé"
                          : "Devoir corrigé"
                        : premium.submission.status === "revision_requested"
                          ? "Nouvelle version demandée"
                          : "En attente de correction"}
                    </p>
                    {premium.submission.score !== null && premium.submission.score !== undefined ? (
                      <p className="mt-1 text-muted-foreground">
                        Score : {premium.submission.score}/{premium.assignment.max_score}
                      </p>
                    ) : null}
                    {premium.submission.feedback ? (
                      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{premium.submission.feedback}</p>
                    ) : null}
                  </div>
                ) : null}

                <Button className="mt-4" onClick={submitAssignment} disabled={busy}>
                  <Send className="size-4" />
                  {premium.submission ? "Remettre une nouvelle version" : "Remettre le devoir"}
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                Cette leçon ne demande pas de travail à remettre.
              </p>
            )}
          </div>
        </section>

        {quiz ? (
          <section className="mc-panel p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mc-kicker">Quiz</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-ink">{quiz.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Score minimum : {quiz.passing_score}% · {quiz.attempts_used}/{quiz.max_attempts} tentative{quiz.max_attempts > 1 ? "s" : ""}
                </p>
              </div>
              {quiz.passed ? <CheckCircle2 className="size-6 text-emerald-600" /> : null}
            </div>

            <div className="mt-6 space-y-6">
              {quiz.questions.map((question, index) => {
                const selected = answers[question.id];
                const feedback = quizResult?.feedback?.[question.id];
                return (
                  <fieldset key={question.id} className="rounded-2xl border border-border/80 bg-secondary/25 p-4">
                    <legend className="px-1 text-sm font-bold text-ink">{index + 1}. {question.prompt}</legend>
                    <div className="mt-3 space-y-2">
                      {(question.options || (question.question_type === "true_false" ? ["true", "false"] : [])).map(option => {
                        const multiple = question.question_type === "multiple";
                        const checked = multiple ? Array.isArray(selected) && selected.includes(option) : selected === option;
                        return (
                          <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-3 py-2.5 text-sm">
                            <input
                              type={multiple ? "checkbox" : "radio"}
                              name={question.id}
                              checked={checked}
                              onChange={() => updateAnswer(question.id, option, multiple)}
                            />
                            <span>{option === "true" ? "Vrai" : option === "false" ? "Faux" : option}</span>
                          </label>
                        );
                      })}
                    </div>
                    {feedback ? (
                      <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${feedback.correct ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                        {feedback.correct ? "Bonne réponse." : "Réponse incorrecte."} {feedback.explanation || ""}
                      </div>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>

            {quizResult ? (
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-semibold">
                  <span>Résultat</span><span>{quizResult.score}%</span>
                </div>
                <Progress value={quizResult.score} className="h-2.5" />
              </div>
            ) : null}

            <Button className="mt-6" onClick={submitQuiz} disabled={busy || quiz.passed || quiz.attempts_used >= quiz.max_attempts}>
              {quiz.passed ? "Quiz réussi" : "Soumettre mes réponses"}
            </Button>
          </section>
        ) : null}

        <section className="mc-panel p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <MessageCircle className="size-5 text-primary" />
            <div>
              <p className="mc-kicker">Q&R</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Questions sur cette leçon</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.discussions.length ? data.discussions.map(item => (
              <div key={item.id} className="rounded-2xl border border-border/80 bg-secondary/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold text-ink">{item.user_name || "Apprenant"}</p>
                  <time className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString("fr-FR")}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            )) : <p className="text-sm text-muted-foreground">Aucune question pour l’instant.</p>}
          </div>

          <div className="mt-5 flex gap-3">
            <Textarea value={discussion} onChange={event => setDiscussion(event.target.value)} placeholder="Posez une question ou partagez un point utile…" />
            <Button size="icon" onClick={postDiscussion} disabled={busy || !discussion.trim()} aria-label="Publier">
              <Send className="size-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
