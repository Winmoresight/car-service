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
