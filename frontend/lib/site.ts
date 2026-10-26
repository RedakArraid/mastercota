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
  headerLinks: { href: string; label: string; shortLabel?: string }[];
  footerLinks: { href: string; label: string }[];
};

const defaultLanding: LandingContent = {
  hero_title: "Organisez votre cotisation. Gardez le suivi clair.",
  hero_subtitle:
    "Créez une page, partagez-la dans votre groupe et suivez les contributions au même endroit. L’argent va directement à l’organisateur : Mastercota prend 0 % sur les contributions.",
  cta_primary: "Créer ma première cotisation",
  cta_secondary: "Comment ça marche",
  features: [
    {
      title: "Un lien pour le groupe",
      body: "Partagez votre page dans WhatsApp ou ailleurs. Les participants contribuent sans créer de compte.",
    },
    {
      title: "Fonds versés directement",
      body: "Les contributions sont envoyées directement à l’organisateur. Mastercota ne conserve pas l’argent collecté.",
    },
    {
      title: "Suivi et confirmation",
      body: "Chaque transfert signalé reste visible jusqu’à sa confirmation par l’organisateur.",
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

  /** 3 onglets produit dans le header. */
  const productHeader = [
    { href: "/", label: "Accueil", shortLabel: "Accueil" },
    {
      href: "/comment-ca-marche",
      label: "Comment ça marche",
      shortLabel: "Guide",
    },
    { href: "/frais", label: "Frais", shortLabel: "Frais" },
    { href: "/academy", label: "Academy", shortLabel: "Academy" },
  ];

  const footerDefaults = [
    { href: "/", label: "Accueil" },
    { href: "/comment-ca-marche", label: "Comment ça marche" },
    { href: "/frais", label: "Frais" },
    { href: "/academy", label: "Academy" },
  ];

  const cmsFooter = pages
    .filter((p) => p.nav_placement === "footer" || p.nav_placement === "both")
    .map(toLink);

  // Dédupliquer footer par href
  const footerSeen = new Set<string>();
  const footerLinks = [...footerDefaults, ...cmsFooter].filter((l) => {
    if (footerSeen.has(l.href)) return false;
    footerSeen.add(l.href);
    return true;
  });

  return {
    config,
    headerLinks: productHeader,
    footerLinks,
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

  const inline = (t: string) =>
    t
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(
        /`([^`]+)`/g,
        '<code>$1</code>'
      )
      .replace(
        /\[([^\]]+)\]\((https?:[^)]+)\)/g,
        '<a href="$2" rel="noreferrer" target="_blank">$1</a>'
      );

  return escaped
    .split(/\n\n+/)
    .map((block) => {
      const t = block.trim();
      if (t.startsWith("### ")) {
        return `<h3>${inline(t.slice(4))}</h3>`;
      }
      if (t.startsWith("## ")) {
        return `<h2>${inline(t.slice(3))}</h2>`;
      }
      if (t.startsWith("# ")) {
        return `<h1>${inline(t.slice(2))}</h1>`;
      }
      if (/^(- |\* |\d+\. )/.test(t)) {
        const items = t.split("\n").map((line) => {
          const item = line.replace(/^(- |\* |\d+\. )/, "").trim();
          return `<li>${inline(item)}</li>`;
        });
        const ordered = /^\d+\. /.test(t);
        return ordered
          ? `<ol>${items.join("")}</ol>`
          : `<ul>${items.join("")}</ul>`;
      }
      return `<p>${inline(t).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}
