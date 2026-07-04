import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, readAuthToken } from "@/lib/auth-session";

const publicPathPrefixes = [
  "/login",
  "/api/auth",
  "/api/health",
  "/api/monitor",
  "/_next",
] as const;

const publicFilePattern =
  /^\/(?:favicon\.ico|opengraph-image\.png|logo\.svg|.*\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map|txt|xml))$/;

function isPublicPath(pathname: string) {
  return (
    publicPathPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    publicFilePattern.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await readAuthToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        error: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  const nextPath = `${pathname}${search}`;

  if (nextPath !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
