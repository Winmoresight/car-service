export function calculatePayrollBalance({
  grossWage,
  extraIncome,
  socialSecurity,
  otherDeduction,
  advanceAmount,
  carryIn,
}: {
  grossWage: number;
  extraIncome: number;
  socialSecurity: number;
  otherDeduction: number;
  advanceAmount: number;
  carryIn: number;
}) {
  const netWage = Number(
    (
      grossWage +
      extraIncome -
      socialSecurity -
      otherDeduction -
      advanceAmount -
      carryIn
    ).toFixed(2),
  );

  return {
    netWage,
    paidAmount: Math.max(netWage, 0),
    carryOut: Math.max(-netWage, 0),
  };
}

export function shouldDeductSocialSecurity({
  isFirstPayPeriod,
  deductedInFirstPayPeriod,
}: {
  isFirstPayPeriod: boolean;
  deductedInFirstPayPeriod: boolean;
}) {
  return isFirstPayPeriod || !deductedInFirstPayPeriod;
}

export function getAbsenceDateLabels(
  records: ReadonlyArray<{ date: string; status: string }>,
) {
  return records
    .filter(
      (record) => record.status === "absent" || record.status === "half_day",
    )
    .flatMap((record) => {
      const day = Number(record.date.slice(8, 10));

      if (!Number.isFinite(day)) {
        return [];
      }

      return [`${day}${record.status === "half_day" ? " (ครึ่งวัน)" : ""}`];
    });
}
