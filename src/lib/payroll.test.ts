import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePayrollBalance,
  getAbsenceDateLabels,
  shouldDeductSocialSecurity,
} from "./payroll";

test("deducts current charges and carries unpaid debt forward", () => {
  assert.deepEqual(
    calculatePayrollBalance({
      grossWage: 2_000,
      extraIncome: 0,
      socialSecurity: 400,
      otherDeduction: 200,
      advanceAmount: 0,
      carryIn: 2_000,
    }),
    { netWage: -600, paidAmount: 0, carryOut: 600 },
  );
});

test("pays the positive remainder without creating new debt", () => {
  assert.deepEqual(
    calculatePayrollBalance({
      grossWage: 4_000,
      extraIncome: 0,
      socialSecurity: 400,
      otherDeduction: 200,
      advanceAmount: 500,
      carryIn: 1_000,
    }),
    { netWage: 1_900, paidAmount: 1_900, carryOut: 0 },
  );
});

test("adds extra income before deducting charges", () => {
  assert.deepEqual(
    calculatePayrollBalance({
      grossWage: 2_000,
      extraIncome: 500,
      socialSecurity: 400,
      otherDeduction: 100,
      advanceAmount: 0,
      carryIn: 0,
    }),
    { netWage: 2_000, paidAmount: 2_000, carryOut: 0 },
  );
});

test("deducts social security in the current period when the first period missed it", () => {
  assert.equal(
    shouldDeductSocialSecurity({
      isFirstPayPeriod: false,
      deductedInFirstPayPeriod: false,
    }),
    true,
  );
});

test("does not deduct social security twice in the same month", () => {
  assert.equal(
    shouldDeductSocialSecurity({
      isFirstPayPeriod: false,
      deductedInFirstPayPeriod: true,
    }),
    false,
  );
});

test("includes full-day and half-day absences in report date labels", () => {
  assert.deepEqual(
    getAbsenceDateLabels([
      { date: "2026-10-17", status: "half_day" },
      { date: "2026-10-21", status: "full_day" },
      { date: "2026-10-30", status: "absent" },
    ]),
    ["17 (ครึ่งวัน)", "30"],
  );
});
