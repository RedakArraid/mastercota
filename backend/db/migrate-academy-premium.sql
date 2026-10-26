-- Premium Academy add-ons: assignments, private notes and cohorts.

CREATE TABLE IF NOT EXISTS academy_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES academy_lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  instructions text NOT NULL CHECK (length(trim(instructions)) BETWEEN 1 AND 12000),
  submission_type text NOT NULL DEFAULT 'text'
    CHECK (submission_type IN ('text','url','text_or_url')),
  max_score integer NOT NULL DEFAULT 100 CHECK (max_score BETWEEN 1 AND 10000),
  passing_score integer NOT NULL DEFAULT 60 CHECK (passing_score BETWEEN 0 AND 100),
  required boolean NOT NULL DEFAULT true,
  due_after_days integer CHECK (due_after_days IS NULL OR due_after_days BETWEEN 0 AND 3650),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_assignments_course_idx
  ON academy_assignments(course_id, lesson_id);

CREATE TABLE IF NOT EXISTS academy_assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES academy_assignments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text_content text,
  submission_url text,
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','graded','revision_requested')),
  score integer CHECK (score IS NULL OR score BETWEEN 0 AND 10000),
  passed boolean,
  feedback text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  graded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id,user_id)
);

CREATE INDEX IF NOT EXISTS academy_assignment_submissions_course_idx
  ON academy_assignment_submissions(course_id,status,submitted_at DESC);

CREATE TABLE IF NOT EXISTS academy_lesson_notes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  body text NOT NULL DEFAULT '',
  bookmarked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,lesson_id)
);

CREATE INDEX IF NOT EXISTS academy_lesson_notes_user_idx
  ON academy_lesson_notes(user_id,course_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS academy_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','active','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_cohorts_course_idx
  ON academy_cohorts(course_id,starts_at);

CREATE TABLE IF NOT EXISTS academy_cohort_members (
  cohort_id uuid NOT NULL REFERENCES academy_cohorts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES academy_enrollments(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(cohort_id,user_id)
);

CREATE TABLE IF NOT EXISTS academy_cohort_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES academy_cohorts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 180),
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 1 AND 1440),
  meeting_url text NOT NULL,
  recording_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS academy_cohort_sessions_idx
  ON academy_cohort_sessions(cohort_id,starts_at);
