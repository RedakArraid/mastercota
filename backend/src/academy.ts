import { Hono, type Context } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { randomUUID } from "node:crypto";
import { query, transaction } from "./lib/db.js";
import { verifyToken } from "./lib/auth.js";
import { generateSlug } from "./lib/format.js";
import { textField } from "./lib/validation.js";

const COOKIE = "mc_session";
export const academyRoutes = new Hono();

type CourseAccess = {
  course: Record<string, any>;
  enrollment: Record<string, any> | null;
  owner: boolean;
  admin: boolean;
};

function numberField(value: unknown, label: string, min = 0, max = 1_000_000_000) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new HTTPException(400, { message: `${label} invalide` });
  }
  return n;
}

function intField(value: unknown, label: string, min = 0, max = 100000) {
  const n = numberField(value, label, min, max);
  if (!Number.isInteger(n)) throw new HTTPException(400, { message: `${label} invalide` });
  return n;
}

function nullableText(value: unknown, max = 4000): string | null {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  if (text.length > max) throw new HTTPException(400, { message: "Texte trop long" });
  return text || null;
}

function optionalUrl(value: unknown): string | null {
  const text = nullableText(value, 2000);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    return text;
  } catch {
    throw new HTTPException(400, { message: "URL invalide" });
  }
}

async function sessionUser(c: Context) {
  const token =
    c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ||
    getCookie(c, COOKIE);
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session) return null;
  const { rows } = await query(
    "SELECT id,phone,name,role,wave_phone,wave_pay_link,wave_payout_mode FROM users WHERE id=$1",
    [session.id]
  );
  return rows[0] ?? null;
}

async function requireUser(c: Context) {
  const user = await sessionUser(c);
  if (!user) throw new HTTPException(401, { message: "Unauthorized" });
  return user;
}

async function requireInstructor(c: Context) {
  const user = await requireUser(c);
  const { rows } = await query(
    "SELECT * FROM instructor_profiles WHERE user_id=$1 AND status='active'",
    [user.id]
  );
  if (!rows[0]) throw new HTTPException(403, { message: "Profil instructeur requis" });
  return { user, profile: rows[0] };
}

async function instructorOwnsCourse(userId: string, courseId: string) {
  const { rows } = await query(
    "SELECT * FROM academy_courses WHERE id=$1 AND instructor_id=$2",
    [courseId, userId]
  );
  if (!rows[0]) throw new HTTPException(404, { message: "Cours introuvable" });
  return rows[0];
}

async function validateCoursePublishable(options: {
  courseId: string;
  instructorId: string;
  accessType: string;
  price: number;
}) {
  const { rows: invalidLessons } = await query(
    `SELECT l.id,l.title,l.lesson_type
     FROM academy_lessons l
     WHERE l.course_id=$1 AND l.published=true AND (
       (l.lesson_type='text' AND (l.content IS NULL OR length(trim(l.content))=0)) OR
       (l.lesson_type='video' AND (l.video_url IS NULL OR length(trim(l.video_url))=0)) OR
       (l.lesson_type='live' AND (l.live_url IS NULL OR length(trim(l.live_url))=0)) OR
       (l.lesson_type='download' AND (l.resource_url IS NULL OR length(trim(l.resource_url))=0)
         AND jsonb_array_length(COALESCE(l.resources,'[]'::jsonb))=0)
     )
     LIMIT 1`,
    [options.courseId]
  );
  const { rows: lessonCount } = await query(
    "SELECT count(*)::int AS n FROM academy_lessons WHERE course_id=$1 AND published=true",
    [options.courseId]
  );
  if (!Number(lessonCount[0]?.n)) {
    throw new HTTPException(400, { message: "Ajoutez au moins une leçon publiée" });
  }
  if (invalidLessons[0]) {
    throw new HTTPException(400, {
      message: `Complétez le contenu requis de la leçon « ${invalidLessons[0].title} » avant publication`,
    });
  }
  const { rows: emptyQuiz } = await query(
    `SELECT q.id,q.title FROM academy_quizzes q
     JOIN academy_lessons l ON l.id=q.lesson_id
     WHERE l.course_id=$1 AND l.published=true
       AND NOT EXISTS (SELECT 1 FROM academy_quiz_questions qq WHERE qq.quiz_id=q.id)
     LIMIT 1`,
    [options.courseId]
  );
  if (emptyQuiz[0]) {
    throw new HTTPException(400, {
      message: `Ajoutez au moins une question au quiz « ${emptyQuiz[0].title} » avant publication`,
    });
  }
  if (options.accessType === "paid") {
    if (!Number.isFinite(options.price) || options.price <= 0) {
      throw new HTTPException(400, { message: "Un cours payant doit avoir un prix supérieur à zéro" });
    }
    const { rows: payout } = await query(
      "SELECT wave_phone,wave_pay_link FROM users WHERE id=$1",
      [options.instructorId]
    );
    if (!payout[0]?.wave_phone && !payout[0]?.wave_pay_link) {
      throw new HTTPException(400, {
        message: "Configurez la réception des paiements avant de publier un cours payant",
      });
    }
  }
}

async function accessFor(user: Record<string, any>, courseId: string): Promise<CourseAccess> {
  const { rows: courses } = await query(
    `SELECT c.*,u.name AS instructor_name,u.wave_phone AS instructor_wave_phone,
            u.wave_pay_link AS instructor_wave_pay_link,u.wave_payout_mode AS instructor_wave_payout_mode
     FROM academy_courses c JOIN users u ON u.id=c.instructor_id WHERE c.id=$1`,
    [courseId]
  );
  const course = courses[0];
  if (!course) throw new HTTPException(404, { message: "Cours introuvable" });
  const owner = course.instructor_id === user.id;
  const admin = user.role === "admin";
  const { rows: enrollments } = await query(
    "SELECT * FROM academy_enrollments WHERE course_id=$1 AND user_id=$2",
    [courseId, user.id]
  );
  return { course, enrollment: enrollments[0] ?? null, owner, admin };
}

function hasLearningAccess(access: CourseAccess) {
  return (
    access.owner ||
    access.admin ||
    access.enrollment?.status === "active" ||
    access.enrollment?.status === "completed"
  );
}

async function courseOutline(courseId: string, includeContent = false) {
  const { rows: sections } = await query(
    "SELECT * FROM academy_sections WHERE course_id=$1 ORDER BY position,id",
    [courseId]
  );
  const { rows: lessons } = await query(
    `SELECT l.*,
      q.id AS quiz_id,q.title AS quiz_title,q.passing_score,q.max_attempts
     FROM academy_lessons l
     LEFT JOIN academy_quizzes q ON q.lesson_id=l.id
     WHERE l.course_id=$1 AND l.published=true
     ORDER BY l.position,l.created_at`,
    [courseId]
  );
  return sections.map(section => ({
    ...section,
    lessons: lessons
      .filter(lesson => lesson.section_id === section.id)
      .map(lesson =>
        includeContent
          ? lesson
          : {
              id: lesson.id,
              title: lesson.title,
              lesson_type: lesson.lesson_type,
              duration_minutes: lesson.duration_minutes,
              preview: lesson.preview,
              position: lesson.position,
              unlock_after_days: lesson.unlock_after_days,
              quiz_id: lesson.quiz_id,
            }
      ),
  }));
}

