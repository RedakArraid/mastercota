import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const teamId = (process.env.APPLE_TEAM_ID || "7WUWLG5X48").trim();
  const bundleId = (process.env.IOS_BUNDLE_ID || "app.mastercota.mastercota").trim();

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [`${teamId}.${bundleId}`],
            components: [
              {
                "/": "/c/*",
                comment: "Open public Mastercota cotisations in the native app",
              },
            ],
          },
        ],
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    }
  );
}
