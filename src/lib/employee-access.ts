import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, readAuthToken } from "@/lib/auth-session";
import { executeQuery } from "@/lib/db";

const managementLevel = "ผู้บริหารงาน";
const accountLinkTable = "WebEmployeeAccountLink";

interface EmployeeAccessRow {
  level: string | null;
  employeeCode: number | null;
}

export interface EmployeeAccess {
  authenticated: boolean;
  canManage: boolean;
  employeeCode: number | null;
  level: string;
  mustChangePassword: boolean;
}

async function ensureEmployeeAccountLinkTable() {
  await executeQuery(
    `
      BEGIN TRANSACTION;

      BEGIN TRY
        EXEC sys.sp_getapplock
          @Resource = N'${accountLinkTable}Setup',
          @LockMode = N'Exclusive',
          @LockOwner = N'Transaction';

        IF OBJECT_ID(N'dbo.${accountLinkTable}', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.${accountLinkTable} (
            Username nvarchar(100) NOT NULL,
            CodeStaff int NOT NULL,
            LinkedBy nvarchar(100) NULL,
            CreatedAt datetime NOT NULL
              CONSTRAINT DF_${accountLinkTable}_CreatedAt DEFAULT GETDATE(),
            UpdatedAt datetime NOT NULL
              CONSTRAINT DF_${accountLinkTable}_UpdatedAt DEFAULT GETDATE(),
            CONSTRAINT PK_${accountLinkTable} PRIMARY KEY (Username),
            CONSTRAINT UQ_${accountLinkTable}_CodeStaff UNIQUE (CodeStaff)
          )
        END

        INSERT INTO dbo.${accountLinkTable} (Username, CodeStaff, LinkedBy)
        SELECT
          LTRIM(RTRIM(account.UserName)),
          employee.Code,
          N'จับคู่จากชื่อเริ่มต้น'
        FROM dbo.PasswordID account
        CROSS APPLY (
          SELECT TOP 1 staff.Code
          FROM dbo.NameServiceProduct staff
          WHERE LTRIM(RTRIM(ISNULL(staff.NameSure, ''))) =
            LTRIM(RTRIM(ISNULL(account.NameUser, '')))
          ORDER BY staff.Code
        ) employee
        WHERE LTRIM(RTRIM(ISNULL(account.Leval, ''))) <> @managementLevel
          AND LTRIM(RTRIM(ISNULL(account.UserName, ''))) <> ''
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.${accountLinkTable} existingLink
            WHERE existingLink.Username = LTRIM(RTRIM(account.UserName))
              OR existingLink.CodeStaff = employee.Code
          );

        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `,
    { managementLevel },
    false,
  );
}

export async function getEmployeeAccessByUsername(
  username: string,
): Promise<Omit<EmployeeAccess, "authenticated">> {
  await ensureEmployeeAccountLinkTable();

  const rows = await executeQuery<EmployeeAccessRow>(
    `
      SELECT TOP 1
        LTRIM(RTRIM(ISNULL(account.Leval, ''))) as level,
        employee.Code as employeeCode
      FROM dbo.PasswordID account
      LEFT JOIN dbo.${accountLinkTable} accountLink
        ON accountLink.Username = LTRIM(RTRIM(account.UserName))
      LEFT JOIN dbo.NameServiceProduct employee
        ON employee.Code = accountLink.CodeStaff
      WHERE LTRIM(RTRIM(ISNULL(account.UserName, ''))) = @username
    `,
    { username },
    false,
  );
  const row = rows[0];
  const level = row?.level?.trim() || "";

  return {
    canManage: level === managementLevel,
    employeeCode:
      row?.employeeCode === null || row?.employeeCode === undefined
        ? null
        : Number(row.employeeCode),
    level,
    mustChangePassword: false,
  };
}

export async function getEmployeeAccess(
  request: NextRequest,
): Promise<EmployeeAccess> {
  const session = await readAuthToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );

  if (!session) {
    return {
      authenticated: false,
      canManage: false,
      employeeCode: null,
      level: "",
      mustChangePassword: false,
    };
  }

  return {
    authenticated: true,
    canManage: session.canManage,
    employeeCode: session.employeeCode,
    level: session.level,
    mustChangePassword: session.mustChangePassword,
  };
}