async function maybeCompleteCourse(userId: string, courseId: string) {
  const { rows: enrollmentRows } = await query(
    "SELECT * FROM academy_enrollments WHERE user_id=$1 AND course_id=$2 FOR UPDATE",
    [userId, courseId]
  );
  const enrollment = enrollmentRows[0];
  if (!enrollment || !["active", "completed"].includes(enrollment.status)) return null;

  const { rows: lessonCountRows } = await query(
    "SELECT count(*)::int AS n FROM academy_lessons WHERE course_id=$1 AND published=true",
    [courseId]
  );
  const { rows: completeCountRows } = await query(
    `SELECT count(*)::int AS n FROM academy_lesson_progress p
     JOIN academy_lessons l ON l.id=p.lesson_id
     WHERE p.user_id=$1 AND p.course_id=$2 AND p.status='completed' AND l.published=true`,
    [userId, courseId]
  );
  const totalLessons = Number(lessonCountRows[0]?.n ?? 0);
  const completedLessons = Number(completeCountRows[0]?.n ?? 0);
  if (!totalLessons || completedLessons < totalLessons) return null;

  const { rows: missingQuizRows } = await query(
    `SELECT q.id FROM academy_quizzes q
     JOIN academy_lessons l ON l.id=q.lesson_id
     WHERE l.course_id=$2 AND l.published=true
       AND NOT EXISTS (
         SELECT 1 FROM academy_quiz_attempts a
         WHERE a.quiz_id=q.id AND a.user_id=$1 AND a.passed=true
       )
     LIMIT 1`,
    [userId, courseId]
  );
  if (missingQuizRows[0]) return null;

  if (enrollment.status !== "completed") {
    await query(
      "UPDATE academy_enrollments SET status='completed',completed_at=now(),updated_at=now() WHERE id=$1",
      [enrollment.id]
    );
  }

  const { rows: courses } = await query(
    "SELECT certificate_enabled,title FROM academy_courses WHERE id=$1",
    [courseId]
  );
  if (!courses[0]?.certificate_enabled) return { completed: true, certificate: null };

  const { rows: users } = await query("SELECT name,phone FROM users WHERE id=$1", [userId]);
  const verificationCode = `MC-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const { rows: certs } = await query(
    `INSERT INTO academy_certificates(course_id,user_id,verification_code,metadata)
     VALUES($1,$2,$3,$4::jsonb)
     ON CONFLICT(course_id,user_id) DO UPDATE SET metadata=academy_certificates.metadata
     RETURNING *`,
    [
      courseId,
      userId,
      verificationCode,
      JSON.stringify({
        course_title: courses[0].title,
        learner_name: users[0]?.name || users[0]?.phone || "Apprenant",
      }),
    ]
  );
  return { completed: true, certificate: certs[0] };
}

async function lessonAccess(user: Record<string, any>, lessonId: string) {
  const { rows } = await query(
    `SELECT l.*,c.sequential,c.instructor_id,c.status AS course_status
     FROM academy_lessons l JOIN academy_courses c ON c.id=l.course_id
     WHERE l.id=$1 AND l.published=true`,
    [lessonId]
  );
  const lesson = rows[0];
  if (!lesson) throw new HTTPException(404, { message: "Leçon introuvable" });
  const access = await accessFor(user, lesson.course_id);
  if (lesson.preview && access.course.status === "published") return { lesson, access, preview: true };
  if (!hasLearningAccess(access)) throw new HTTPException(403, { message: "Inscription active requise" });

  if (!access.owner && !access.admin && access.enrollment) {
    if (Number(lesson.unlock_after_days) > 0) {
      const enrolledAt = new Date(access.enrollment.enrolled_at || access.enrollment.created_at).getTime();
      const unlockAt = enrolledAt + Number(lesson.unlock_after_days) * 86400000;
      if (Date.now() < unlockAt) {
        throw new HTTPException(403, {
          message: `Cette leçon sera disponible le ${new Date(unlockAt).toISOString()}`,
        });
      }
    }
    if (access.course.sequential) {
      const { rows: previous } = await query(
        `SELECT l.id FROM academy_lessons l
         JOIN academy_sections s ON s.id=l.section_id
         JOIN academy_sections current_s ON current_s.id=$2
         WHERE l.course_id=$1 AND l.published=true AND (
           s.position < current_s.position OR
           (s.position=current_s.position AND l.position < $3)
         )
         AND NOT EXISTS (
           SELECT 1 FROM academy_lesson_progress p
           WHERE p.user_id=$4 AND p.lesson_id=l.id AND p.status='completed'
         )
         LIMIT 1`,
        [lesson.course_id, lesson.section_id, lesson.position, user.id]
      );
      if (previous[0]) throw new HTTPException(403, { message: "Terminez les leçons précédentes d'abord" });
    }
  }
  return { lesson, access, preview: false };
}

function discountedPrice(course: Record<string, any>, coupon: Record<string, any> | null) {
  const base = Number(course.price);
  if (!coupon) return base;
  if (coupon.discount_type === "percent") {
    return Math.max(0, Math.round(base * (1 - Number(coupon.discount_value) / 100)));
  }
  return Math.max(0, base - Number(coupon.discount_value));
}

// Public catalogue
academyRoutes.get("/courses", async c => {
  const q = (c.req.query("q") || "").trim();
  const category = (c.req.query("category") || "").trim();
  const level = (c.req.query("level") || "").trim();
  const { rows } = await query(
    `SELECT c.id,c.slug,c.title,c.subtitle,c.description,c.category,c.level,c.language,
            c.cover_url,c.trailer_url,c.price,c.currency,c.access_type,c.estimated_minutes,
            c.instructor_id,u.name AS instructor_name,
            COALESCE((SELECT avg(r.rating)::numeric(3,2) FROM academy_reviews r WHERE r.course_id=c.id AND r.published=true),0) AS rating,
            (SELECT count(*) FROM academy_reviews r WHERE r.course_id=c.id AND r.published=true)::int AS reviews_count,
            (SELECT count(*) FROM academy_enrollments e WHERE e.course_id=c.id AND e.status IN ('active','completed'))::int AS learners_count,
            (SELECT count(*) FROM academy_lessons l WHERE l.course_id=c.id AND l.published=true)::int AS lessons_count
     FROM academy_courses c JOIN users u ON u.id=c.instructor_id
     WHERE c.status='published'
       AND ($1='' OR c.title ILIKE '%'||$1||'%' OR coalesce(c.description,'') ILIKE '%'||$1||'%')
       AND ($2='' OR c.category=$2)
       AND ($3='' OR c.level=$3)
     ORDER BY c.published_at DESC NULLS LAST,c.created_at DESC
     LIMIT 100`,
    [q, category, level]
  );
  return c.json({ courses: rows });
});

academyRoutes.get("/courses/:slug", async c => {
  const { rows } = await query(
    `SELECT c.*,u.name AS instructor_name,ip.headline AS instructor_headline,ip.bio AS instructor_bio,
      COALESCE((SELECT avg(r.rating)::numeric(3,2) FROM academy_reviews r WHERE r.course_id=c.id AND r.published=true),0) AS rating,
      (SELECT count(*) FROM academy_reviews r WHERE r.course_id=c.id AND r.published=true)::int AS reviews_count,
      (SELECT count(*) FROM academy_enrollments e WHERE e.course_id=c.id AND e.status IN ('active','completed'))::int AS learners_count
     FROM academy_courses c
     JOIN users u ON u.id=c.instructor_id
     LEFT JOIN instructor_profiles ip ON ip.user_id=c.instructor_id
     WHERE c.slug=$1 AND c.status='published'`,
    [c.req.param("slug")]
  );
  const course = rows[0];
  if (!course) return c.json({ error: "Cours introuvable" }, 404);
  const outline = await courseOutline(course.id, false);
  const { rows: reviews } = await query(
    `SELECT r.id,r.rating,r.body,r.created_at,u.name AS user_name
     FROM academy_reviews r JOIN users u ON u.id=r.user_id
     WHERE r.course_id=$1 AND r.published=true
     ORDER BY r.created_at DESC LIMIT 20`,
    [course.id]
  );
  return c.json({ course, outline, reviews });
});

academyRoutes.get("/certificates/:code", async c => {
  const { rows } = await query(
    `SELECT cert.verification_code,cert.issued_at,cert.metadata,c.title AS course_title,
            u.name AS learner_name
     FROM academy_certificates cert
     JOIN academy_courses c ON c.id=cert.course_id
     JOIN users u ON u.id=cert.user_id
     WHERE cert.verification_code=$1`,
    [c.req.param("code").toUpperCase()]
  );
  if (!rows[0]) return c.json({ valid: false }, 404);
  return c.json({ valid: true, certificate: rows[0] });
});

// Authenticated learner/instructor state
academyRoutes.get("/me", async c => {
  const user = await requireUser(c);
  const [{ rows: enrollments }, { rows: instructor }, { rows: certificates }] = await Promise.all([
    query(
      `SELECT e.*,c.slug,c.title,c.subtitle,c.cover_url,c.estimated_minutes,u.name AS instructor_name,
        (SELECT count(*) FROM academy_lessons l WHERE l.course_id=c.id AND l.published=true)::int AS lessons_count,
        (SELECT count(*) FROM academy_lesson_progress p WHERE p.course_id=c.id AND p.user_id=e.user_id AND p.status='completed')::int AS completed_lessons
       FROM academy_enrollments e
       JOIN academy_courses c ON c.id=e.course_id
       JOIN users u ON u.id=c.instructor_id
       WHERE e.user_id=$1 ORDER BY e.updated_at DESC`,
      [user.id]
    ),
    query("SELECT * FROM instructor_profiles WHERE user_id=$1", [user.id]),
    query(
      `SELECT cert.*,c.title AS course_title,c.slug FROM academy_certificates cert
       JOIN academy_courses c ON c.id=cert.course_id
       WHERE cert.user_id=$1 ORDER BY cert.issued_at DESC`,
      [user.id]
    ),
  ]);
  return c.json({ enrollments, instructor: instructor[0] ?? null, certificates });
});

academyRoutes.post("/instructor/profile", async c => {
  const user = await requireUser(c);
  const body = await c.req.json();
  const headline = nullableText(body.headline, 180);
  const bio = nullableText(body.bio, 4000);
  const websiteUrl = optionalUrl(body.website_url);
  const { rows } = await query(
    `INSERT INTO instructor_profiles(user_id,headline,bio,website_url,status)
     VALUES($1,$2,$3,$4,'active')
     ON CONFLICT(user_id) DO UPDATE SET headline=EXCLUDED.headline,bio=EXCLUDED.bio,
       website_url=EXCLUDED.website_url,updated_at=now()
     RETURNING *`,
    [user.id, headline, bio, websiteUrl]
  );
  return c.json({ instructor: rows[0] }, 201);
});

academyRoutes.get("/instructor/courses", async c => {
  const { user } = await requireInstructor(c);
  const { rows } = await query(
    `SELECT c.*,
      (SELECT count(*) FROM academy_enrollments e WHERE e.course_id=c.id AND e.status IN ('active','completed'))::int AS learners_count,
      (SELECT count(*) FROM academy_lessons l WHERE l.course_id=c.id)::int AS lessons_count,
      COALESCE((SELECT avg(r.rating)::numeric(3,2) FROM academy_reviews r WHERE r.course_id=c.id AND r.published=true),0) AS rating
     FROM academy_courses c WHERE c.instructor_id=$1 ORDER BY c.updated_at DESC`,
    [user.id]
  );
  return c.json({ courses: rows });
});

academyRoutes.post("/instructor/courses", async c => {
  const { user } = await requireInstructor(c);
  const body = await c.req.json();
  const title = textField(body.title, "Titre", 160);
  const accessType = ["free", "paid", "invite"].includes(body.access_type) ? body.access_type : "free";
  const price = accessType === "paid" ? numberField(body.price, "Prix", 0.01, 1_000_000_000) : 0;
  const level = ["beginner", "intermediate", "advanced", "all"].includes(body.level) ? body.level : "all";
  const { rows } = await query(
    `INSERT INTO academy_courses(
      instructor_id,slug,title,subtitle,description,category,level,language,cover_url,trailer_url,
      price,currency,access_type,sequential,drip_days,certificate_enabled,estimated_minutes
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'XOF',$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      user.id,
      generateSlug(title),
      title,
      nullableText(body.subtitle, 240),
      nullableText(body.description, 12000),
      nullableText(body.category, 100) || "Général",
      level,
      nullableText(body.language, 10) || "fr",
      optionalUrl(body.cover_url),
      optionalUrl(body.trailer_url),
      price,
      accessType,
      body.sequential !== false,
      intField(body.drip_days ?? 0, "Délai", 0, 3650),
      body.certificate_enabled !== false,
      intField(body.estimated_minutes ?? 0, "Durée estimée", 0, 100000),
    ]
  );
  return c.json({ course: rows[0] }, 201);
});

