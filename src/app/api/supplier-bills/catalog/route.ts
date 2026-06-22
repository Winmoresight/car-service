/**
 * Supplier bill catalog API
 * ดึงข้อมูลคู่ค้า ประเภทคู่ค้า หน่วย และสินค้าเดิมสำหรับฟอร์มบิลคู่ค้า
 */

import type { NextRequest } from "next/server";
import { handleApiError, successResponse, withTimeout } from "@/lib/api-utils";
import { executeQuery } from "@/lib/db";
import type {
  SupplierBillsCatalogPayload,
  SupplierCatalogOption,
  SupplierCatalogProduct,
  SupplierCatalogSupplier,
} from "@/types/api";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Number(number.toFixed(2));
}

function uniqueOptionsByName(options: SupplierCatalogOption[]) {
  const seenNames = new Set<string>();
  const uniqueOptions: SupplierCatalogOption[] = [];

  for (const option of options) {
    if (seenNames.has(option.name)) {
      continue;
    }

    seenNames.add(option.name);
    uniqueOptions.push(option);
  }

  return uniqueOptions;
}

export async function GET(request: NextRequest) {
  try {
    const data = await withTimeout(
      async (): Promise<SupplierBillsCatalogPayload> => {
        const searchParams = request.nextUrl.searchParams;
        const q = normalizeText(searchParams.get("q"));
        const supplierLimit = 100;
        const productLimit = q ? 50 : 80;

        const [suppliers, creditorTypes, units, products] = await Promise.all([
          executeQuery<{
            code: string | null;
            name: string | null;
            address: string | null;
            phone: string | null;
            type: string | null;
            taxId: string | null;
            detail: string | null;
          }>(
            `
            SELECT TOP (@supplierLimit)
              ISNULL(CodeCompany, '') as code,
              ISNULL(NameCompany, '') as name,
              ISNULL(AddressCompany, '') as address,
              ISNULL(PhoneCompany, '') as phone,
              ISNULL(CaseCreditor, '') as type,
              ISNULL(TaxCompany, '') as taxId,
              ISNULL(Detail, '') as detail
            FROM dbo.Creditor
            WHERE
              @q = N''
              OR CodeCompany LIKE N'%' + @q + N'%'
              OR NameCompany LIKE N'%' + @q + N'%'
              OR PhoneCompany LIKE N'%' + @q + N'%'
              OR CaseCreditor LIKE N'%' + @q + N'%'
            ORDER BY Code
          `,
            { q, supplierLimit },
            false,
          ),
          executeQuery<{
            id: number | null;
            name: string | null;
          }>(
            `
            SELECT
              Code as id,
              ISNULL(CaseCreditor, '') as name
            FROM dbo.CaseCreditor
            ORDER BY Code
          `,
            undefined,
            false,
          ),
          executeQuery<{
            id: number | null;
            name: string | null;
          }>(
            `
            SELECT
              Code as id,
              ISNULL(MeterProduct, '') as name
            FROM dbo.MeterProduct
            ORDER BY Code
          `,
            undefined,
            false,
          ),
          executeQuery<{
            barcode: string | null;
            name: string | null;
            unit: string | null;
            unitPrice: number | string | null;
            cost: number | string | null;
            caseProduct: number | null;
          }>(
            `
            SELECT TOP (@productLimit)
              ISNULL(d.BarCode, '') as barcode,
              ISNULL(m.NameProduct, '') as name,
              ISNULL(d.MeterProduct, '') as unit,
              ISNULL(d.SalePrice, 0) as unitPrice,
              ISNULL(d.CostPrice, 0) as cost,
              ISNULL(m.CaseProduct, 25) as caseProduct
            FROM dbo.MasterProductDetail d
            INNER JOIN dbo.MasterProduct m ON m.CodeProduct = d.CodeProduct
            WHERE
              @q = N''
              OR d.BarCode LIKE N'%' + @q + N'%'
              OR m.NameProduct LIKE N'%' + @q + N'%'
            ORDER BY m.NameProduct
          `,
            { q, productLimit },
            false,
          ),
        ]);

        return {
          suppliers: suppliers.map<SupplierCatalogSupplier>((supplier) => ({
            code: normalizeText(supplier.code),
            name: normalizeText(supplier.name),
            address: normalizeText(supplier.address),
            phone: normalizeText(supplier.phone),
            type: normalizeText(supplier.type),
            taxId: normalizeText(supplier.taxId),
            detail: normalizeText(supplier.detail),
          })),
          creditorTypes: creditorTypes
            .map<SupplierCatalogOption>((type) => ({
              id: Number(type.id) || 0,
              name: normalizeText(type.name),
            }))
            .filter((type) => type.id > 0 && type.name),
          units: uniqueOptionsByName(
            units
              .map<SupplierCatalogOption>((unit) => ({
                id: Number(unit.id) || 0,
                name: normalizeText(unit.name),
              }))
              .filter((unit) => unit.id > 0 && unit.name),
          ),
          products: products
            .map<SupplierCatalogProduct>((product) => ({
              barcode: normalizeText(product.barcode),
              name: normalizeText(product.name),
              unit: normalizeText(product.unit),
              unitPrice: normalizeMoney(product.unitPrice),
              cost: normalizeMoney(product.cost),
              caseProduct: Number(product.caseProduct) || 25,
            }))
            .filter((product) => product.name),
        };
      },
      60000,
    );

    return successResponse(data);
  } catch (error) {
    return handleApiError(error, "Supplier bill catalog API error");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
