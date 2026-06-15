import { executeQuery } from "@/lib/db";

export async function receivablePaymentLogTableExists() {
  const [result] = await executeQuery<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'WebReceivablePayments'
    `,
    undefined,
    false,
  );

  return (result?.count || 0) > 0;
}

export async function ensureReceivablePaymentLogTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.WebReceivablePayments', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.WebReceivablePayments (
          ID int IDENTITY(1,1) NOT NULL PRIMARY KEY,
          PaidAt datetime NOT NULL DEFAULT GETDATE(),
          NumberPrintSalePost nvarchar(30) NOT NULL,
          CodeCustomer nvarchar(30) NULL,
          NameCustomer nvarchar(200) NULL,
          NameCar nvarchar(100) NULL,
          Province nvarchar(100) NULL,
          PaidAmount money NOT NULL DEFAULT 0,
          PaymentMethod nvarchar(20) NOT NULL,
          NameBank nvarchar(250) NULL,
          CreatedBy nvarchar(100) NULL,
          CreatedAt datetime NOT NULL DEFAULT GETDATE()
        );

        CREATE INDEX IX_WebReceivablePayments_PaidAt
        ON dbo.WebReceivablePayments (PaidAt DESC);

        CREATE INDEX IX_WebReceivablePayments_NumberPrintSalePost
        ON dbo.WebReceivablePayments (NumberPrintSalePost);
      END
    `,
    undefined,
    false,
  );
}