academyRoutes.patch("/instructor/courses/:id", async c => {
  const { user } = await requireInstructor(c);
  const course = await instructorOwnsCourse(user.id, c.req.param("id"));
  const body = await c.req.json();
  const nextStatus = body.status === undefined ? course.status : String(body.status);
  if (!["draft", "published", "archived"].includes(nextStatus)) {
    throw new HTTPException(400, { message: "Statut invalide" });
  }
  const accessType = body.access_type && ["free", "paid", "invite"].includes(body.access_type)
    ? body.access_type
    : course.access_type;
  const level = body.level === undefined
    ? null
    : (["beginner", "intermediate", "advanced", "all"].includes(String(body.level))
        ? String(body.level)
        : (() => { throw new HTTPException(400, { message: "Niveau invalide" }); })());
  const price = accessType === "paid"
    ? numberField(body.price ?? course.price, "Prix", 0.01, 1_000_000_000)
    : 0;
  if (nextStatus === "published") {
    await validateCoursePublishable({
      courseId: course.id,
      instructorId: user.id,
      accessType,
      price,
    });
  }
  const { rows } = await query(
    `UPDATE academy_courses SET
      title=COALESCE($2,title),subtitle=$3,description=$4,category=COALESCE($5,category),
      level=COALESCE($6,level),language=COALESCE($7,language),cover_url=$8,trailer_url=$9,
      price=$10,access_type=$11,status=$12,sequential=COALESCE($13,sequential),
      drip_days=COALESCE($14,drip_days),certificate_enabled=COALESCE($15,certificate_enabled),
      estimated_minutes=COALESCE($16,estimated_minutes),
      published_at=CASE WHEN $12='published' AND published_at IS NULL THEN now() ELSE published_at END,
      updated_at=now()
     WHERE id=$1 RETURNING *`,
    [
      course.id,
      body.title ? textField(body.title, "Titre", 160) : null,
      body.subtitle === undefined ? course.subtitle : nullableText(body.subtitle, 240),
      body.description === undefined ? course.description : nullableText(body.description, 12000),
      body.category === undefined ? null : nullableText(body.category, 100),
      level,
      body.language === undefined ? null : nullableText(body.language, 10),
      body.cover_url === undefined ? course.cover_url : optionalUrl(body.cover_url),
      body.trailer_url === undefined ? course.trailer_url : optionalUrl(body.trailer_url),
      price,
      accessType,
      nextStatus,
      body.sequential === undefined ? null : Boolean(body.sequential),
      body.drip_days === undefined ? null : intField(body.drip_days, "Délai", 0, 3650),
      body.certificate_enabled === undefined ? null : Boolean(body.certificate_enabled),
      body.estimated_minutes === undefined ? null : intField(body.estimated_minutes, "Durée estimée", 0, 100000),
    ]
  );
  return c.json({ course: rows[0] });
});

