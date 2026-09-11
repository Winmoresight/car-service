import { executeQuery } from "@/lib/db";

export const billDepositPaymentTableName = "WebBillDepositPayments";

export async function ensureBillDepositPaymentTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${billDepositPaymentTableName}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${billDepositPaymentTableName} (
          BillNo nvarchar(30) NOT NULL,
          Amount money NOT NULL,
          PaymentMethod nvarchar(20) NOT NULL,
          BankName nvarchar(250) NULL,
          CreatedBy nvarchar(250) NULL,
          CreatedAt datetime NOT NULL
            CONSTRAINT DF_${billDepositPaymentTableName}_CreatedAt DEFAULT GETDATE(),
          CONSTRAINT PK_${billDepositPaymentTableName}
            PRIMARY KEY (BillNo)
        )
      END
    `,
    undefined,
    false,
  );
}
