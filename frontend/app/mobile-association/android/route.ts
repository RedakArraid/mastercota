import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function fingerprint(value: string): string | null {
  const hex = value.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
  if (hex.length !== 64) return null;
  return hex.match(/.{2}/g)?.join(":") ?? null;
}

export async function GET() {
  const fingerprints = (process.env.ANDROID_APP_CERT_SHA256 || "")
    .split(/[;,\n]/)
    .map(value => fingerprint(value.trim()))
    .filter((value): value is string => Boolean(value));

  return NextResponse.json(
    fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: "app.mastercota.mastercota",
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [],
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}
