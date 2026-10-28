import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import sql from "mssql";
import { executeQuery, getPool } from "@/lib/db";

const credentialTable = "WebEmployeeCredential";
const initialPassword = "123456";
const deriveKey = promisify(pbkdf2);

interface CredentialRow {
  code: number;
  phone: string;
  passwordSalt: string;
  passwordHash: string;
  mustChangePassword: boolean;
}

interface EmployeePhoneRow {
  code: number;
  name: string | null;
  position: string | null;
  phone: string | null;
}

export interface EmployeePhoneAccount {
  code: number;
  name: string;
  position: string;
  phone: string;
  mustChangePassword: boolean;
}

export class EmployeeCredentialError extends Error {
  constructor(
    message: string,
    readonly code: "invalid_phone" | "duplicate_phone" | "not_found",
  ) {
    super(message);
  }
}

export function normalizeEmployeePhone(value: unknown) {
  if (typeof value !== "string") return null;

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length === 11) {
    digits = `0${digits.slice(2)}`;
  }

  return /^0\d{9}$/.test(digits) ? digits : null;
}

async function hashPassword(
  password: string,
  salt = randomBytes(16).toString("base64url"),
) {
  const hash = (await deriveKey(
    password,
    salt,
    210_000,
    32,
    "sha256",
  )) as Buffer;
  return { salt, hash: hash.toString("base64url") };
}

