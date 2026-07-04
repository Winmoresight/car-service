import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_MAX_AGE_SECONDS,
  createAuthToken,
} from "@/lib/auth-session";
import { executeQuery } from "@/lib/db";

interface LoginPayload {
  username?: unknown;
  password?: unknown;
}

interface PasswordColumnRow {
  columnName: string;
}

interface EmployeeLoginRow {
  codePerson: string | number | null;
  nameUser: string | null;
  username: string | null;
}

const passwordColumnCandidates = [
  "UserPwd",
  "UserPassword",
  "Password",
  "PassWord",
  "UserPass",
  "Pass",
] as const;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function quoteIdentifier(identifier: string) {
  return `[${identifier.replaceAll("]", "]]")}]`;
}

async function resolvePasswordColumn() {
  const rows = await executeQuery<PasswordColumnRow>(
    `
      SELECT COLUMN_NAME as columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'PasswordID'
    `,
    undefined,
    false,
  );
  const columns = new Set(rows.map((row) => row.columnName));

  return (
    passwordColumnCandidates.find((columnName) => columns.has(columnName)) ??
    null
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload;
    const username = normalizeText(body.username);
    const password = normalizeText(body.password);

    if (!username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณากรอก username และ password",
        },
        { status: 400 },
      );
    }

    const passwordColumn = await resolvePasswordColumn();

    if (!passwordColumn) {
      return NextResponse.json(
        {
          success: false,
          error: "ยังไม่พบคอลัมน์รหัสผ่านในตารางพนักงาน",
        },
        { status: 500 },
      );
    }

    const rows = await executeQuery<EmployeeLoginRow>(
      `
        SELECT TOP 1
          Codeperson as codePerson,
          LTRIM(RTRIM(ISNULL(NameUser, ''))) as nameUser,
          LTRIM(RTRIM(ISNULL(UserName, ''))) as username
        FROM dbo.PasswordID
        WHERE LTRIM(RTRIM(ISNULL(UserName, ''))) = @username
          AND LTRIM(RTRIM(ISNULL(${quoteIdentifier(passwordColumn)}, ''))) = @password
      `,
      { username, password },
      false,
    );
    const employee = rows[0];

    if (!employee?.username) {
      return NextResponse.json(
        {
          success: false,
          error: "username หรือ password ไม่ถูกต้อง",
        },
        { status: 401 },
      );
    }

    const session = {
      codePerson:
        employee.codePerson === null || employee.codePerson === undefined
          ? ""
          : String(employee.codePerson),
      nameUser: normalizeText(employee.nameUser) || employee.username,
      username: employee.username,
    };
    const token = await createAuthToken(session);
    const response = NextResponse.json({
      success: true,
      data: session,
    });

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
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "เข้าสู่ระบบไม่สำเร็จ",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
