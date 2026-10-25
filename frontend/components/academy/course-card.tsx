import Link from "next/link";
import { BookOpen, Clock3, Star, Users } from "lucide-react";
import type { AcademyCourse } from "@/lib/types";
import { formatAmount } from "@/lib/format";

function levelLabel(level: AcademyCourse["level"]) {
  return {
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
    all: "Tous niveaux",
  }[level];
}

export function AcademyCourseCard({ course }: { course: AcademyCourse }) {
  const price = Number(course.price || 0);
  return (
    <Link
      href={`/academy/${course.slug}`}
      className="group overflow-hidden rounded-[1.35rem] border border-border/80 bg-white/90 shadow-[0_18px_50px_-38px_rgb(20_50_104_/_45%)] transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_28px_65px_-40px_rgb(20_50_104_/_55%)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[linear-gradient(135deg,#143268_0%,#2a5798_100%)]">
        {course.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.cover_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BookOpen className="size-12 text-gold-bright/80" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-ink backdrop-blur">
          {course.category}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{levelLabel(course.level)}</span>
          <span>·</span>
          <span>{course.language?.toUpperCase() || "FR"}</span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-lg font-extrabold tracking-[-0.025em] text-ink">
          {course.title}
        </h3>
        {course.subtitle ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {course.subtitle}
          </p>
        ) : null}
        <p className="mt-4 text-xs font-semibold text-muted-foreground">
          {course.instructor_name || "Instructeur Mastercota"}
        </p>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {Math.max(1, Math.round(Number(course.estimated_minutes || 0) / 60))} h</span>
          <span className="inline-flex items-center gap-1"><BookOpen className="size-3.5" /> {course.lessons_count || 0} leçons</span>
          <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {course.learners_count || 0}</span>
          <span className="inline-flex items-center gap-1"><Star className="size-3.5" /> {Number(course.rating || 0).toFixed(1)}</span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
          <span className="text-xs font-semibold text-muted-foreground">
            {course.access_type === "invite" ? "Sur invitation" : price === 0 ? "Gratuit" : "Accès au cours"}
          </span>
          <span className="text-base font-extrabold text-ink">
            {course.access_type === "invite" ? "Privé" : price === 0 ? "0 F" : formatAmount(price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
