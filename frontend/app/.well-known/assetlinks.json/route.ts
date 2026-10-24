import { NextResponse } from "next/server";

const PACKAGE_NAME = "app.mastercota.mastercota";

function fingerprints() {
  return (process.env.ANDROID_APP_LINK_SHA256_CERT_FINGERPRINT || "")
    .split(",")
    .map(value => value.trim().toUpperCase())
    .filter(Boolean);
}

export const dynamic = "force-dynamic";

export async function GET() {
  const sha256CertFingerprints = fingerprints();
  if (sha256CertFingerprints.length === 0) {
    return NextResponse.json([], {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: PACKAGE_NAME,
          sha256_cert_fingerprints: sha256CertFingerprints,
        },
      },
    ],
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
