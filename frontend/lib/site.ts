import { backendFetch } from "@/lib/backend";
import type { SiteConfig } from "@/lib/types";

export type LandingContent = {
  hero_title: string;
  hero_subtitle: string;
  cta_primary: string;
  cta_secondary: string;
  features: { title: string; body: string }[];
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  published: boolean;
  nav_label: string | null;
  nav_placement: "header" | "footer" | "both" | "none";
  sort_order: number;
};

export type SiteChrome = {
  config: SiteConfig & { landing?: LandingContent };
  headerLinks: { href: string; label: string }[];
  footerLinks: { href: string; label: string }[];
};

const defaultLanding: LandingContent = {
  hero_title: "Cotisez ensemble, facilement",
  hero_subtitle:
    "Créez une cotisation, partagez un lien, recevez via Mobile Money. Pensé pour la Côte d'Ivoire.",
  cta_primary: "Créer une cotisation",
  cta_secondary: "Comment ça marche",
  features: [
    {
      title: "Lien public",
      body: "Partagez votre page sur WhatsApp. Contribution sans compte.",
    },
    {
      title: "Mobile Money",
      body: "Wave, MTN, Orange — confirmation automatique.",
    },
    {
      title: "Suivi en direct",
      body: "Progression et contributeurs mis à jour en continu.",
    },
  ],
};

export async function getSiteChrome(): Promise<SiteChrome> {
  let config: SiteConfig & { landing?: LandingContent } = {
    id: 1,
    phone_whatsapp: "",
    email_contact: "",
    email_support: "support@mastercota.com",
    social_instagram: "",
    social_facebook: "",
    social_twitter: "",
    social_tiktok: "",
    social_youtube: "",
    doc_cgu_url: "",
    doc_privacy_url: "",
    doc_mentions_url: "",
    landing: defaultLanding,
  };
  let pages: CmsPage[] = [];

  try {
    const [cfg, pgs] = await Promise.all([
      backendFetch<{ config: SiteConfig & { landing?: LandingContent } }>(
        "/api/site-config"
      ),
      backendFetch<{ pages: CmsPage[] }>("/api/pages"),
    ]);
    if (cfg.config) {
      config = {
        ...cfg.config,
        landing: cfg.config.landing ?? defaultLanding,
      };
    }
    pages = pgs.pages ?? [];
  } catch {
    pages = [
      {
        id: "1",
        slug: "comment-ca-marche",
        title: "Comment ça marche",
        excerpt: "",
        body_md: "",
        published: true,
        nav_label: "Comment ça marche",
        nav_placement: "header",
        sort_order: 10,
      },
      {
        id: "2",
        slug: "cgu",
        title: "CGU",
        excerpt: "",
        body_md: "",
        published: true,
        nav_label: "CGU",
        nav_placement: "footer",
        sort_order: 20,
      },
      {
        id: "3",
        slug: "confidentialite",
        title: "Confidentialité",
        excerpt: "",
        body_md: "",
        published: true,
        nav_label: "Confidentialité",
        nav_placement: "footer",
        sort_order: 30,
      },
    ];
  }

  const toLink = (p: CmsPage) => ({
    href: `/p/${p.slug}`,
    label: p.nav_label || p.title,
  });

  return {
    config,
    headerLinks: pages
      .filter((p) => p.nav_placement === "header" || p.nav_placement === "both")
      .map(toLink),
    footerLinks: pages
      .filter((p) => p.nav_placement === "footer" || p.nav_placement === "both")
      .map(toLink),
  };
}

export async function getPageBySlug(slug: string): Promise<CmsPage | null> {
  try {
    const data = await backendFetch<{ page: CmsPage | null }>(
      `/api/pages?slug=${encodeURIComponent(slug)}`
    );
    return data.page;
  } catch {
    return null;
  }
}

export function mdToHtml(md: string): string {
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .split(/\n\n+/)
    .map((block) => {
      const t = block.trim();
      if (t.startsWith("### ")) {
        return `<h3 class="mt-8 text-lg font-semibold text-ink">${t.slice(4)}</h3>`;
      }
      if (t.startsWith("## ")) {
        return `<h2 class="mt-10 text-2xl font-bold text-ink">${t.slice(3)}</h2>`;
      }
      if (t.startsWith("# ")) {
        return `<h1 class="text-3xl font-extrabold text-ink">${t.slice(2)}</h1>`;
      }
      const withCode = t.replace(
        /`([^`]+)`/g,
        '<code class="rounded bg-secondary px-1.5 py-0.5 text-sm">$1</code>'
      );
      return `<p class="mt-4 text-muted-foreground leading-relaxed">${withCode.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}
