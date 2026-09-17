import { executeQuery } from "@/lib/db";

export const categoryProfitMarginTable = "WebCategoryProfitMargins";

export async function ensureCategoryProfitMarginTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${categoryProfitMarginTable}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${categoryProfitMarginTable} (
          CategoryCode int NOT NULL,
          ProfitPercent decimal(5, 2) NOT NULL,
          UpdatedAt datetime NOT NULL
            CONSTRAINT DF_WebCategoryProfitMargins_UpdatedAt DEFAULT (GETDATE()),
          CONSTRAINT PK_WebCategoryProfitMargins PRIMARY KEY (CategoryCode),
          CONSTRAINT CK_WebCategoryProfitMargins_ProfitPercent
            CHECK (ProfitPercent >= 0 AND ProfitPercent <= 100)
        );
      END
    `,
    undefined,
    false,
  );
}
