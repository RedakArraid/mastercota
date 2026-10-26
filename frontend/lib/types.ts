export type CotisationSettings = {
  show_best_contributor?: boolean;
  show_contributors?: boolean;
  show_progress?: boolean;
  show_target_amount?: boolean;
  anonymous_allowed?: boolean;
  min_amount?: number;
  share_message?: string | null;
};

export type Cotisation = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  target_amount: number;
  current_amount: number;
  progress_percent?: number;
  deadline: string;
  owner_id: string;
  status: "pending_fee" | "active" | "closed" | "completed" | string;
  settings: CotisationSettings | null;
  created_at: string;
  updated_at?: string;
  edit_version?: number;
  platform_payment?: { status: string; application_status: string; review_reason?: string | null; review_resolved_at?: string | null; review_resolved_by?: string | null; review_resolution_note?: string | null; reference: string; purpose: string } | null;
  close_reason?: "manual" | "expired" | null;
  lifecycle?: {
    can_reopen: boolean;
    can_extend: boolean;
    can_record_contribution: boolean;
    extension_error?: string | null;
  };
  duration_days?: number | null;
  starts_at?: string;
  platform_fee_amount?: number;
  platform_fee_status?: string;
  platform_fee_reference?: string | null;
  is_free_tier?: boolean;
  extension_count?: number;
  owner_wave_phone?: string | null;
  owner_wave_pay_link?: string | null;
  owner_wave_payout_mode?: "business" | "phone" | null;
  owner_name?: string | null;
};

export type Contribution = {
  id: string;
  cotisation_id: string;
  contributor_name: string;
  contributor_phone: string;
  amount: number;
  status:
    | "pending"
    | "awaiting_confirmation"
    | "paid"
    | "failed"
    | "rejected"
    | string;
  paystack_reference: string | null;
  payment_method: string | null;
  note?: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  phone: string | null;
  name: string | null;
  avatar_url: string | null;
  paystack_subaccount_id: string | null;
  wave_phone?: string | null;
  wave_pay_link?: string | null;
  wave_payout_mode?: "business" | "phone" | null;
  role?: string;
  created_at: string;
};

export type SiteConfig = {
  id: number;
  phone_whatsapp: string;
  email_contact: string;
  email_support: string;
  social_instagram: string;
  social_facebook: string;
  social_twitter: string;
  social_tiktok: string;
  social_youtube: string;
  doc_cgu_url: string;
  doc_privacy_url: string;
  doc_mentions_url: string;
  landing?: {
    hero_title: string;
    hero_subtitle: string;
    cta_primary: string;
    cta_secondary: string;
    features: { title: string; body: string }[];
  };
};


export type AcademyCourse = {
  id: string;
  slug: string;
  instructor_id: string;
  instructor_name?: string | null;
  instructor_headline?: string | null;
  instructor_bio?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  category: string;
  level: "beginner" | "intermediate" | "advanced" | "all";
  language: string;
  cover_url?: string | null;
  trailer_url?: string | null;
  price: number | string;
  currency: string;
  access_type: "free" | "paid" | "invite";
  status?: "draft" | "published" | "archived";
  sequential?: boolean;
  drip_days?: number;
  certificate_enabled?: boolean;
  estimated_minutes?: number;
  rating?: number | string;
  reviews_count?: number;
  learners_count?: number;
  lessons_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type AcademyLesson = {
  id: string;
  course_id?: string;
  section_id: string;
  title: string;
  lesson_type: "text" | "video" | "live" | "download";
  content?: string | null;
  video_url?: string | null;
  live_url?: string | null;
  resource_url?: string | null;
  resources?: Array<{ title?: string; url?: string }>;
  duration_minutes: number;
  position: number;
  preview: boolean;
  published?: boolean;
  unlock_after_days?: number;
  quiz_id?: string | null;
  quiz_title?: string | null;
};

export type AcademySection = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons: AcademyLesson[];
};

export type AcademyEnrollment = {
  id: string;
  course_id: string;
  user_id: string;
  status: "pending" | "active" | "completed" | "revoked";
  access_source: "free" | "payment" | "coupon" | "invite" | "admin";
  price_paid: number | string;
  currency: string;
  enrolled_at?: string | null;
  completed_at?: string | null;
  revoked_from_status?: "active" | "completed" | null;
  revoked_at?: string | null;
  revocation_reason?: string | null;
  last_lesson_id?: string | null;
  title?: string;
  slug?: string;
  subtitle?: string | null;
  cover_url?: string | null;
  instructor_name?: string | null;
  lessons_count?: number;
  completed_lessons?: number;
};

export type AcademyQuiz = {
  id: string;
  title: string;
  passing_score: number;
  max_attempts: number;
  attempts_used: number;
  passed: boolean;
  questions: Array<{
    id: string;
    prompt: string;
    question_type: "single" | "multiple" | "true_false";
    options: string[];
    points: number;
    position: number;
  }>;
};


export type AcademyAssignment = {
  id: string;
  lesson_id: string;
  course_id: string;
  title: string;
  instructions: string;
  submission_type: "text" | "url" | "text_or_url";
  max_score: number;
  passing_score: number;
  required: boolean;
  due_after_days?: number | null;
};

export type AcademyAssignmentSubmission = {
  id: string;
  assignment_id: string;
  course_id: string;
  user_id: string;
  text_content?: string | null;
  submission_url?: string | null;
  status: "submitted" | "graded" | "revision_requested";
  score?: number | null;
  passed?: boolean | null;
  feedback?: string | null;
  submitted_at: string;
  graded_at?: string | null;
};

export type AcademyLessonNote = {
  user_id: string;
  lesson_id: string;
  course_id: string;
  body: string;
  bookmarked: boolean;
  updated_at: string;
};

export type AcademyCohortScheduleItem = {
  cohort_id: string;
  cohort_title: string;
  cohort_starts_at: string;
  cohort_ends_at?: string | null;
  session_id?: string | null;
  session_title?: string | null;
  starts_at?: string | null;
  duration_minutes?: number | null;
  meeting_url?: string | null;
  recording_url?: string | null;
  notes?: string | null;
};
