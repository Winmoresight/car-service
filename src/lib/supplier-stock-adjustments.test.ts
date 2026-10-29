import assert from "node:assert/strict";
import test from "node:test";
import { getSupplierStockAdjustments } from "./supplier-stock-adjustments";

test("does not change stock when one product is split into paid and free lines", () => {
  assert.deepEqual(
    getSupplierStockAdjustments(
      [
        {
          barcode: "8850777130217",
          name: "น้ำยาล้างหัวฉีด",
          unit: "กระป๋อง",
          quantity: 16,
          unitPrice: 550,
        },
      ],
      [
        {
          barcode: "8850777130217",
          name: "น้ำยาล้างหัวฉีด",
          unit: "กระป๋อง",
          quantity: 15,
          unitPrice: 550,
        },
        {
          barcode: "8850777130217",
          name: "น้ำยาล้างหัวฉีด",
          unit: "กระป๋อง",
          quantity: 1,
          unitPrice: 0,
        },
      ],
    ),
    [
      {
        barcode: "8850777130217",
        name: "น้ำยาล้างหัวฉีด",
        unit: "กระป๋อง",
        quantity: 16,
        unitPrice: 550,
        quantityDelta: 0,
        requireProduct: false,
      },
    ],
  );
});

test("adjusts each barcode once when a product is replaced", () => {
  assert.deepEqual(
    getSupplierStockAdjustments(
      [
        {
          barcode: "old",
          name: "สินค้าเดิม",
          unit: "ชิ้น",
          quantity: 2,
          unitPrice: 100,
        },
      ],
      [
        {
          barcode: "new",
          name: "สินค้าใหม่",
          unit: "ชิ้น",
          quantity: 2,
          unitPrice: 120,
        },
      ],
    ),
    [
      {
        barcode: "old",
        name: "สินค้าเดิม",
        unit: "ชิ้น",
        quantity: 0,
        unitPrice: 100,
        quantityDelta: -2,
        requireProduct: false,
      },
      {
        barcode: "new",
        name: "สินค้าใหม่",
        unit: "ชิ้น",
        quantity: 2,
        unitPrice: 120,
        quantityDelta: 2,
        requireProduct: true,
      },
    ],
  );
});