async function matchesPassword(
  password: string,
  salt: string,
  expectedHash: string,
) {
  const { hash } = await hashPassword(password, salt);
  const actual = Buffer.from(hash, "base64url");
  const expected = Buffer.from(expectedHash, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function ensureEmployeeCredentialTable() {
  await executeQuery(
    `
      BEGIN TRANSACTION;

      BEGIN TRY
        EXEC sys.sp_getapplock
          @Resource = N'${credentialTable}Setup',
          @LockMode = N'Exclusive',
          @LockOwner = N'Transaction';

        IF OBJECT_ID(N'dbo.${credentialTable}', N'U') IS NULL
        BEGIN
          CREATE TABLE dbo.${credentialTable} (
            CodeStaff int NOT NULL,
            PhoneNormalized nvarchar(20) NOT NULL,
            PasswordSalt nvarchar(64) NOT NULL,
            PasswordHash nvarchar(128) NOT NULL,
            MustChangePassword bit NOT NULL
              CONSTRAINT DF_${credentialTable}_MustChange DEFAULT 1,
            CreatedAt datetime2 NOT NULL
              CONSTRAINT DF_${credentialTable}_CreatedAt DEFAULT SYSDATETIME(),
            UpdatedAt datetime2 NOT NULL
              CONSTRAINT DF_${credentialTable}_UpdatedAt DEFAULT SYSDATETIME(),
            CONSTRAINT PK_${credentialTable} PRIMARY KEY (CodeStaff),
            CONSTRAINT UQ_${credentialTable}_Phone UNIQUE (PhoneNormalized)
          )
        END

        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `,
    undefined,
    false,
  );
}

async function getCredential(code: number) {
  const rows = await executeQuery<CredentialRow>(
    `
      SELECT TOP 1
        CodeStaff as code,
        PhoneNormalized as phone,
        PasswordSalt as passwordSalt,
        PasswordHash as passwordHash,
        MustChangePassword as mustChangePassword
      FROM dbo.${credentialTable}
      WHERE CodeStaff = @code
    `,
    { code },
    false,
  );
  return rows[0] ?? null;
}

async function createInitialCredential(code: number, phone: string) {
  const password = await hashPassword(initialPassword);

  try {
    await executeQuery(
      `
        INSERT INTO dbo.${credentialTable} (
          CodeStaff,
          PhoneNormalized,
          PasswordSalt,
          PasswordHash,
          MustChangePassword
        )
        VALUES (@code, @phone, @salt, @hash, 1)
      `,
      { code, phone, salt: password.salt, hash: password.hash },
      false,
    );
  } catch (error) {
    const number = (error as { number?: number }).number;
    if (number !== 2601 && number !== 2627) throw error;
  }

  return getCredential(code);
}

export async function authenticateEmployeePhone(
  phoneValue: string,
  password: string,
): Promise<EmployeePhoneAccount | null> {
  const phone = normalizeEmployeePhone(phoneValue);
  if (!phone) return null;

  const employees = await executeQuery<EmployeePhoneRow>(
    `
      SELECT TOP 2
        Code as code,
        NameSure as name,
        Positions as position,
        Phone as phone
      FROM dbo.NameServiceProduct
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
        LTRIM(RTRIM(ISNULL(Phone, ''))), '-', ''), ' ', ''), '(', ''), ')', ''), '+66', '0') = @phone
      ORDER BY Code
    `,
    { phone },
    false,
  );

  if (employees.length !== 1) return null;

  await ensureEmployeeCredentialTable();
  const employee = employees[0];
  let credential = await getCredential(Number(employee.code));
  credential ??= await createInitialCredential(Number(employee.code), phone);

  if (!credential || credential.phone !== phone) return null;
  if (
    !(await matchesPassword(
      password,
      credential.passwordSalt,
      credential.passwordHash,
    ))
  ) {
    return null;
  }

  return {
    code: Number(employee.code),
    name: employee.name?.trim() || "พนักงาน",
    position: employee.position?.trim() || "พนักงาน",
    phone,
    mustChangePassword: Boolean(credential.mustChangePassword),
  };
}

export async function verifyEmployeePassword(code: number, password: string) {
  await ensureEmployeeCredentialTable();
  const credential = await getCredential(code);
  return credential
    ? matchesPassword(
        password,
        credential.passwordSalt,
        credential.passwordHash,
      )
    : false;
}

export async function changeEmployeePassword(code: number, password: string) {
  await ensureEmployeeCredentialTable();
  const nextPassword = await hashPassword(password);
  await executeQuery(
    `
      UPDATE dbo.${credentialTable}
      SET
        PasswordSalt = @salt,
        PasswordHash = @hash,
        MustChangePassword = 0,
        UpdatedAt = SYSDATETIME()
      WHERE CodeStaff = @code
    `,
    { code, salt: nextPassword.salt, hash: nextPassword.hash },
    false,
  );
}

export async function updateEmployeePhoneAccess(
  code: number,
  phoneValue: string,
  resetPassword = false,
) {
  const phone = normalizeEmployeePhone(phoneValue);
  if (!phone) {
    throw new EmployeeCredentialError(
      "กรุณากรอกเบอร์โทร 10 หลักให้ถูกต้อง",
      "invalid_phone",
    );
  }

  await ensureEmployeeCredentialTable();
  const duplicateRows = await executeQuery<{ code: number }>(
    `
      SELECT TOP 1 Code as code
      FROM dbo.NameServiceProduct
      WHERE Code <> @code
        AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          LTRIM(RTRIM(ISNULL(Phone, ''))), '-', ''), ' ', ''), '(', ''), ')', ''), '+66', '0') = @phone
    `,
    { code, phone },
    false,
  );
  if (duplicateRows[0]) {
    throw new EmployeeCredentialError(
      "เบอร์โทรนี้ถูกใช้กับพนักงานคนอื่นแล้ว",
      "duplicate_phone",
    );
  }

  const employeeRows = await executeQuery<{ code: number }>(
    "SELECT TOP 1 Code as code FROM dbo.NameServiceProduct WHERE Code = @code",
    { code },
    false,
  );
  if (!employeeRows[0]) {
    throw new EmployeeCredentialError("ไม่พบข้อมูลพนักงาน", "not_found");
  }

  const initial = await hashPassword(initialPassword);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    const request = new sql.Request(transaction);
    request.input("code", sql.Int, code);
    request.input("phone", sql.NVarChar(20), phone);
    request.input("salt", sql.NVarChar(64), initial.salt);
    request.input("hash", sql.NVarChar(128), initial.hash);
    request.input("resetPassword", sql.Bit, resetPassword);
    await request.query(`
      UPDATE dbo.NameServiceProduct
      SET Phone = @phone
      WHERE Code = @code;

      IF EXISTS (SELECT 1 FROM dbo.${credentialTable} WHERE CodeStaff = @code)
      BEGIN
        UPDATE dbo.${credentialTable}
        SET
          PhoneNormalized = @phone,
          PasswordSalt = CASE WHEN @resetPassword = 1 THEN @salt ELSE PasswordSalt END,
          PasswordHash = CASE WHEN @resetPassword = 1 THEN @hash ELSE PasswordHash END,
          MustChangePassword = CASE WHEN @resetPassword = 1 THEN 1 ELSE MustChangePassword END,
          UpdatedAt = SYSDATETIME()
        WHERE CodeStaff = @code
      END
      ELSE
      BEGIN
        INSERT INTO dbo.${credentialTable} (
          CodeStaff,
          PhoneNormalized,
          PasswordSalt,
          PasswordHash,
          MustChangePassword
        )
        VALUES (@code, @phone, @salt, @hash, 1)
      END
    `);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    const number = (error as { number?: number }).number;
    if (number === 2601 || number === 2627) {
      throw new EmployeeCredentialError(
        "เบอร์โทรนี้ถูกใช้กับพนักงานคนอื่นแล้ว",
        "duplicate_phone",
      );
    }
    throw error;
  }

  return phone;
}

export async function resetEmployeePassword(code: number) {
  const rows = await executeQuery<{ phone: string | null }>(
    "SELECT TOP 1 Phone as phone FROM dbo.NameServiceProduct WHERE Code = @code",
    { code },
    false,
  );
  const phone = rows[0]?.phone;
  if (!phone) {
    throw new EmployeeCredentialError(
      "กรุณาเพิ่มเบอร์โทรให้พนักงานก่อนรีเซ็ตรหัสผ่าน",
      "invalid_phone",
    );
  }
  return updateEmployeePhoneAccess(code, phone, true);
}

export { initialPassword as EMPLOYEE_INITIAL_PASSWORD };