academyRoutes.get("/instructor/courses/:id", async c => {
  const { user } = await requireInstructor(c);
  const course = await instructorOwnsCourse(user.id, c.req.param("id"));
  const outline = await courseOutline(course.id, true);
  return c.json({ course, outline });
});

academyRoutes.post("/instructor/courses/:id/sections", async c => {
  const { user } = await requireInstructor(c);
  const course = await instructorOwnsCourse(user.id, c.req.param("id"));
  const body = await c.req.json();
  const { rows } = await query(
    "INSERT INTO academy_sections(course_id,title,position) VALUES($1,$2,$3) RETURNING *",
    [course.id, textField(body.title, "Titre", 160), intField(body.position ?? 0, "Position", 0, 10000)]
  );
  return c.json({ section: rows[0] }, 201);
});

academyRoutes.patch("/instructor/sections/:id", async c => {
  const { user } = await requireInstructor(c);
  const body = await c.req.json();
  const { rows } = await query(
    `UPDATE academy_sections s SET title=COALESCE($2,s.title),position=COALESCE($3,s.position)
     FROM academy_courses c WHERE s.id=$1 AND c.id=s.course_id AND c.instructor_id=$4
     RETURNING s.*`,
    [
      c.req.param("id"),
      body.title ? textField(body.title, "Titre", 160) : null,
      body.position === undefined ? null : intField(body.position, "Position", 0, 10000),
      user.id,
    ]
  );
  if (!rows[0]) throw new HTTPException(404, { message: "Section introuvable" });
  return c.json({ section: rows[0] });
});

academyRoutes.post("/instructor/sections/:id/lessons", async c => {
  const { user } = await requireInstructor(c);
  const { rows: sectionRows } = await query(
    `SELECT s.*,c.instructor_id,c.drip_days AS course_drip_days FROM academy_sections s
     JOIN academy_courses c ON c.id=s.course_id
     WHERE s.id=$1 AND c.instructor_id=$2`,
    [c.req.param("id"), user.id]
  );
  const section = sectionRows[0];
  if (!section) throw new HTTPException(404, { message: "Section introuvable" });
  const body = await c.req.json();
  const type = ["text", "video", "live", "download"].includes(body.lesson_type) ? body.lesson_type : "text";
  const resources = Array.isArray(body.resources) ? body.resources.slice(0, 20) : [];
  const { rows } = await query(
    `INSERT INTO academy_lessons(
      course_id,section_id,title,lesson_type,content,video_url,live_url,resource_url,resources,
      duration_minutes,position,preview,published,unlock_after_days
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14) RETURNING *`,
    [
      section.course_id,
      section.id,
      textField(body.title, "Titre", 180),
      type,
      nullableText(body.content, 50000),
      optionalUrl(body.video_url),
      optionalUrl(body.live_url),
      optionalUrl(body.resource_url),
      JSON.stringify(resources),
      intField(body.duration_minutes ?? 0, "Durée", 0, 100000),
      intField(body.position ?? 0, "Position", 0, 10000),
      Boolean(body.preview),
      body.published !== false,
      intField(body.unlock_after_days ?? section.course_drip_days ?? 0, "Déblocage", 0, 3650),
    ]
  );
  return c.json({ lesson: rows[0] }, 201);
});

academyRoutes.patch("/instructor/lessons/:id", async c => {
  const { user } = await requireInstructor(c);
  const body = await c.req.json();
  const { rows: existing } = await query(
    `SELECT l.* FROM academy_lessons l JOIN academy_courses c ON c.id=l.course_id
     WHERE l.id=$1 AND c.instructor_id=$2`,
    [c.req.param("id"), user.id]
  );
  const lesson = existing[0];
  if (!lesson) throw new HTTPException(404, { message: "Leçon introuvable" });
  const type = body.lesson_type === undefined
    ? lesson.lesson_type
    : (["text", "video", "live", "download"].includes(body.lesson_type) ? body.lesson_type : lesson.lesson_type);
  const { rows } = await query(
    `UPDATE academy_lessons SET
      title=COALESCE($2,title),lesson_type=$3,content=$4,video_url=$5,live_url=$6,
      resource_url=$7,resources=$8::jsonb,duration_minutes=$9,position=$10,preview=$11,
      published=$12,unlock_after_days=$13,updated_at=now()
     WHERE id=$1 RETURNING *`,
    [
      lesson.id,
      body.title ? textField(body.title, "Titre", 180) : null,
      type,
      body.content === undefined ? lesson.content : nullableText(body.content, 50000),
      body.video_url === undefined ? lesson.video_url : optionalUrl(body.video_url),
      body.live_url === undefined ? lesson.live_url : optionalUrl(body.live_url),
      body.resource_url === undefined ? lesson.resource_url : optionalUrl(body.resource_url),
      JSON.stringify(body.resources === undefined ? lesson.resources : (Array.isArray(body.resources) ? body.resources.slice(0, 20) : [])),
      body.duration_minutes === undefined ? lesson.duration_minutes : intField(body.duration_minutes, "Durée", 0, 100000),
      body.position === undefined ? lesson.position : intField(body.position, "Position", 0, 10000),
      body.preview === undefined ? lesson.preview : Boolean(body.preview),
      body.published === undefined ? lesson.published : Boolean(body.published),
      body.unlock_after_days === undefined ? lesson.unlock_after_days : intField(body.unlock_after_days, "Déblocage", 0, 3650),
    ]
  );
  return c.json({ lesson: rows[0] });
});

