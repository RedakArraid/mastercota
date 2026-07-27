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
  deadline: string;
  owner_id: string;
  status: "pending_fee" | "active" | "closed" | "completed" | string;
  settings: CotisationSettings | null;
  created_at: string;
  duration_days?: number | null;
  starts_at?: string;
  platform_fee_amount?: number;
  platform_fee_status?: string;
  platform_fee_reference?: string | null;
  is_free_tier?: boolean;
  extension_count?: number;
  owner_wave_phone?: string | null;
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
