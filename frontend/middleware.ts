import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth-token";

function isAdminHost(host: string) {
  const h = host.split(":")[0].toLowerCase();
  return h === "admin.mastercota.com" || h === "admin.localhost";
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const host = request.headers.get("host") || "";
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifyToken(token) : null;

  // admin.mastercota.com → rewrite clean URLs to /admin/*
  if (isAdminHost(host)) {
    if (
      path.startsWith("/_next") ||
      path.startsWith("/api") ||
      path.startsWith("/auth") ||
      path.includes(".")
    ) {
      return NextResponse.next();
    }

    if (!user && !path.startsWith("/auth")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/phone";
      url.searchParams.set("next", path === "/" ? "/admin" : `/admin${path}`);
      return NextResponse.redirect(url);
    }

    const rewritePath =
      path === "/"
        ? "/admin"
        : path.startsWith("/admin")
          ? path
          : `/admin${path}`;
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url);
  }

  const isAuthRoute = path.startsWith("/auth") || path === "/onboarding";
  const isAppRoute =
    path.startsWith("/home") ||
    path.startsWith("/profile") ||
    path.startsWith("/cotisation");
  const isAdminRoute = path.startsWith("/admin");

  if (!user && (isAppRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/phone";
    if (isAdminRoute) url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next?.startsWith("/") ? next : "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
