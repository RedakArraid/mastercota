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
  let user = token ? await verifyToken(token) : null;
  if (user) {
    try {
      const backend = process.env.BACKEND_URL || "http://127.0.0.1:4000";
      const response = await fetch(`${backend}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (response.status === 401) user = null;
    } catch { /* The page will render its existing service-unavailable state. */ }
  }
  function finish(response: NextResponse) {
    if (token && !user) {
      const hostname = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).hostname;
      const domain = hostname === "localhost" || hostname === "127.0.0.1" ? undefined : `.${hostname.replace(/^www\./, "")}`;
      response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0, ...(domain ? { domain } : {}) });
    }
    return response;
  }

  // admin.mastercota.com → rewrite clean URLs to /admin/*
  if (isAdminHost(host)) {
    if (
      path.startsWith("/_next") ||
      path.startsWith("/api") ||
      path.startsWith("/auth") ||
      path.includes(".")
    ) {
      return finish(NextResponse.next());
    }

    if (!user && !path.startsWith("/auth")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/phone";
      url.searchParams.set("next", path === "/" ? "/admin" : `/admin${path}`);
      return finish(NextResponse.redirect(url));
    }

    const rewritePath =
      path === "/"
        ? "/admin"
        : path.startsWith("/admin")
          ? path
          : `/admin${path}`;
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return finish(NextResponse.rewrite(url));
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
    url.searchParams.set("next", path + request.nextUrl.search);
    return finish(NextResponse.redirect(url));
  }

  if (user && isAuthRoute) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next.split("?")[0] : "/home";
    url.search = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next.split("?").slice(1).join("?") : "";
    return finish(NextResponse.redirect(url));
  }

  if (user && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return finish(NextResponse.redirect(url));
  }

  return finish(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
