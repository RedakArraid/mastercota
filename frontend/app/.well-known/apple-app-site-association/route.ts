import { NextResponse } from "next/server";

const BUNDLE_ID = "app.mastercota.mastercota";

export const dynamic = "force-dynamic";

export async function GET() {
  const teamId = (process.env.APPLE_TEAM_ID || "").trim();
  if (!teamId) {
    return NextResponse.json(
      { applinks: { apps: [], details: [] } },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.${BUNDLE_ID}`,
            paths: ["/c/*"],
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
