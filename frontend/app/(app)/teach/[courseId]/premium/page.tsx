"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, Plus, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AcademyLesson, AcademySection } from "@/lib/types";

type Submission = {
  id: string;
  user_id: string;
  learner_name?: string | null;
  learner_phone: string;
  status: "submitted" | "graded" | "revision_requested";
  score?: number | null;
  passed?: boolean | null;
  feedback?: string | null;
  text_content?: string | null;
  submission_url?: string | null;
  submitted_at: string;
};

type Assignment = {
  id: string;
  lesson_id: string;
  lesson_title: string;
  title: string;
  instructions: string;
  submission_type: "text" | "url" | "text_or_url";
  max_score: number;
  passing_score: number;
  required: boolean;
  due_after_days?: number | null;
  submissions: Submission[];
};

type Cohort = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  capacity?: number | null;
  members: Array<{ user_id: string; learner_name?: string | null; learner_phone: string }>;
  sessions: Array<{
    id: string;
    title: string;
    starts_at: string;
    duration_minutes: number;
    meeting_url: string;
    recording_url?: string | null;
    notes?: string | null;
  }>;
};

type Learner = {
  id: string;
  user_id: string;
  learner_name?: string | null;
  learner_phone: string;
};

type PremiumPayload = {
  course: { id: string; title: string };
  assignments: Assignment[];
  cohorts: Cohort[];
  learners: Learner[];
};

