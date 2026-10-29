export interface SupplierStockLine {
  barcode: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export function getSupplierStockAdjustments(
  existingLines: SupplierStockLine[],
  updatedLines: SupplierStockLine[],
) {
  const totals = new Map<
    string,
    {
      existingQuantity: number;
      updatedQuantity: number;
      name: string;
      unit: string;
      unitPrice: number;
      existed: boolean;
    }
  >();

  for (const line of existingLines) {
    const barcode = line.barcode.trim();

    if (!barcode) continue;

    const current = totals.get(barcode);
    totals.set(barcode, {
      existingQuantity: (current?.existingQuantity ?? 0) + line.quantity,
      updatedQuantity: current?.updatedQuantity ?? 0,
      name: current?.name || line.name,
      unit: current?.unit || line.unit,
      unitPrice:
        current?.unitPrice && current.unitPrice > 0
          ? current.unitPrice
          : line.unitPrice,
      existed: true,
    });
  }

  for (const line of updatedLines) {
    const barcode = line.barcode.trim();

    if (!barcode) continue;

    const current = totals.get(barcode);
    totals.set(barcode, {
      existingQuantity: current?.existingQuantity ?? 0,
      updatedQuantity: (current?.updatedQuantity ?? 0) + line.quantity,
      name: line.name || current?.name || "",
      unit: line.unit || current?.unit || "",
      unitPrice:
        line.unitPrice > 0 ? line.unitPrice : (current?.unitPrice ?? 0),
      existed: current?.existed ?? false,
    });
  }

  return Array.from(totals, ([barcode, total]) => ({
    barcode,
    name: total.name,
    unit: total.unit,
    quantity: total.updatedQuantity,
    unitPrice: total.unitPrice,
    quantityDelta: Number(
      (total.updatedQuantity - total.existingQuantity).toFixed(2),
    ),
    requireProduct: !total.existed && total.updatedQuantity > 0,
  }));
}