academyRoutes.post("/instructor/lessons/:id/quiz", async c => {
  const { user } = await requireInstructor(c);
  const { rows: lessons } = await query(
    `SELECT l.id FROM academy_lessons l JOIN academy_courses c ON c.id=l.course_id
     WHERE l.id=$1 AND c.instructor_id=$2`,
    [c.req.param("id"), user.id]
  );
  if (!lessons[0]) throw new HTTPException(404, { message: "Leçon introuvable" });
  const body = await c.req.json();
  const { rows } = await query(
    `INSERT INTO academy_quizzes(lesson_id,title,passing_score,max_attempts,shuffle_questions)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(lesson_id) DO UPDATE SET title=EXCLUDED.title,passing_score=EXCLUDED.passing_score,
       max_attempts=EXCLUDED.max_attempts,shuffle_questions=EXCLUDED.shuffle_questions
     RETURNING *`,
    [
      c.req.param("id"),
      textField(body.title || "Quiz", "Titre", 180),
      intField(body.passing_score ?? 70, "Score minimum", 0, 100),
      intField(body.max_attempts ?? 3, "Tentatives", 1, 100),
      Boolean(body.shuffle_questions),
    ]
  );
  return c.json({ quiz: rows[0] }, 201);
});

academyRoutes.post("/instructor/quizzes/:id/questions", async c => {
  const { user } = await requireInstructor(c);
  const { rows: quizzes } = await query(
    `SELECT q.id FROM academy_quizzes q
     JOIN academy_lessons l ON l.id=q.lesson_id
     JOIN academy_courses c ON c.id=l.course_id
     WHERE q.id=$1 AND c.instructor_id=$2`,
    [c.req.param("id"), user.id]
  );
  if (!quizzes[0]) throw new HTTPException(404, { message: "Quiz introuvable" });
  const body = await c.req.json();
  const type = ["single", "multiple", "true_false"].includes(body.question_type) ? body.question_type : "single";
  const options = Array.isArray(body.options) ? body.options.slice(0, 20) : [];
  const correct = Array.isArray(body.correct_answers) ? body.correct_answers.slice(0, 20) : [];
  if (!correct.length) throw new HTTPException(400, { message: "Au moins une réponse correcte est requise" });
  const { rows } = await query(
    `INSERT INTO academy_quiz_questions(
      quiz_id,prompt,question_type,options,correct_answers,explanation,points,position
     ) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8) RETURNING id,quiz_id,prompt,question_type,options,explanation,points,position`,
    [
      c.req.param("id"),
      textField(body.prompt, "Question", 2000),
      type,
      JSON.stringify(options),
      JSON.stringify(correct),
      nullableText(body.explanation, 4000),
      intField(body.points ?? 1, "Points", 1, 1000),
      intField(body.position ?? 0, "Position", 0, 10000),
    ]
  );
  return c.json({ question: rows[0] }, 201);
});

academyRoutes.get("/instructor/payment-reports", async c => {
  const { user } = await requireInstructor(c);
  const { rows } = await query(
    `SELECT p.*,c.title AS course_title,u.name AS learner_name,u.phone AS learner_phone
     FROM academy_payment_reports p
     JOIN academy_courses c ON c.id=p.course_id
     JOIN users u ON u.id=p.user_id
     WHERE c.instructor_id=$1
     ORDER BY (p.status='pending') DESC,p.created_at DESC LIMIT 200`,
    [user.id]
  );
  return c.json({ reports: rows });
});

academyRoutes.post("/instructor/payment-reports/:id/:action", async c => {
  const { user } = await requireInstructor(c);
  const action = c.req.param("action");
  if (!["confirm", "reject"].includes(action)) throw new HTTPException(404, { message: "Action invalide" });
  const result = await transaction(async client => {
    const { rows } = await client.query(
      `SELECT p.*,c.instructor_id FROM academy_payment_reports p
       JOIN academy_courses c ON c.id=p.course_id
       WHERE p.id=$1 FOR UPDATE`,
      [c.req.param("id")]
    );
    const report = rows[0];
    if (!report || report.instructor_id !== user.id) throw new HTTPException(404, { message: "Paiement introuvable" });
    if (report.status !== "pending") return report;
    if (action === "confirm") {
      const { rows: updated } = await client.query(
        "UPDATE academy_payment_reports SET status='confirmed',confirmed_by=$2,confirmed_at=now() WHERE id=$1 RETURNING *",
        [report.id, user.id]
      );
      await client.query(
        `UPDATE academy_enrollments SET status='active',access_source='payment',
          enrolled_at=COALESCE(enrolled_at,now()),updated_at=now()
         WHERE id=$1`,
        [report.enrollment_id]
      );
      await client.query(
        "INSERT INTO notifications(user_id,title,body) VALUES($1,$2,$3)",
        [report.user_id, "Accès au cours activé", "Votre paiement a été confirmé. Le cours est maintenant accessible."]
      );
      return updated[0];
    }
    const { rows: updated } = await client.query(
      "UPDATE academy_payment_reports SET status='rejected',confirmed_by=$2,confirmed_at=now() WHERE id=$1 RETURNING *",
      [report.id, user.id]
    );
    return updated[0];
  });
  return c.json({ report: result });
});

