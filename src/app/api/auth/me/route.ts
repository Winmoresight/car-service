import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, readAuthToken } from "@/lib/auth-session";

export async function GET() {
  const cookieStore = await cookies();
  const session = await readAuthToken(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        error: "ยังไม่ได้เข้าสู่ระบบ",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      codePerson: session.codePerson,
      nameUser: session.nameUser,
      username: session.username,
    },
  });
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
