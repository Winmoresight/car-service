import { executeQuery } from "@/lib/db";

export const productAnalyticsPolicyTable = "WebProductAnalyticsPolicies";

export async function ensureProductAnalyticsPolicyTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${productAnalyticsPolicyTable}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${productAnalyticsPolicyTable} (
          ProductCode nvarchar(30) NOT NULL,
          IncludeInBestSeller bit NOT NULL
            CONSTRAINT DF_WebProductAnalyticsPolicies_IncludeInBestSeller DEFAULT (1),
          IncludeInProfitAnalysis bit NOT NULL
            CONSTRAINT DF_WebProductAnalyticsPolicies_IncludeInProfitAnalysis DEFAULT (1),
          ExclusionReason nvarchar(250) NULL,
          UpdatedAt datetime NOT NULL
            CONSTRAINT DF_WebProductAnalyticsPolicies_UpdatedAt DEFAULT (GETDATE()),
          CONSTRAINT PK_WebProductAnalyticsPolicies PRIMARY KEY (ProductCode)
        );
      END
    `,
    undefined,
    false,
  );
}

export interface ProductAnalyticsSqlConfig {
  hasBarcodeAliases: boolean;
  joins: string;
  resolvedBarcodeExpression: string;
  includeInBestSellerExpression: string;
  includeInProfitAnalysisExpression: string;
}

export async function getProductAnalyticsSqlConfig(
  saleAlias: string,
  namespace = "analytics",
): Promise<ProductAnalyticsSqlConfig> {
  await ensureProductAnalyticsPolicyTable();

  const [aliasTableState] = await executeQuery<{ total: number }>(
    `
      SELECT CASE
        WHEN OBJECT_ID(N'dbo.WebProductBarcodeAliases', N'U') IS NULL
          THEN 0
        ELSE 1
      END as total
    `,
    undefined,
    false,
  );
  const hasBarcodeAliases = Number(aliasTableState?.total || 0) > 0;
  const barcodeAlias = `${namespace}BarcodeAlias`;
  const productMapping = `${namespace}Product`;
  const policyAlias = `${namespace}Policy`;
  const aliasJoin = hasBarcodeAliases
    ? `LEFT JOIN dbo.WebProductBarcodeAliases ${barcodeAlias}
        ON ${barcodeAlias}.AliasBarcode = ${saleAlias}.BarCode`
    : "";
  const resolvedBarcodeExpression = hasBarcodeAliases
    ? `COALESCE(NULLIF(${barcodeAlias}.CanonicalBarcode, ''), NULLIF(${saleAlias}.BarCode, ''), '')`
    : `ISNULL(NULLIF(${saleAlias}.BarCode, ''), '')`;

  return {
    hasBarcodeAliases,
    resolvedBarcodeExpression,
    joins: `
      ${aliasJoin}
      OUTER APPLY (
        SELECT TOP 1 detail.CodeProduct
        FROM dbo.MasterProductDetail detail
        WHERE detail.BarCode = ${resolvedBarcodeExpression}
        ORDER BY detail.CodeProduct
      ) ${productMapping}
      LEFT JOIN dbo.${productAnalyticsPolicyTable} ${policyAlias}
        ON ${policyAlias}.ProductCode = ${productMapping}.CodeProduct
    `,
    includeInBestSellerExpression: `ISNULL(${policyAlias}.IncludeInBestSeller, 1)`,
    includeInProfitAnalysisExpression: `ISNULL(${policyAlias}.IncludeInProfitAnalysis, 1)`,
  };
}
