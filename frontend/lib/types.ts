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
  status: "active" | "closed" | "completed" | string;
  settings: CotisationSettings | null;
  created_at: string;
};

export type Contribution = {
  id: string;
  cotisation_id: string;
  contributor_name: string;
  contributor_phone: string;
  amount: number;
  status: "pending" | "paid" | "failed" | string;
  paystack_reference: string | null;
  payment_method: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  phone: string | null;
  name: string | null;
  avatar_url: string | null;
  paystack_subaccount_id: string | null;
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
