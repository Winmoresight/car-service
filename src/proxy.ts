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
    return NextResponse.redirect(
      new URL(
        session.mustChangePassword
          ? "/change-password"
          : session.canManage
            ? "/"
            : "/check-in",
        request.url,
      ),
    );
  }

  if (
    session?.mustChangePassword &&
    pathname !== "/change-password" &&
    !pathname.startsWith("/api/auth/")
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: "กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน" },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session && pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        error: "กรุณาเข้าสู่ระบบก่อนใช้งาน",
      },
      { status: 401 },
    );
  }

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${search}`;

    if (nextPath !== "/") {
      loginUrl.searchParams.set("next", nextPath);
    }

    return NextResponse.redirect(loginUrl);
  }

  if (!session.canManage) {
    if (
      pathname === "/check-in" ||
      pathname === "/api/check-in" ||
      pathname === "/change-password"
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          success: false,
          error: "บัญชีพนักงานใช้งานได้เฉพาะหน้าลงเวลาทำงาน",
        },
        { status: 403 },
      );
    }

    return NextResponse.redirect(new URL("/check-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
