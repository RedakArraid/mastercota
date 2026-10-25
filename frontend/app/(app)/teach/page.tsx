"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, BookOpen, GraduationCap, Plus, Receipt, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AcademyCourse } from "@/lib/types";
import { formatAmount } from "@/lib/format";

type Instructor = { user_id: string; headline?: string | null; bio?: string | null; website_url?: string | null; status: string };
type PaymentReport = {
  id: string;
  course_title: string;
  learner_name?: string | null;
  learner_phone: string;
  amount: number | string;
  status: "pending" | "confirmed" | "rejected";
  created_at: string;
};

export default function TeachPage() {
  const [instructor, setInstructor] = useState<Instructor | null | undefined>(undefined);
  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [reports, setReports] = useState<PaymentReport[]>([]);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const me = await api<{ instructor: Instructor | null }>("/api/academy/me");
    setInstructor(me.instructor);
    if (me.instructor) {
      const [courseData, reportData] = await Promise.all([
        api<{ courses: AcademyCourse[] }>("/api/academy/instructor/courses"),
        api<{ reports: PaymentReport[] }>("/api/academy/instructor/payment-reports"),
      ]);
      setCourses(courseData.courses || []);
      setReports(reportData.reports || []);
    }
  }

  useEffect(() => {
    load().catch(error => toast.error(error instanceof Error ? error.message : "Chargement impossible"));
  }, []);

  async function activateInstructor() {
    setLoading(true);
    try {
      const result = await api<{ instructor: Instructor }>("/api/academy/instructor/profile", {
        method: "POST",
        body: JSON.stringify({ headline, bio }),
      });
      setInstructor(result.instructor);
      toast.success("Espace instructeur activé");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Activation impossible");
    } finally {
      setLoading(false);
    }
  }

  async function resolvePayment(reportId: string, action: "confirm" | "reject") {
    setLoading(true);
    try {
      await api(`/api/academy/instructor/payment-reports/${reportId}/${action}`, { method: "POST", body: "{}" });
      toast.success(action === "confirm" ? "Paiement confirmé, accès activé" : "Paiement rejeté");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action impossible");
    } finally {
      setLoading(false);
    }
  }

  if (instructor === undefined) {
    return <div className="mc-page py-16 text-center text-sm text-muted-foreground">Chargement de l’espace instructeur…</div>;
  }

  if (!instructor) {
    return (
      <div className="mc-page">
        <div className="mx-auto max-w-2xl space-y-7">
          <header className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary"><GraduationCap className="size-7" /></span>
            <p className="mc-kicker mt-5">Mastercota Academy</p>
            <h1 className="mt-2 mc-page-title">Transformez votre savoir-faire en cours structuré.</h1>
            <p className="mx-auto mt-3 max-w-xl mc-body">
              Publiez des leçons, quiz et ressources, suivez vos apprenants et recevez directement les paiements de vos cours.
            </p>
          </header>

          <section className="mc-panel p-5 sm:p-7">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="headline">Votre spécialité</Label>
                <Input id="headline" value={headline} onChange={event => setHeadline(event.target.value)} placeholder="Ex. Experte marketing digital" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Présentation</Label>
                <Textarea id="bio" value={bio} onChange={event => setBio(event.target.value)} placeholder="Votre expérience, votre approche pédagogique…" rows={6} />
              </div>
              <Button size="lg" className="w-full" onClick={activateInstructor} disabled={loading}>
                <GraduationCap className="size-4" />
                {loading ? "Activation…" : "Activer mon espace instructeur"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const pendingReports = reports.filter(report => report.status === "pending");

  return (
    <div className="mc-page space-y-8">
      <section className="relative overflow-hidden rounded-[1.7rem] bg-[linear-gradient(135deg,#143268_0%,#214b86_100%)] p-6 text-white sm:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-bright">Espace instructeur</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">Vos cours, vos apprenants, vos revenus.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Créez des programmes premium et gardez la maîtrise des accès et des paiements.
            </p>
          </div>
          <Button asChild size="lg" className="bg-gold-bright text-ink hover:bg-gold-bright">
            <Link href="/teach/create"><Plus className="size-4" /> Nouveau cours</Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="mc-stat">
          <BookOpen className="size-4 text-primary" />
          <p className="mt-2 text-2xl font-extrabold text-ink">{courses.length}</p>
          <p className="text-xs text-muted-foreground">cours créés</p>
        </div>
        <div className="mc-stat">
          <Users className="size-4 text-primary" />
          <p className="mt-2 text-2xl font-extrabold text-ink">{courses.reduce((sum, course) => sum + Number(course.learners_count || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">apprenants actifs</p>
        </div>
        <div className="mc-stat">
          <Receipt className="size-4 text-primary" />
          <p className="mt-2 text-2xl font-extrabold text-ink">{pendingReports.length}</p>
          <p className="text-xs text-muted-foreground">paiements à vérifier</p>
        </div>
      </div>

      {pendingReports.length ? (
        <section>
          <div className="mb-4">
            <p className="mc-kicker">À traiter</p>
            <h2 className="mt-1 mc-section-title">Paiements signalés</h2>
          </div>
          <div className="space-y-3">
            {pendingReports.map(report => (
              <div key={report.id} className="mc-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-ink">{report.course_title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {report.learner_name || report.learner_phone} · {formatAmount(Number(report.amount))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => resolvePayment(report.id, "reject")}>Rejeter</Button>
                  <Button size="sm" disabled={loading} onClick={() => resolvePayment(report.id, "confirm")}>Confirmer reçu</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mc-kicker">Catalogue instructeur</p>
            <h2 className="mt-1 mc-section-title">Mes cours</h2>
          </div>
        </div>

        {courses.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {courses.map(course => (
              <Link key={course.id} href={`/teach/${course.id}`} className="mc-panel group p-5 transition hover:-translate-y-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${course.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                      {course.status === "published" ? "Publié" : course.status === "archived" ? "Archivé" : "Brouillon"}
                    </span>
                    <h3 className="mt-3 line-clamp-2 text-lg font-extrabold tracking-[-0.025em] text-ink">{course.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {course.lessons_count || 0} leçons · {course.learners_count || 0} apprenants
                    </p>
                  </div>
                  <BarChart3 className="size-5 shrink-0 text-primary" />
                </div>
                <div className="mt-4 flex items-center gap-4 border-t border-border/70 pt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Star className="size-3.5" /> {Number(course.rating || 0).toFixed(1)}</span>
                  <span>{course.access_type === "paid" ? formatAmount(Number(course.price)) : course.access_type === "invite" ? "Privé" : "Gratuit"}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mc-empty">
            <GraduationCap className="mx-auto size-10 text-primary" />
            <h3 className="mt-4 text-xl font-bold text-ink">Créez votre premier cours</h3>
            <p className="mt-2 text-sm text-muted-foreground">Commencez par le titre et le modèle d’accès, puis ajoutez vos sections et leçons.</p>
            <Button asChild className="mt-5"><Link href="/teach/create">Créer un cours</Link></Button>
          </div>
        )}
      </section>
    </div>
  );
}