academyRoutes.post("/instructor/courses/:id/coupons", async c => {
  const { user } = await requireInstructor(c);
  const course = await instructorOwnsCourse(user.id, c.req.param("id"));
  const body = await c.req.json();
  const type = ["percent", "fixed"].includes(body.discount_type) ? body.discount_type : "percent";
  const value = numberField(body.discount_value, "Réduction", 0.01, type === "percent" ? 100 : 1_000_000_000);
  const code = textField(body.code, "Code", 40).toUpperCase().replace(/\s+/g, "");
  const { rows } = await query(
    `INSERT INTO academy_coupons(course_id,code,discount_type,discount_value,max_uses,valid_from,valid_until,active)
     VALUES($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
    [
      course.id,
      code,
      type,
      value,
      body.max_uses ? intField(body.max_uses, "Utilisations", 1, 1_000_000) : null,
      body.valid_from || null,
      body.valid_until || null,
    ]
  );
  return c.json({ coupon: rows[0] }, 201);
});

academyRoutes.post("/instructor/courses/:id/invites", async c => {
  const { user } = await requireInstructor(c);
  const course = await instructorOwnsCourse(user.id, c.req.param("id"));
  const body = await c.req.json();
  const code = (body.code ? textField(body.code, "Code", 60) : randomUUID().slice(0, 8)).toUpperCase().replace(/\s+/g, "");
  const { rows } = await query(
    `INSERT INTO academy_invites(course_id,code,phone,max_uses,expires_at,active,created_by)
     VALUES($1,$2,$3,$4,$5,true,$6) RETURNING *`,
    [
      course.id,
      code,
      nullableText(body.phone, 40),
      intField(body.max_uses ?? 1, "Utilisations", 1, 1_000_000),
      body.expires_at || null,
      user.id,
    ]
  );
  return c.json({ invite: rows[0] }, 201);
});

academyRoutes.post("/instructor/courses/:id/announcements", async c => {
  const { user } = await requireInstructor(c);
  const course = await instructorOwnsCourse(user.id, c.req.param("id"));
  const body = await c.req.json();
  const { rows } = await query(
    "INSERT INTO academy_announcements(course_id,instructor_id,title,body) VALUES($1,$2,$3,$4) RETURNING *",
    [course.id, user.id, textField(body.title, "Titre", 180), textField(body.body, "Message", 6000)]
  );
  await query(
    `INSERT INTO notifications(user_id,title,body)
     SELECT e.user_id,$2,$3 FROM academy_enrollments e
     WHERE e.course_id=$1 AND e.status IN ('active','completed')`,
    [course.id, rows[0].title, rows[0].body]
  );
  return c.json({ announcement: rows[0] }, 201);
});

academyRoutes.get("/instructor/courses/:id/analytics", async c => {
  const { user } = await requireInstructor(c);
  const course = await instructorOwnsCourse(user.id, c.req.param("id"));
  const [enrollments, progress, revenue, reviews, lessons] = await Promise.all([
    query(
      `SELECT count(*)::int AS total,
        count(*) FILTER(WHERE status='active')::int AS active,
        count(*) FILTER(WHERE status='completed')::int AS completed,
        count(*) FILTER(WHERE status='pending')::int AS pending
       FROM academy_enrollments WHERE course_id=$1`,
      [course.id]
    ),
    query(
      `SELECT COALESCE(avg(x.progress),0)::numeric(5,2) AS avg_progress FROM (
        SELECT e.user_id,
          CASE WHEN count(l.id)=0 THEN 0
          ELSE 100.0*count(p.lesson_id) FILTER(WHERE p.status='completed')/count(l.id) END AS progress
        FROM academy_enrollments e
        LEFT JOIN academy_lessons l ON l.course_id=e.course_id AND l.published=true
        LEFT JOIN academy_lesson_progress p ON p.lesson_id=l.id AND p.user_id=e.user_id
        WHERE e.course_id=$1 AND e.status IN ('active','completed')
        GROUP BY e.user_id
      ) x`,
      [course.id]
    ),
    query(
      "SELECT COALESCE(sum(amount),0)::numeric AS revenue,count(*)::int AS payments FROM academy_payment_reports WHERE course_id=$1 AND status='confirmed'",
      [course.id]
    ),
    query(
      "SELECT COALESCE(avg(rating),0)::numeric(3,2) AS rating,count(*)::int AS reviews FROM academy_reviews WHERE course_id=$1 AND published=true",
      [course.id]
    ),
    query(
      `SELECT l.id,l.title,
        count(DISTINCT p.user_id) FILTER(WHERE p.status='completed')::int AS completions
       FROM academy_lessons l LEFT JOIN academy_lesson_progress p ON p.lesson_id=l.id
       WHERE l.course_id=$1 GROUP BY l.id,l.title,l.position ORDER BY l.position`,
      [course.id]
    ),
  ]);
  return c.json({
    course: { id: course.id, title: course.title },
    enrollments: enrollments.rows[0],
    average_progress: Number(progress.rows[0]?.avg_progress ?? 0),
    revenue: Number(revenue.rows[0]?.revenue ?? 0),
    payments: Number(revenue.rows[0]?.payments ?? 0),
    rating: Number(reviews.rows[0]?.rating ?? 0),
    reviews: Number(reviews.rows[0]?.reviews ?? 0),
    lessons: lessons.rows,
  });
});

// Enrollment and learning
academyRoutes.post("/courses/:id/enroll", async c => {
  const user = await requireUser(c);
  const { rows: courses } = await query(
    `SELECT c.*,u.wave_phone,u.wave_pay_link,u.wave_payout_mode,u.name AS instructor_name
     FROM academy_courses c JOIN users u ON u.id=c.instructor_id
     WHERE c.id=$1 AND c.status='published'`,
    [c.req.param("id")]
  );
  const course = courses[0];
  if (!course) throw new HTTPException(404, { message: "Cours introuvable" });
  if (course.instructor_id === user.id) return c.json({ owner: true, payment_required: false });

  const body = await c.req.json().catch(() => ({}));
  const { rows: existingRows } = await query(
    "SELECT * FROM academy_enrollments WHERE course_id=$1 AND user_id=$2",
    [course.id, user.id]
  );
  const existing = existingRows[0];
  if (existing?.status === "active" || existing?.status === "completed") {
    return c.json({ enrollment: existing, payment_required: false });
  }

  let coupon: Record<string, any> | null = null;
  if (body.coupon_code) {
    const { rows } = await query(
      `SELECT * FROM academy_coupons WHERE course_id=$1 AND upper(code)=upper($2)
       AND active=true AND (valid_from IS NULL OR valid_from<=now())
       AND (valid_until IS NULL OR valid_until>=now())
       AND (max_uses IS NULL OR uses_count<max_uses)`,
      [course.id, String(body.coupon_code).trim()]
    );
    coupon = rows[0] ?? null;
    if (!coupon) throw new HTTPException(400, { message: "Coupon invalide ou expiré" });
  }

  if (course.access_type === "invite") {
    const inviteCode = String(body.invite_code || "").trim();
    const { rows: invites } = await query(
      `SELECT * FROM academy_invites WHERE course_id=$1 AND upper(code)=upper($2)
       AND active=true AND uses_count<max_uses
       AND (expires_at IS NULL OR expires_at>=now())
       AND (phone IS NULL OR phone=$3)`,
      [course.id, inviteCode, user.phone]
    );
    const invite = invites[0];
    if (!invite) throw new HTTPException(403, { message: "Invitation invalide ou expirée" });
    const result = await transaction(async client => {
      const { rows } = await client.query(
        `INSERT INTO academy_enrollments(course_id,user_id,status,access_source,price_paid,enrolled_at)
         VALUES($1,$2,'active','invite',0,now())
         ON CONFLICT(course_id,user_id) DO UPDATE SET status='active',access_source='invite',
           enrolled_at=COALESCE(academy_enrollments.enrolled_at,now()),updated_at=now()
         RETURNING *`,
        [course.id, user.id]
      );
      await client.query("UPDATE academy_invites SET uses_count=uses_count+1 WHERE id=$1", [invite.id]);
      return rows[0];
    });
    return c.json({ enrollment: result, payment_required: false });
  }

  const amountDue = course.access_type === "free" ? 0 : discountedPrice(course, coupon);
  if (amountDue === 0) {
    const result = await transaction(async client => {
      const source = coupon ? "coupon" : "free";
      const { rows } = await client.query(
        `INSERT INTO academy_enrollments(course_id,user_id,status,access_source,price_paid,coupon_id,enrolled_at)
         VALUES($1,$2,'active',$3,0,$4,now())
         ON CONFLICT(course_id,user_id) DO UPDATE SET status='active',access_source=$3,
           price_paid=0,coupon_id=$4,enrolled_at=COALESCE(academy_enrollments.enrolled_at,now()),updated_at=now()
         RETURNING *`,
        [course.id, user.id, source, coupon?.id ?? null]
      );
      if (coupon) await client.query("UPDATE academy_coupons SET uses_count=uses_count+1 WHERE id=$1", [coupon.id]);
      return rows[0];
    });
    return c.json({ enrollment: result, payment_required: false });
  }

  if (!course.wave_phone && !course.wave_pay_link) {
    throw new HTTPException(409, { message: "L'instructeur doit configurer la réception avant de vendre ce cours" });
  }

  const { rows: enrollments } = await query(
    `INSERT INTO academy_enrollments(course_id,user_id,status,access_source,price_paid,currency,coupon_id)
     VALUES($1,$2,'pending','payment',$3,$4,$5)
     ON CONFLICT(course_id,user_id) DO UPDATE SET status='pending',access_source='payment',
       price_paid=$3,currency=$4,coupon_id=$5,updated_at=now()
     RETURNING *`,
    [course.id, user.id, amountDue, course.currency, coupon?.id ?? null]
  );
  return c.json({
    enrollment: enrollments[0],
    payment_required: true,
    amount_due: amountDue,
    currency: course.currency,
    payout: {
      mode: course.wave_payout_mode,
      wave_phone: course.wave_phone,
      wave_pay_link: course.wave_pay_link,
      instructor_name: course.instructor_name,
    },
  });
});

academyRoutes.post("/enrollments/:id/payment-report", async c => {
  const user = await requireUser(c);
  const body = await c.req.json().catch(() => ({}));
  const { rows } = await query(
    `SELECT e.*,c.status AS course_status FROM academy_enrollments e
     JOIN academy_courses c ON c.id=e.course_id
     WHERE e.id=$1 AND e.user_id=$2`,
    [c.req.param("id"), user.id]
  );
  const enrollment = rows[0];
  if (!enrollment) throw new HTTPException(404, { message: "Inscription introuvable" });
  if (enrollment.status !== "pending") throw new HTTPException(400, { message: "Cette inscription n'attend pas de paiement" });
  const reference = nullableText(body.reference, 160);
  const note = nullableText(body.note, 2000);
  const { rows: existingReports } = await query(
    "SELECT * FROM academy_payment_reports WHERE enrollment_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1",
    [enrollment.id]
  );
  if (existingReports[0]) {
    return c.json({ report: existingReports[0], already_reported: true });
  }
  const { rows: reports } = await query(
    `INSERT INTO academy_payment_reports(enrollment_id,course_id,user_id,amount,currency,reference,note)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [
      enrollment.id,
      enrollment.course_id,
      user.id,
      enrollment.price_paid,
      enrollment.currency,
      reference,
      note,
    ]
  );
  if (reports[0]) return c.json({ report: reports[0] }, 201);
  const { rows: retryRows } = await query(
    "SELECT * FROM academy_payment_reports WHERE enrollment_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1",
    [enrollment.id]
  );
  return c.json({ report: retryRows[0], already_reported: true });
});

