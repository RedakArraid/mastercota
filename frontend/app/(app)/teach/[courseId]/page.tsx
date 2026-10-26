"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Gift,
  LockKeyhole,
  Megaphone,
  Plus,
  Send,
  Settings2,
  TicketPercent,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcademyCourse, AcademyLesson, AcademySection } from "@/lib/types";
import { formatAmount } from "@/lib/format";

type Analytics = {
  enrollments: { total: number; active: number; completed: number; pending: number };
  average_progress: number;
  revenue: number;
  payments: number;
  rating: number;
  reviews: number;
  lessons: Array<{ id: string; title: string; completions: number }>;
};

type CourseLearner = {
  id: string;
  status: "pending" | "active" | "completed" | "revoked";
  access_source: string;
  price_paid: number | string;
  currency: string;
  enrolled_at?: string | null;
  completed_at?: string | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  learner_name?: string | null;
  learner_phone: string;
  progress_percent: number;
};

export default function CourseBuilderPage({ params }: { params: Promise<{ courseId: string }> }) {
  const [courseId, setCourseId] = useState("");
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [outline, setOutline] = useState<AcademySection[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [learners, setLearners] = useState<CourseLearner[]>([]);
  const [busy, setBusy] = useState(false);

  const [sectionTitle, setSectionTitle] = useState("");
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, { title: string; type: string; content: string; url: string; duration: string; preview: boolean }>>({});
  const [coupon, setCoupon] = useState({ code: "", type: "percent", value: "", max: "" });
  const [invite, setInvite] = useState({ code: "", phone: "", max: "1" });
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });
  const [quizDraft, setQuizDraft] = useState({ lessonId: "", title: "Quiz", passing: "70", attempts: "3", prompt: "", options: "A\nB\nC", correct: "A", explanation: "" });

  async function load(id: string) {
    const [detail, stats, learnerData] = await Promise.all([
      api<{ course: AcademyCourse; outline: AcademySection[] }>(`/api/academy/instructor/courses/${id}`),
      api<Analytics>(`/api/academy/instructor/courses/${id}/analytics`).catch(() => null),
      api<{ enrollments: CourseLearner[] }>(`/api/academy/instructor/courses/${id}/enrollments`).catch(() => ({ enrollments: [] })),
    ]);
    setCourse(detail.course);
    setOutline(detail.outline || []);
    setAnalytics(stats);
    setLearners(learnerData.enrollments || []);
    setQuizDraft(current => current.lessonId ? current : { ...current, lessonId: detail.outline.flatMap(section => section.lessons)[0]?.id || "" });
  }

  useEffect(() => {
    params.then(({ courseId: id }) => {
      setCourseId(id);
      load(id).catch(error => toast.error(error instanceof Error ? error.message : "Cours introuvable"));
    });
  }, [params]);

  async function saveCourse(patch: Record<string, unknown>) {
    if (!courseId) return;
    setBusy(true);
    try {
      const data = await api<{ course: AcademyCourse }>(`/api/academy/instructor/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setCourse(data.course);
      toast.success(patch.status === "published" ? "Cours publié" : "Cours mis à jour");
      await load(courseId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour impossible");
    } finally {
      setBusy(false);
    }
  }

  async function addSection() {
    if (!sectionTitle.trim()) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/courses/${courseId}/sections`, {
        method: "POST",
        body: JSON.stringify({ title: sectionTitle.trim(), position: outline.length + 1 }),
      });
      setSectionTitle("");
      await load(courseId);
      toast.success("Section ajoutée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }

  function draftFor(sectionId: string) {
    return lessonDrafts[sectionId] || { title: "", type: "text", content: "", url: "", duration: "", preview: false };
  }

  function updateLessonDraft(sectionId: string, patch: Partial<ReturnType<typeof draftFor>>) {
    setLessonDrafts(current => ({ ...current, [sectionId]: { ...draftFor(sectionId), ...patch } }));
  }

  async function addLesson(section: AcademySection) {
    const draft = draftFor(section.id);
    if (!draft.title.trim()) return;
    setBusy(true);
    try {
      const urlKey = draft.type === "video" ? "video_url" : draft.type === "live" ? "live_url" : draft.type === "download" ? "resource_url" : null;
      await api(`/api/academy/instructor/sections/${section.id}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: draft.title.trim(),
          lesson_type: draft.type,
          content: draft.content.trim() || null,
          ...(urlKey && draft.url.trim() ? { [urlKey]: draft.url.trim() } : {}),
          duration_minutes: Number(draft.duration || 0),
          position: section.lessons.length + 1,
          preview: draft.preview,
          published: true,
        }),
      });
      setLessonDrafts(current => ({ ...current, [section.id]: { title: "", type: "text", content: "", url: "", duration: "", preview: false } }));
      await load(courseId);
      toast.success("Leçon ajoutée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout impossible");
    } finally {
      setBusy(false);
    }
  }

  async function createQuiz() {
    if (!quizDraft.lessonId || !quizDraft.prompt.trim()) {
      toast.error("Choisissez une leçon et ajoutez une question");
      return;
    }
    setBusy(true);
    try {
      const quiz = await api<{ quiz: { id: string } }>(`/api/academy/instructor/lessons/${quizDraft.lessonId}/quiz`, {
        method: "POST",
        body: JSON.stringify({
          title: quizDraft.title || "Quiz",
          passing_score: Number(quizDraft.passing || 70),
          max_attempts: Number(quizDraft.attempts || 3),
        }),
      });
      const options = quizDraft.options.split("\n").map(value => value.trim()).filter(Boolean);
      await api(`/api/academy/instructor/quizzes/${quiz.quiz.id}/questions`, {
        method: "POST",
        body: JSON.stringify({
          prompt: quizDraft.prompt.trim(),
          question_type: "single",
          options,
          correct_answers: [quizDraft.correct.trim()],
          explanation: quizDraft.explanation.trim() || null,
          points: 1,
          position: 1,
        }),
      });
      setQuizDraft(current => ({ ...current, prompt: "", explanation: "" }));
      await load(courseId);
      toast.success("Quiz ajouté à la leçon");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quiz impossible");
    } finally {
      setBusy(false);
    }
  }

  async function createCoupon() {
    if (!coupon.code.trim() || !coupon.value) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/courses/${courseId}/coupons`, {
        method: "POST",
        body: JSON.stringify({
          code: coupon.code.trim(),
          discount_type: coupon.type,
          discount_value: Number(coupon.value),
          max_uses: coupon.max ? Number(coupon.max) : null,
        }),
      });
      setCoupon({ code: "", type: "percent", value: "", max: "" });
      toast.success("Coupon créé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coupon impossible");
    } finally {
      setBusy(false);
    }
  }

  async function createInvite() {
    setBusy(true);
    try {
      const result = await api<{ invite: { code: string } }>(`/api/academy/instructor/courses/${courseId}/invites`, {
        method: "POST",
        body: JSON.stringify({ code: invite.code.trim() || undefined, phone: invite.phone.trim() || null, max_uses: Number(invite.max || 1) }),
      });
      setInvite({ code: "", phone: "", max: "1" });
      toast.success(`Invitation créée : ${result.invite.code}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invitation impossible");
    } finally {
      setBusy(false);
    }
  }

  async function updateLearnerAccess(enrollment: CourseLearner, action: "revoke" | "restore") {
    const reason = action === "revoke"
      ? window.prompt("Motif de la suspension (remboursement, fraude, erreur, autre)")
      : null;
    if (action === "revoke" && !reason?.trim()) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/enrollments/${enrollment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action, ...(reason ? { reason: reason.trim() } : {}) }),
      });
      await load(courseId);
      toast.success(action === "revoke" ? "Accès suspendu" : "Accès restauré");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Modification d’accès impossible");
    } finally {
      setBusy(false);
    }
  }

  async function sendAnnouncement() {
    if (!announcement.title.trim() || !announcement.body.trim()) return;
    setBusy(true);
    try {
      await api(`/api/academy/instructor/courses/${courseId}/announcements`, {
        method: "POST",
        body: JSON.stringify(announcement),
      });
      setAnnouncement({ title: "", body: "" });
      toast.success("Annonce envoyée aux apprenants");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Annonce impossible");
    } finally {
      setBusy(false);
    }
  }

  const lessons = useMemo(() => outline.flatMap(section => section.lessons), [outline]);

  if (!course) return <div className="mc-page py-16 text-center text-sm text-muted-foreground">Chargement du builder…</div>;

  return (
    <div className="mc-page space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" className="-ml-3 mb-2"><Link href="/teach"><ArrowLeft className="size-4" /> Mes cours</Link></Button>
          <p className="mc-kicker">Builder Academy</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-ink">{course.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {course.status === "published" ? "Publié" : course.status === "archived" ? "Archivé" : "Brouillon"} · {lessons.length} leçon{lessons.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {course.status === "published" ? (
            <Button asChild variant="outline"><Link href={`/academy/${course.slug}`} target="_blank">Voir la page publique</Link></Button>
          ) : null}
          <Button disabled={busy || !lessons.length} onClick={() => saveCourse({ status: course.status === "published" ? "draft" : "published" })}>
            <CheckCircle2 className="size-4" />
            {course.status === "published" ? "Repasse en brouillon" : "Publier le cours"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-5">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="content"><BookOpen className="size-4" /> Contenu</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="size-4" /> Réglages</TabsTrigger>
          <TabsTrigger value="sales"><TicketPercent className="size-4" /> Vente</TabsTrigger>
          <TabsTrigger value="learners"><Users className="size-4" /> Apprenants</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="size-4" /> Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {outline.map((section, sectionIndex) => {
            const draft = draftFor(section.id);
            return (
              <section key={section.id} className="mc-panel overflow-hidden">
                <div className="border-b border-border/70 bg-secondary/45 px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Section {sectionIndex + 1}</p>
                  <h2 className="mt-1 text-lg font-bold text-ink">{section.title}</h2>
                </div>

                <div className="divide-y divide-border/70">
                  {section.lessons.map((lesson, index) => (
                    <div key={lesson.id} className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{index + 1}. {lesson.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lesson.lesson_type} · {lesson.duration_minutes || 0} min
                          {lesson.preview ? " · aperçu" : ""}
                          {lesson.quiz_id ? " · quiz" : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                        {lesson.published === false ? "Masquée" : "Publiée"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border bg-white/70 p-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Ajouter une leçon</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input value={draft.title} onChange={event => updateLessonDraft(section.id, { title: event.target.value })} placeholder="Titre de la leçon" />
                    <select value={draft.type} onChange={event => updateLessonDraft(section.id, { type: event.target.value })} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
                      <option value="text">Texte</option>
                      <option value="video">Vidéo</option>
                      <option value="live">Live</option>
                      <option value="download">Ressource</option>
                    </select>
                    <Input value={draft.duration} onChange={event => updateLessonDraft(section.id, { duration: event.target.value })} inputMode="numeric" placeholder="Durée (minutes)" />
                    {draft.type !== "text" ? <Input value={draft.url} onChange={event => updateLessonDraft(section.id, { url: event.target.value })} placeholder={draft.type === "video" ? "URL vidéo" : draft.type === "live" ? "URL du live" : "URL ressource"} /> : <div />}
                  </div>
                  <Textarea className="mt-3" value={draft.content} onChange={event => updateLessonDraft(section.id, { content: event.target.value })} placeholder="Texte, résumé, consignes ou ressources complémentaires…" />
                  <label className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <input type="checkbox" checked={draft.preview} onChange={event => updateLessonDraft(section.id, { preview: event.target.checked })} />
                    Autoriser cette leçon en aperçu
                  </label>
                  <Button className="mt-4" onClick={() => addLesson(section)} disabled={busy || !draft.title.trim()}><Plus className="size-4" /> Ajouter la leçon</Button>
                </div>
              </section>
            );
          })}

          <section className="mc-panel p-5">
            <Label htmlFor="section-title">Nouvelle section</Label>
            <div className="mt-2 flex gap-2">
              <Input id="section-title" value={sectionTitle} onChange={event => setSectionTitle(event.target.value)} placeholder="Ex. Module 2 · Acquisition" />
              <Button onClick={addSection} disabled={busy || !sectionTitle.trim()}><Plus className="size-4" /> Ajouter</Button>
            </div>
          </section>

          {lessons.length ? (
            <section className="mc-panel p-5 sm:p-6">
              <p className="mc-kicker">Évaluation</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Ajouter un quiz à une leçon</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select value={quizDraft.lessonId} onChange={event => setQuizDraft(current => ({ ...current, lessonId: event.target.value }))} className="h-11 rounded-xl border border-input bg-white px-3 text-sm">
                  {lessons.map(lesson => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                </select>
                <Input value={quizDraft.title} onChange={event => setQuizDraft(current => ({ ...current, title: event.target.value }))} placeholder="Titre du quiz" />
                <Input value={quizDraft.passing} onChange={event => setQuizDraft(current => ({ ...current, passing: event.target.value }))} placeholder="Score minimum %" />
                <Input value={quizDraft.attempts} onChange={event => setQuizDraft(current => ({ ...current, attempts: event.target.value }))} placeholder="Tentatives max" />
              </div>
              <Textarea className="mt-3" value={quizDraft.prompt} onChange={event => setQuizDraft(current => ({ ...current, prompt: event.target.value }))} placeholder="Question" />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Textarea value={quizDraft.options} onChange={event => setQuizDraft(current => ({ ...current, options: event.target.value }))} placeholder={"Une option par ligne\nA\nB\nC"} />
                <div className="space-y-3">
                  <Input value={quizDraft.correct} onChange={event => setQuizDraft(current => ({ ...current, correct: event.target.value }))} placeholder="Réponse correcte exacte" />
                  <Textarea value={quizDraft.explanation} onChange={event => setQuizDraft(current => ({ ...current, explanation: event.target.value }))} placeholder="Explication après réponse" />
                </div>
              </div>
              <Button className="mt-4" onClick={createQuiz} disabled={busy || !quizDraft.prompt.trim()}>Créer le quiz et la première question</Button>
            </section>
          ) : null}
        </TabsContent>

        <TabsContent value="settings">
          <section className="mc-panel p-5 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Titre</Label>
                <Input defaultValue={course.title} onBlur={event => event.target.value !== course.title && saveCourse({ title: event.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description</Label>
                <Textarea defaultValue={course.description || ""} onBlur={event => event.target.value !== (course.description || "") && saveCourse({ description: event.target.value })} rows={6} />
              </div>
              <div className="space-y-2">
                <Label>Image de couverture (URL)</Label>
                <Input defaultValue={course.cover_url || ""} onBlur={event => event.target.value !== (course.cover_url || "") && saveCourse({ cover_url: event.target.value || null })} />
              </div>
              <div className="space-y-2">
                <Label>Bande-annonce (URL)</Label>
                <Input defaultValue={course.trailer_url || ""} onBlur={event => event.target.value !== (course.trailer_url || "") && saveCourse({ trailer_url: event.target.value || null })} />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-border p-4 text-sm">
                <input type="checkbox" defaultChecked={course.sequential !== false} onChange={event => saveCourse({ sequential: event.target.checked })} />
                <div><p className="font-bold text-ink">Progression séquentielle</p><p className="text-xs text-muted-foreground">Oblige à terminer les leçons précédentes.</p></div>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-border p-4 text-sm">
                <input type="checkbox" defaultChecked={course.certificate_enabled !== false} onChange={event => saveCourse({ certificate_enabled: event.target.checked })} />
                <div><p className="font-bold text-ink">Certificat</p><p className="text-xs text-muted-foreground">Émis automatiquement après complétion et quiz réussis.</p></div>
              </label>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <section className="mc-panel p-5 sm:p-6">
            <div className="flex items-center gap-3"><TicketPercent className="size-5 text-primary" /><div><p className="mc-kicker">Promotion</p><h2 className="mt-1 text-xl font-bold text-ink">Créer un coupon</h2></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <Input value={coupon.code} onChange={event => setCoupon(current => ({ ...current, code: event.target.value }))} placeholder="CODE" />
              <select value={coupon.type} onChange={event => setCoupon(current => ({ ...current, type: event.target.value }))} className="h-11 rounded-xl border border-input bg-white px-3 text-sm"><option value="percent">Pourcentage</option><option value="fixed">Montant fixe</option></select>
              <Input value={coupon.value} onChange={event => setCoupon(current => ({ ...current, value: event.target.value }))} placeholder="Réduction" />
              <Input value={coupon.max} onChange={event => setCoupon(current => ({ ...current, max: event.target.value }))} placeholder="Utilisations max" />
            </div>
            <Button className="mt-3" onClick={createCoupon} disabled={busy}>Créer le coupon</Button>
          </section>

          <section className="mc-panel p-5 sm:p-6">
            <div className="flex items-center gap-3"><LockKeyhole className="size-5 text-primary" /><div><p className="mc-kicker">Accès privé</p><h2 className="mt-1 text-xl font-bold text-ink">Créer une invitation</h2></div></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Input value={invite.code} onChange={event => setInvite(current => ({ ...current, code: event.target.value }))} placeholder="Code (optionnel)" />
              <Input value={invite.phone} onChange={event => setInvite(current => ({ ...current, phone: event.target.value }))} placeholder="Téléphone réservé (optionnel)" />
              <Input value={invite.max} onChange={event => setInvite(current => ({ ...current, max: event.target.value }))} placeholder="Nombre d’utilisations" />
            </div>
            <Button className="mt-3" onClick={createInvite} disabled={busy}><Gift className="size-4" /> Créer l’invitation</Button>
          </section>

          <section className="mc-panel p-5 sm:p-6">
            <div className="flex items-center gap-3"><Megaphone className="size-5 text-primary" /><div><p className="mc-kicker">Communication</p><h2 className="mt-1 text-xl font-bold text-ink">Annonce aux apprenants</h2></div></div>
            <Input className="mt-4" value={announcement.title} onChange={event => setAnnouncement(current => ({ ...current, title: event.target.value }))} placeholder="Titre de l’annonce" />
            <Textarea className="mt-3" value={announcement.body} onChange={event => setAnnouncement(current => ({ ...current, body: event.target.value }))} placeholder="Nouveau module, live, ressource…" />
            <Button className="mt-3" onClick={sendAnnouncement} disabled={busy || !announcement.title.trim() || !announcement.body.trim()}><Send className="size-4" /> Envoyer l’annonce</Button>
          </section>
        </TabsContent>

        <TabsContent value="learners">
          <section className="mc-panel overflow-hidden">
            <div className="border-b border-border/70 p-5 sm:p-6">
              <p className="mc-kicker">Accès au cours</p>
              <h2 className="mt-1 text-xl font-bold text-ink">Apprenants</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Suspendez un accès après un remboursement, une fraude ou une erreur. Mastercota ne rembourse pas les fonds : le remboursement reste à effectuer directement par l’instructeur.
              </p>
            </div>
            {learners.length ? (
              <div className="divide-y divide-border/70">
                {learners.map(learner => (
                  <div key={learner.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink">{learner.learner_name || learner.learner_phone}</p>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                          {learner.status === "completed" ? "Terminé" : learner.status === "active" ? "Actif" : learner.status === "revoked" ? "Suspendu" : "Paiement en attente"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {learner.learner_phone} · {learner.progress_percent || 0}% · {learner.access_source}
                        {Number(learner.price_paid) > 0 ? ` · ${formatAmount(Number(learner.price_paid))}` : ""}
                      </p>
                      {learner.status === "revoked" && learner.revocation_reason ? (
                        <p className="mt-2 text-xs text-destructive">Motif : {learner.revocation_reason}</p>
                      ) : null}
                    </div>
                    {learner.status === "active" || learner.status === "completed" ? (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => updateLearnerAccess(learner, "revoke")}>
                        <UserX className="size-4" /> Suspendre
                      </Button>
                    ) : learner.status === "revoked" ? (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => updateLearnerAccess(learner, "restore")}>
                        <UserCheck className="size-4" /> Restaurer
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">Aucun apprenant pour l’instant.</div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="analytics">
          {analytics ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="mc-stat"><Users className="size-4 text-primary" /><p className="mt-2 text-2xl font-extrabold text-ink">{analytics.enrollments.total}</p><p className="text-xs text-muted-foreground">inscriptions</p></div>
                <div className="mc-stat"><CheckCircle2 className="size-4 text-primary" /><p className="mt-2 text-2xl font-extrabold text-ink">{analytics.enrollments.completed}</p><p className="text-xs text-muted-foreground">cours terminés</p></div>
                <div className="mc-stat"><BarChart3 className="size-4 text-primary" /><p className="mt-2 text-2xl font-extrabold text-ink">{Number(analytics.average_progress).toFixed(0)}%</p><p className="text-xs text-muted-foreground">progression moyenne</p></div>
                <div className="mc-stat"><TicketPercent className="size-4 text-primary" /><p className="mt-2 text-2xl font-extrabold text-ink">{formatAmount(Number(analytics.revenue))}</p><p className="text-xs text-muted-foreground">volume confirmé</p></div>
              </div>
              <section className="mc-panel p-5">
                <p className="mc-kicker">Performance des leçons</p>
                <div className="mt-4 space-y-3">
                  {analytics.lessons.map(lesson => (
                    <div key={lesson.id} className="flex items-center justify-between gap-4 rounded-xl bg-secondary/40 px-4 py-3 text-sm">
                      <span className="font-semibold text-ink">{lesson.title}</span>
                      <span className="text-muted-foreground">{lesson.completions} complétions</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : <p className="text-sm text-muted-foreground">Analytics en cours de calcul…</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
