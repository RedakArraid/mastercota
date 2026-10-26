"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";
import type { AcademyCourse } from "@/lib/types";

type AdminCourse = AcademyCourse & {
  instructor_phone?: string;
  enrollments?: number;
};

type Stats = {
  courses: { total: number; published: number };
  enrollments: { total: number; completed: number };
  direct_payment_volume: number;
  certificates: number;
};

export default function AdminAcademyPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [courseData, statsData] = await Promise.all([
      api<{ courses: AdminCourse[] }>("/api/academy/admin/courses"),
      api<Stats>("/api/academy/admin/stats"),
    ]);
    setCourses(courseData.courses || []);
    setStats(statsData);
  }

  useEffect(() => {
    load()
      .catch(error => toast.error(error instanceof Error ? error.message : "Chargement impossible"))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: "draft" | "published" | "archived") {
    try {
      await api(`/api/academy/admin/courses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Statut du cours mis à jour");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Modification impossible");
    }
  }

  if (loading) return <p className="text-sm text-[#6b7a95]">Chargement Academy…</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7a95]">Mastercota Academy</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#143268] md:text-3xl">Cours et apprentissage</h1>
        <p className="mt-2 text-sm text-[#6b7a95]">
          Modération des cours, volume de paiements directs, complétions et certificats.
        </p>
      </div>

      {stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[#d8e0ec] bg-white p-5">
            <BookOpen className="size-5 text-[#da9810]" />
            <p className="mt-3 text-2xl font-bold text-[#143268]">{stats.courses.total}</p>
            <p className="text-xs text-[#6b7a95]">{stats.courses.published} publiés</p>
          </div>
          <div className="rounded-2xl border border-[#d8e0ec] bg-white p-5">
            <Users className="size-5 text-[#da9810]" />
            <p className="mt-3 text-2xl font-bold text-[#143268]">{stats.enrollments.total}</p>
            <p className="text-xs text-[#6b7a95]">inscriptions</p>
          </div>
          <div className="rounded-2xl border border-[#d8e0ec] bg-white p-5">
            <CheckCircle2 className="size-5 text-[#da9810]" />
            <p className="mt-3 text-2xl font-bold text-[#143268]">{stats.enrollments.completed}</p>
            <p className="text-xs text-[#6b7a95]">cours terminés</p>
          </div>
          <div className="rounded-2xl border border-[#d8e0ec] bg-white p-5">
            <GraduationCap className="size-5 text-[#da9810]" />
            <p className="mt-3 text-2xl font-bold text-[#143268]">{formatAmount(stats.direct_payment_volume)}</p>
            <p className="text-xs text-[#6b7a95]">{stats.certificates} certificats</p>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#d8e0ec] bg-white">
        <div className="border-b border-[#e6ebf3] px-5 py-4">
          <h2 className="font-bold text-[#143268]">Tous les cours</h2>
        </div>
        <div className="divide-y divide-[#eef2f8]">
          {courses.length ? courses.map(course => (
            <div key={course.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{course.status}</Badge>
                  <span className="text-xs text-[#6b7a95]">{course.category}</span>
                </div>
                <p className="mt-2 truncate font-bold text-[#143268]">{course.title}</p>
                <p className="mt-1 text-xs text-[#6b7a95]">
                  {course.instructor_name || course.instructor_phone} · {course.enrollments || 0} inscriptions
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {course.status === "published" ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/academy/${course.slug}`} target="_blank">Voir</Link>
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => updateStatus(course.id, "draft")}>Brouillon</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(course.id, "archived")}>Archiver</Button>
                <Button size="sm" onClick={() => updateStatus(course.id, "published")}>Publier</Button>
              </div>
            </div>
          )) : (
            <p className="px-5 py-10 text-center text-sm text-[#6b7a95]">Aucun cours pour le moment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