academyRoutes.get("/learning/:courseId", async c => {
  const user = await requireUser(c);
  const access = await accessFor(user, c.req.param("courseId"));
  if (!hasLearningAccess(access)) throw new HTTPException(403, { message: "Accès au cours non actif" });
  const outline = await courseOutline(access.course.id, false);
  const [{ rows: progress }, { rows: announcements }] = await Promise.all([
    query("SELECT * FROM academy_lesson_progress WHERE user_id=$1 AND course_id=$2", [user.id, access.course.id]),
    query("SELECT * FROM academy_announcements WHERE course_id=$1 ORDER BY created_at DESC LIMIT 20", [access.course.id]),
  ]);
  return c.json({
    course: access.course,
    enrollment: access.enrollment,
    outline,
    progress,
    announcements,
  });
});

academyRoutes.get("/lessons/:id", async c => {
  const user = await requireUser(c);
  const { lesson, access, preview } = await lessonAccess(user, c.req.param("id"));
  const [{ rows: progress }, { rows: quizRows }, { rows: discussions }] = await Promise.all([
    query("SELECT * FROM academy_lesson_progress WHERE user_id=$1 AND lesson_id=$2", [user.id, lesson.id]),
    query(
      `SELECT q.id,q.title,q.passing_score,q.max_attempts,q.shuffle_questions,
        (SELECT count(*) FROM academy_quiz_attempts a WHERE a.quiz_id=q.id AND a.user_id=$2)::int AS attempts_used,
        EXISTS(SELECT 1 FROM academy_quiz_attempts a WHERE a.quiz_id=q.id AND a.user_id=$2 AND a.passed=true) AS passed
       FROM academy_quizzes q WHERE q.lesson_id=$1`,
      [lesson.id, user.id]
    ),
    query(
      `SELECT d.id,d.parent_id,d.body,d.created_at,u.name AS user_name,u.id AS user_id
       FROM academy_discussions d JOIN users u ON u.id=d.user_id
       WHERE d.lesson_id=$1 AND d.status='published' ORDER BY d.created_at ASC LIMIT 200`,
      [lesson.id]
    ),
  ]);
  let quiz = quizRows[0] ?? null;
  if (quiz) {
    const { rows: questions } = await query(
      "SELECT id,prompt,question_type,options,points,position FROM academy_quiz_questions WHERE quiz_id=$1 ORDER BY position,id",
      [quiz.id]
    );
    quiz = { ...quiz, questions };
  }
  return c.json({ lesson, course: access.course, enrollment: access.enrollment, preview, progress: progress[0] ?? null, quiz, discussions });
});

academyRoutes.post("/lessons/:id/progress", async c => {
  const user = await requireUser(c);
  const { lesson, access, preview } = await lessonAccess(user, c.req.param("id"));
  if (preview && !hasLearningAccess(access)) throw new HTTPException(403, { message: "Inscription requise pour enregistrer la progression" });
  const body = await c.req.json().catch(() => ({}));
  const status = body.status === "completed" ? "completed" : "started";
  const seconds = intField(body.progress_seconds ?? 0, "Progression", 0, 100_000_000);
  const { rows } = await query(
    `INSERT INTO academy_lesson_progress(user_id,lesson_id,course_id,status,progress_seconds,completed_at)
     VALUES($1,$2,$3,$4,$5,CASE WHEN $4='completed' THEN now() ELSE NULL END)
     ON CONFLICT(user_id,lesson_id) DO UPDATE SET
       status=CASE WHEN academy_lesson_progress.status='completed' THEN 'completed' ELSE EXCLUDED.status END,
       progress_seconds=GREATEST(academy_lesson_progress.progress_seconds,EXCLUDED.progress_seconds),
       completed_at=CASE WHEN academy_lesson_progress.status='completed' THEN academy_lesson_progress.completed_at
                         WHEN EXCLUDED.status='completed' THEN now() ELSE NULL END,
       updated_at=now()
     RETURNING *`,
    [user.id, lesson.id, lesson.course_id, status, seconds]
  );
  await query(
    "UPDATE academy_enrollments SET last_lesson_id=$3,updated_at=now() WHERE user_id=$1 AND course_id=$2",
    [user.id, lesson.course_id, lesson.id]
  );
  const completion = status === "completed"
    ? await maybeCompleteCourse(user.id, lesson.course_id)
    : null;
  return c.json({ progress: rows[0], completion });
});

