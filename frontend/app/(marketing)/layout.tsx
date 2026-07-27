import { getSiteChrome } from "@/lib/site";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config, headerLinks, footerLinks } = await getSiteChrome();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader links={headerLinks} />
      <main className="flex-1">{children}</main>
      <SiteFooter
        links={footerLinks}
        supportEmail={config.email_support}
        phoneWhatsapp={config.phone_whatsapp}
      />
    </div>
  );
}
