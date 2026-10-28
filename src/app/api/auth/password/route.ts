import { type NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_SECONDS,
  createAuthToken,
  readAuthToken,
} from "@/lib/auth-session";
import {
  changeEmployeePassword,
  EMPLOYEE_INITIAL_PASSWORD,
  verifyEmployeePassword,
} from "@/lib/employee-credentials";

interface PasswordPayload {
  currentPassword?: unknown;
  newPassword?: unknown;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PUT(request: NextRequest) {
  try {
    const session = await readAuthToken(
      request.cookies.get(AUTH_COOKIE_NAME)?.value,
    );

    if (
      !session ||
      session.authType !== "employee_phone" ||
      session.employeeCode === null
    ) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ไม่สามารถเปลี่ยนรหัสผ่านตรงนี้ได้" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as PasswordPayload;
    const currentPassword = text(body.currentPassword);
    const newPassword = text(body.newPassword);

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร" },
        { status: 400 },
      );
    }
    if (newPassword === EMPLOYEE_INITIAL_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "กรุณาตั้งรหัสผ่านใหม่ที่ไม่ใช่ 123456" },
        { status: 400 },
      );
    }
    if (
      !session.mustChangePassword &&
      !(await verifyEmployeePassword(session.employeeCode, currentPassword))
    ) {
      return NextResponse.json(
        { success: false, error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    await changeEmployeePassword(session.employeeCode, newPassword);
    const sessionWithoutExpiry = {
      codePerson: session.codePerson,
      nameUser: session.nameUser,
      username: session.username,
      canManage: session.canManage,
      employeeCode: session.employeeCode,
      level: session.level,
      authType: session.authType,
      mustChangePassword: false,
    };
    const token = await createAuthToken(sessionWithoutExpiry);
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("Employee password update error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถเปลี่ยนรหัสผ่านได้" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