academyRoutes.post("/quizzes/:id/attempt", async c => {
  const user = await requireUser(c);
  const { rows: quizzes } = await query(
    `SELECT q.*,l.course_id,l.id AS lesson_id FROM academy_quizzes q
     JOIN academy_lessons l ON l.id=q.lesson_id WHERE q.id=$1`,
    [c.req.param("id")]
  );
  const quiz = quizzes[0];
  if (!quiz) throw new HTTPException(404, { message: "Quiz introuvable" });
  await lessonAccess(user, quiz.lesson_id);
  const { rows: attempts } = await query(
    "SELECT count(*)::int AS n FROM academy_quiz_attempts WHERE quiz_id=$1 AND user_id=$2",
    [quiz.id, user.id]
  );
  const attemptNo = Number(attempts[0]?.n ?? 0) + 1;
  if (attemptNo > Number(quiz.max_attempts)) throw new HTTPException(400, { message: "Nombre maximum de tentatives atteint" });

  const body = await c.req.json();
  const submitted = body.answers && typeof body.answers === "object" ? body.answers : {};
  const { rows: questions } = await query(
    "SELECT * FROM academy_quiz_questions WHERE quiz_id=$1 ORDER BY position,id",
    [quiz.id]
  );
  if (!questions.length) throw new HTTPException(400, { message: "Ce quiz ne contient aucune question" });
  let earned = 0;
  let total = 0;
  const feedback: Record<string, unknown> = {};
  for (const question of questions) {
    const points = Number(question.points);
    total += points;
    const expected = [...(Array.isArray(question.correct_answers) ? question.correct_answers : [])].map(String).sort();
    const raw = submitted[question.id];
    const actual = (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).map(String).sort();
    const correct = JSON.stringify(expected) === JSON.stringify(actual);
    if (correct) earned += points;
    feedback[question.id] = { correct, explanation: question.explanation ?? null };
  }
  const score = total ? Math.round((earned / total) * 100) : 0;
  const passed = score >= Number(quiz.passing_score);
  const { rows: inserted } = await query(
    `INSERT INTO academy_quiz_attempts(quiz_id,user_id,attempt_no,score,passed,answers)
     VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id,attempt_no,score,passed,submitted_at`,
    [quiz.id, user.id, attemptNo, score, passed, JSON.stringify(submitted)]
  );
  const completion = passed ? await maybeCompleteCourse(user.id, quiz.course_id) : null;
  return c.json({ attempt: inserted[0], feedback, completion });
});

academyRoutes.post("/courses/:id/reviews", async c => {
  const user = await requireUser(c);
  const access = await accessFor(user, c.req.param("id"));
  if (!hasLearningAccess(access) || access.owner) throw new HTTPException(403, { message: "Inscription active requise" });
  const body = await c.req.json();
  const rating = intField(body.rating, "Note", 1, 5);
  const { rows } = await query(
    `INSERT INTO academy_reviews(course_id,user_id,rating,body)
     VALUES($1,$2,$3,$4)
     ON CONFLICT(course_id,user_id) DO UPDATE SET rating=EXCLUDED.rating,body=EXCLUDED.body,updated_at=now()
     RETURNING *`,
    [access.course.id, user.id, rating, nullableText(body.body, 4000)]
  );
  return c.json({ review: rows[0] }, 201);
});

academyRoutes.post("/courses/:id/discussions", async c => {
  const user = await requireUser(c);
  const access = await accessFor(user, c.req.param("id"));
  if (!hasLearningAccess(access)) throw new HTTPException(403, { message: "Accès au cours requis" });
  const body = await c.req.json();
  const lessonId = body.lesson_id ? String(body.lesson_id) : null;
  if (lessonId) {
    const { rows } = await query("SELECT id FROM academy_lessons WHERE id=$1 AND course_id=$2", [lessonId, access.course.id]);
    if (!rows[0]) throw new HTTPException(400, { message: "Leçon invalide" });
  }
  const parentId = body.parent_id ? String(body.parent_id) : null;
  if (parentId) {
    const { rows: parents } = await query(
      "SELECT id,lesson_id FROM academy_discussions WHERE id=$1 AND course_id=$2 AND status='published'",
      [parentId, access.course.id]
    );
    if (!parents[0] || (lessonId && parents[0].lesson_id && parents[0].lesson_id !== lessonId)) {
      throw new HTTPException(400, { message: "Discussion parente invalide" });
    }
  }
  const { rows } = await query(
    `INSERT INTO academy_discussions(course_id,lesson_id,user_id,parent_id,body)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,
    [access.course.id, lessonId, user.id, parentId, textField(body.body, "Message", 4000)]
  );
  return c.json({ discussion: rows[0] }, 201);
});

// Admin moderation
academyRoutes.get("/admin/courses", async c => {
  const user = await requireUser(c);
  if (user.role !== "admin") throw new HTTPException(403, { message: "Accès admin requis" });
  const { rows } = await query(
    `SELECT c.*,u.name AS instructor_name,u.phone AS instructor_phone,
      (SELECT count(*) FROM academy_enrollments e WHERE e.course_id=c.id)::int AS enrollments
     FROM academy_courses c JOIN users u ON u.id=c.instructor_id
     ORDER BY c.created_at DESC LIMIT 300`
  );
  return c.json({ courses: rows });
});

academyRoutes.patch("/admin/courses/:id", async c => {
  const user = await requireUser(c);
  if (user.role !== "admin") throw new HTTPException(403, { message: "Accès admin requis" });
  const body = await c.req.json();
  const status = String(body.status || "");
  if (!["draft", "published", "archived"].includes(status)) throw new HTTPException(400, { message: "Statut invalide" });
  const { rows: courseRows } = await query(
    "SELECT id,instructor_id,access_type,price FROM academy_courses WHERE id=$1",
    [c.req.param("id")]
  );
  const course = courseRows[0];
  if (!course) throw new HTTPException(404, { message: "Cours introuvable" });
  if (status === "published") {
    await validateCoursePublishable({
      courseId: course.id,
      instructorId: course.instructor_id,
      accessType: course.access_type,
      price: Number(course.price),
    });
  }
  const { rows } = await query(
    "UPDATE academy_courses SET status=$2,published_at=CASE WHEN $2='published' AND published_at IS NULL THEN now() ELSE published_at END,updated_at=now() WHERE id=$1 RETURNING *",
    [c.req.param("id"), status]
  );
  if (!rows[0]) throw new HTTPException(404, { message: "Cours introuvable" });
  return c.json({ course: rows[0] });
});

academyRoutes.get("/admin/stats", async c => {
  const user = await requireUser(c);
  if (user.role !== "admin") throw new HTTPException(403, { message: "Accès admin requis" });
  const [courses, enrollments, revenue, certificates] = await Promise.all([
    query("SELECT count(*)::int AS total,count(*) FILTER(WHERE status='published')::int AS published FROM academy_courses"),
    query("SELECT count(*)::int AS total,count(*) FILTER(WHERE status='completed')::int AS completed FROM academy_enrollments"),
    query("SELECT COALESCE(sum(amount),0)::numeric AS total FROM academy_payment_reports WHERE status='confirmed'"),
    query("SELECT count(*)::int AS total FROM academy_certificates"),
  ]);
  return c.json({
    courses: courses.rows[0],
    enrollments: enrollments.rows[0],
    direct_payment_volume: Number(revenue.rows[0]?.total ?? 0),
    certificates: Number(certificates.rows[0]?.total ?? 0),
  });
});
