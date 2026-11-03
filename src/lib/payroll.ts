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

export function summarizePayrollBalances(
  rows: ReadonlyArray<{ netWage: number }>,
) {
  return rows.reduce(
    (totals, row) => ({
      paidAmount: totals.paidAmount + Math.max(row.netWage, 0),
      carryOut: totals.carryOut + Math.max(-row.netWage, 0),
    }),
    { paidAmount: 0, carryOut: 0 },
  );
}

export function isPayrollSettlementPeriod(startDate: string, endDate: string) {
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  const lastDay = new Date(startYear, startMonth, 0).getDate();
  const scheduledEndDay = startDay === 1 ? 15 : lastDay;

  return (
    startYear === endYear &&
    startMonth === endMonth &&
    (startDay === 1 || startDay === 16) &&
    endDay >= startDay &&
    endDay <= scheduledEndDay
  );
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
