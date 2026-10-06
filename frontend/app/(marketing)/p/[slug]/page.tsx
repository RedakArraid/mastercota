import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { getPageBySlug, mdToHtml } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return { title: "Page" };
  return {
    title: page.title,
    description: page.excerpt || undefined,
  };
}

export default async function DynamicCmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
      <Logo href="/" size="sm" className="mb-6" />
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">
        {page.title}
      </h1>
      {page.excerpt ? (
        <p className="mt-3 text-lg text-muted-foreground">{page.excerpt}</p>
      ) : null}
      <div
        className="prose-mastercota mt-10"
        dangerouslySetInnerHTML={{ __html: mdToHtml(page.body_md) }}
      />
    </article>
  );
}
