import assert from "node:assert/strict";
import test from "node:test";
import { buildReceivablePaymentCte } from "./receivable-payment-source";

test("includes the separate legacy payment time in receivable rows", () => {
  const sql = buildReceivablePaymentCte(
    {
      detailPaymentCustomerColumns: new Set([
        "NumberPrintPost",
        "FormNumberPrint",
        "DatePay",
        "TotalPrice",
        "TypePayment",
      ]),
      masterPaymentCustomerColumns: new Set([
        "NumberPrint",
        "DatePay",
        "Times",
        "PayCash",
        "PayTransfer",
      ]),
      webReceivablePaymentColumns: new Set(),
    },
    () => "1 = 1",
  );

  assert.match(sql, /ISNULL\(p\.\[Times\], ''\) as occurred_time/);
});