export default function AcademyPremiumPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const [courseId, setCourseId] = useState("");
  const [data, setData] = useState<PremiumPayload | null>(null);
  const [outline, setOutline] = useState<AcademySection[]>([]);
  const [busy, setBusy] = useState(false);
  const [assignment, setAssignment] = useState({
    lessonId: "",
    title: "",
    instructions: "",
    type: "text_or_url",
    maxScore: "100",
    passingScore: "60",
    dueDays: "",
    required: true,
  });
  const [cohort, setCohort] = useState({
    title: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
  });
  const [session, setSession] = useState({
    cohortId: "",
    title: "",
    startsAt: "",
    duration: "60",
    meetingUrl: "",
    recordingUrl: "",
    notes: "",
  });
  const [member, setMember] = useState({ cohortId: "", userId: "" });
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, { score: string; feedback: string }>>({});

  async function load(id: string) {
    const [premium, course] = await Promise.all([
      api<PremiumPayload>(`/api/academy/instructor/courses/${id}/premium`),
      api<{ outline: AcademySection[] }>(`/api/academy/instructor/courses/${id}`),
    ]);
    setData(premium);
    setOutline(course.outline || []);
    const firstLesson = course.outline.flatMap(section => section.lessons)[0];
    setAssignment(current => current.lessonId ? current : { ...current, lessonId: firstLesson?.id || "" });
    setSession(current => current.cohortId ? current : { ...current, cohortId: premium.cohorts[0]?.id || "" });
    setMember(current => ({
      cohortId: current.cohortId || premium.cohorts[0]?.id || "",
      userId: current.userId || premium.learners[0]?.user_id || "",
    }));
  }

  useEffect(() => {
    params.then(({ courseId: id }) => {
      setCourseId(id);
      load(id).catch(error => toast.error(error instanceof Error ? error.message : "Premium Academy indisponible"));
    });
  }, [params]);

  const lessons = useMemo<AcademyLesson[]>(() => outline.flatMap(section => section.lessons), [outline]);

  async function createAssignment() {
    if (!assignment.lessonId || !assignment.title.trim() || !assignment.instructions.trim()) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/lessons/${assignment.lessonId}/assignment`, {
        method: "PUT",
        body: JSON.stringify({
          title: assignment.title.trim(),
          instructions: assignment.instructions.trim(),
          submission_type: assignment.type,
          max_score: Number(assignment.maxScore || 100),
          passing_score: Number(assignment.passingScore || 60),
          due_after_days: assignment.dueDays ? Number(assignment.dueDays) : null,
          required: assignment.required,
        }),
      });
      setAssignment(current => ({ ...current, title: "", instructions: "" }));
      await load(courseId);
      toast.success("Devoir enregistré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Devoir impossible");
    } finally {
      setBusy(false);
    }
  }

  async function gradeSubmission(submissionId: string, requestRevision = false) {
    const draft = gradeDrafts[submissionId] || { score: "0", feedback: "" };
    setBusy(true);
    try {
      await api(`/api/academy/instructor/submissions/${submissionId}/grade`, {
        method: "POST",
        body: JSON.stringify({
          score: Number(draft.score || 0),
          feedback: draft.feedback.trim() || null,
          request_revision: requestRevision,
        }),
      });
      await load(courseId);
      toast.success(requestRevision ? "Révision demandée" : "Correction enregistrée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Correction impossible");
    } finally {
      setBusy(false);
    }
  }

  async function createCohort() {
    if (!cohort.title.trim() || !cohort.startsAt) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/courses/${courseId}/cohorts`, {
        method: "POST",
        body: JSON.stringify({
          title: cohort.title.trim(),
          starts_at: new Date(cohort.startsAt).toISOString(),
          ends_at: cohort.endsAt ? new Date(cohort.endsAt).toISOString() : null,
          capacity: cohort.capacity ? Number(cohort.capacity) : null,
        }),
      });
      setCohort({ title: "", startsAt: "", endsAt: "", capacity: "" });
      await load(courseId);
      toast.success("Cohorte créée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cohorte impossible");
    } finally {
      setBusy(false);
    }
  }

  async function addMember() {
    if (!member.cohortId || !member.userId) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/cohorts/${member.cohortId}/members/${member.userId}`, {
        method: "POST",
      });
      await load(courseId);
      toast.success("Apprenant ajouté à la cohorte");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }

  async function createSession() {
    if (!session.cohortId || !session.title.trim() || !session.startsAt || !session.meetingUrl.trim()) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/cohorts/${session.cohortId}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          title: session.title.trim(),
          starts_at: new Date(session.startsAt).toISOString(),
          duration_minutes: Number(session.duration || 60),
          meeting_url: session.meetingUrl.trim(),
          recording_url: session.recordingUrl.trim() || null,
          notes: session.notes.trim() || null,
        }),
      });
      setSession(current => ({ ...current, title: "", startsAt: "", meetingUrl: "", recordingUrl: "", notes: "" }));
      await load(courseId);
      toast.success("Session live planifiée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Session impossible");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <div className="mc-page py-16 text-center text-sm text-muted-foreground">Chargement des fonctions premium…</div>;
  }

  return (
    <div className="mc-page space-y-7">
      <header>
        <Button asChild variant="ghost" className="-ml-3 mb-3">
          <Link href={`/teach/${courseId}`}><ArrowLeft className="size-4" /> Builder du cours</Link>
        </Button>
        <p className="mc-kicker">Academy Premium</p>
        <h1 className="mt-1 mc-page-title">{data.course.title}</h1>
        <p className="mt-3 mc-body">Devoirs, corrections, cohortes et sessions live.</p>
      </header>

      <section className="mc-panel p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <ClipboardList className="size-5 text-primary" />
          <div>
            <p className="mc-kicker">Évaluation avancée</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Devoir noté</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <select
            value={assignment.lessonId}
            onChange={event => setAssignment(current => ({ ...current, lessonId: event.target.value }))}
            className="h-11 rounded-xl border border-input bg-white px-3 text-sm"
          >
            {lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
          </select>
          <Input value={assignment.title} onChange={event => setAssignment(current => ({ ...current, title: event.target.value }))} placeholder="Titre du devoir" />
          <select
            value={assignment.type}
            onChange={event => setAssignment(current => ({ ...current, type: event.target.value }))}
            className="h-11 rounded-xl border border-input bg-white px-3 text-sm"
          >
            <option value="text">Texte</option>
            <option value="url">Lien</option>
            <option value="text_or_url">Texte ou lien</option>
          </select>
          <Input value={assignment.dueDays} onChange={event => setAssignment(current => ({ ...current, dueDays: event.target.value }))} inputMode="numeric" placeholder="Délai après inscription (jours)" />
          <Input value={assignment.maxScore} onChange={event => setAssignment(current => ({ ...current, maxScore: event.target.value }))} inputMode="numeric" placeholder="Score max" />
          <Input value={assignment.passingScore} onChange={event => setAssignment(current => ({ ...current, passingScore: event.target.value }))} inputMode="numeric" placeholder="Seuil de réussite %" />
        </div>
        <Textarea className="mt-3" value={assignment.instructions} onChange={event => setAssignment(current => ({ ...current, instructions: event.target.value }))} placeholder="Consignes détaillées du devoir…" />
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={assignment.required} onChange={event => setAssignment(current => ({ ...current, required: event.target.checked }))} />
          Obligatoire pour terminer le cours et obtenir le certificat
        </label>
        <Button className="mt-4" onClick={createAssignment} disabled={busy || !assignment.lessonId || !assignment.title.trim() || !assignment.instructions.trim()}>
          <Plus className="size-4" /> Enregistrer le devoir
        </Button>
      </section>

      {data.assignments.map(item => (
        <section key={item.id} className="mc-panel overflow-hidden">
          <div className="border-b border-border/70 bg-secondary/40 p-5">
            <p className="text-xs font-semibold text-primary">{item.lesson_title}</p>
            <h2 className="mt-1 text-lg font-bold text-ink">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.submissions.length} remise{item.submissions.length > 1 ? "s" : ""}</p>
          </div>
          {item.submissions.length ? (
            <div className="divide-y divide-border/70">
              {item.submissions.map(submission => {
                const draft = gradeDrafts[submission.id] || {
                  score: submission.score?.toString() || "",
                  feedback: submission.feedback || "",
                };
                return (
                  <div key={submission.id} className="p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink">{submission.learner_name || submission.learner_phone}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Statut : {submission.status}</p>
                        {submission.text_content ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{submission.text_content}</p> : null}
                        {submission.submission_url ? <a className="mt-2 inline-block text-sm font-semibold text-primary hover:underline" href={submission.submission_url} target="_blank" rel="noreferrer">Ouvrir la remise</a> : null}
                      </div>
                      <div className="w-full max-w-md space-y-2">
                        <Input
                          value={draft.score}
                          onChange={event => setGradeDrafts(current => ({ ...current, [submission.id]: { ...draft, score: event.target.value } }))}
                          inputMode="numeric"
                          placeholder={`Score / ${item.max_score}`}
                        />
                        <Textarea
                          value={draft.feedback}
                          onChange={event => setGradeDrafts(current => ({ ...current, [submission.id]: { ...draft, feedback: event.target.value } }))}
                          placeholder="Feedback de correction"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => gradeSubmission(submission.id)} disabled={busy || !draft.score}>
                            <CheckCircle2 className="size-3.5" /> Noter
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => gradeSubmission(submission.id, true)} disabled={busy}>
                            Demander une révision
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">Aucune remise pour l’instant.</p>
          )}
        </section>
      ))}

      <section className="mc-panel p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <Users className="size-5 text-primary" />
          <div>
            <p className="mc-kicker">Cohortes</p>
            <h2 className="mt-1 text-xl font-bold text-ink">Organiser une promotion</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Input value={cohort.title} onChange={event => setCohort(current => ({ ...current, title: event.target.value }))} placeholder="Ex. Promotion Novembre 2026" />
          <Input type="datetime-local" value={cohort.startsAt} onChange={event => setCohort(current => ({ ...current, startsAt: event.target.value }))} />
          <Input type="datetime-local" value={cohort.endsAt} onChange={event => setCohort(current => ({ ...current, endsAt: event.target.value }))} />
          <Input value={cohort.capacity} onChange={event => setCohort(current => ({ ...current, capacity: event.target.value }))} inputMode="numeric" placeholder="Capacité (optionnel)" />
        </div>
        <Button className="mt-4" onClick={createCohort} disabled={busy || !cohort.title.trim() || !cohort.startsAt}>
          <Plus className="size-4" /> Créer la cohorte
        </Button>
      </section>

      {data.cohorts.length ? (
        <section className="mc-panel p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <CalendarDays className="size-5 text-primary" />
            <div>
              <p className="mc-kicker">Calendrier</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Sessions live et membres</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <select value={session.cohortId} onChange={event => setSession(current => ({ ...current, cohortId: event.target.value }))} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
              {data.cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <Input value={session.title} onChange={event => setSession(current => ({ ...current, title: event.target.value }))} placeholder="Titre de la session" />
            <Input type="datetime-local" value={session.startsAt} onChange={event => setSession(current => ({ ...current, startsAt: event.target.value }))} />
            <Input value={session.duration} onChange={event => setSession(current => ({ ...current, duration: event.target.value }))} inputMode="numeric" placeholder="Durée en minutes" />
            <Input value={session.meetingUrl} onChange={event => setSession(current => ({ ...current, meetingUrl: event.target.value }))} placeholder="Lien HTTPS du live" />
            <Input value={session.recordingUrl} onChange={event => setSession(current => ({ ...current, recordingUrl: event.target.value }))} placeholder="Replay (optionnel)" />
          </div>
          <Textarea className="mt-3" value={session.notes} onChange={event => setSession(current => ({ ...current, notes: event.target.value }))} placeholder="Notes pratiques pour les apprenants" />
          <Button className="mt-4" onClick={createSession} disabled={busy || !session.cohortId || !session.title.trim() || !session.startsAt || !session.meetingUrl.trim()}>
            <Send className="size-4" /> Planifier la session
          </Button>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <select value={member.cohortId} onChange={event => setMember(current => ({ ...current, cohortId: event.target.value }))} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
              {data.cohorts.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <select value={member.userId} onChange={event => setMember(current => ({ ...current, userId: event.target.value }))} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
              {data.learners.map(item => <option key={item.user_id} value={item.user_id}>{item.learner_name || item.learner_phone}</option>)}
            </select>
            <Button variant="outline" onClick={addMember} disabled={busy || !member.cohortId || !member.userId}>
              <Users className="size-4" /> Ajouter à la cohorte
            </Button>
          </div>

          <div className="mt-7 space-y-4">
            {data.cohorts.map(item => (
              <div key={item.id} className="rounded-2xl border border-border/80 bg-secondary/30 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{item.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.starts_at).toLocaleDateString("fr-FR")} · {item.members.length} membre{item.members.length > 1 ? "s" : ""}
                      {item.capacity ? ` / ${item.capacity}` : ""}
                    </p>
                  </div>
                </div>
                {item.sessions.length ? (
                  <div className="mt-3 space-y-2">
                    {item.sessions.map(sessionItem => (
                      <div key={sessionItem.id} className="rounded-xl bg-white p-3 text-sm">
                        <p className="font-semibold text-ink">{sessionItem.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(sessionItem.starts_at).toLocaleString("fr-FR")} · {sessionItem.duration_minutes} min
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
