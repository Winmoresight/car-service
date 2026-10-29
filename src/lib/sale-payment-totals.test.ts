import assert from "node:assert/strict";
import test from "node:test";
import { addPaymentTotals } from "./sale-payment-totals";

test("includes a later receivable transfer in the sale payment detail", () => {
  assert.deepEqual(
    addPaymentTotals({ cash: 0, transfer: 0 }, { cash: 0, transfer: 1490 }),
    { cash: 0, transfer: 1490 },
  );
});

test("preserves payments collected when the sale was created", () => {
  assert.deepEqual(
    addPaymentTotals({ cash: 500, transfer: 0 }, { cash: 0, transfer: 990 }),
    { cash: 500, transfer: 990 },
  );
});
