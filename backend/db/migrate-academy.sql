-- Mastercota Academy: premium LMS foundation.

CREATE TABLE IF NOT EXISTS instructor_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline text,
  bio text,
  website_url text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 160),
  subtitle text,
  description text,
  category text NOT NULL DEFAULT 'Général',
  level text NOT NULL DEFAULT 'all'
    CHECK (level IN ('beginner','intermediate','advanced','all')),
  language text NOT NULL DEFAULT 'fr',
  cover_url text,
  trailer_url text,
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'XOF',
  access_type text NOT NULL DEFAULT 'free'
    CHECK (access_type IN ('free','paid','invite')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  sequential boolean NOT NULL DEFAULT true,
  drip_days integer NOT NULL DEFAULT 0 CHECK (drip_days >= 0 AND drip_days <= 3650),
  certificate_enabled boolean NOT NULL DEFAULT true,
  estimated_minutes integer NOT NULL DEFAULT 0 CHECK (estimated_minutes >= 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_courses_instructor_idx
  ON academy_courses(instructor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS academy_courses_public_idx
  ON academy_courses(status, category, created_at DESC);

CREATE TABLE IF NOT EXISTS academy_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_sections_course_idx
  ON academy_sections(course_id, position, created_at);

CREATE TABLE IF NOT EXISTS academy_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES academy_sections(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  lesson_type text NOT NULL DEFAULT 'text'
    CHECK (lesson_type IN ('text','video','live','download')),
  content text,
  video_url text,
  live_url text,
  resource_url text,
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_minutes integer NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  position integer NOT NULL DEFAULT 0,
  preview boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  unlock_after_days integer NOT NULL DEFAULT 0 CHECK (unlock_after_days >= 0 AND unlock_after_days <= 3650),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_lessons_course_idx
  ON academy_lessons(course_id, section_id, position);

CREATE TABLE IF NOT EXISTS academy_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL
    CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(14,2) NOT NULL CHECK (discount_value > 0),
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, code)
);

CREATE TABLE IF NOT EXISTS academy_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  phone text,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','completed','revoked')),
  access_source text NOT NULL DEFAULT 'free'
    CHECK (access_source IN ('free','payment','coupon','invite','admin')),
  price_paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (price_paid >= 0),
  currency text NOT NULL DEFAULT 'XOF',
  coupon_id uuid REFERENCES academy_coupons(id) ON DELETE SET NULL,
  enrolled_at timestamptz,
  completed_at timestamptz,
  last_lesson_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS academy_enrollments_user_idx
  ON academy_enrollments(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS academy_enrollments_course_idx
  ON academy_enrollments(course_id, status, created_at DESC);

ALTER TABLE academy_enrollments
  DROP CONSTRAINT IF EXISTS academy_enrollments_last_lesson_fk;
ALTER TABLE academy_enrollments
  ADD CONSTRAINT academy_enrollments_last_lesson_fk
  FOREIGN KEY (last_lesson_id) REFERENCES academy_lessons(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS academy_payment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES academy_enrollments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'XOF',
  reference text,
  note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','rejected')),
  confirmed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS academy_payment_reports_pending_unique
  ON academy_payment_reports(enrollment_id)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS academy_lesson_progress (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started','completed')),
  progress_seconds integer NOT NULL DEFAULT 0 CHECK (progress_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS academy_progress_course_idx
  ON academy_lesson_progress(user_id, course_id, status);

CREATE TABLE IF NOT EXISTS academy_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES academy_lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  passing_score integer NOT NULL DEFAULT 70
    CHECK (passing_score BETWEEN 0 AND 100),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 100),
  shuffle_questions boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES academy_quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  question_type text NOT NULL DEFAULT 'single'
    CHECK (question_type IN ('single','multiple','true_false')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  explanation text,
  points integer NOT NULL DEFAULT 1 CHECK (points > 0),
  position integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS academy_quiz_questions_idx
  ON academy_quiz_questions(quiz_id, position);

CREATE TABLE IF NOT EXISTS academy_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES academy_quizzes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  score integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id, attempt_no)
);

CREATE TABLE IF NOT EXISTS academy_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS academy_reviews_course_idx
  ON academy_reviews(course_id, published, created_at DESC);

CREATE TABLE IF NOT EXISTS academy_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES academy_lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES academy_discussions(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('published','hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_discussions_course_idx
  ON academy_discussions(course_id, lesson_id, created_at);

CREATE TABLE IF NOT EXISTS academy_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academy_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS academy_certificates_user_idx
  ON academy_certificates(user_id, issued_at DESC);
