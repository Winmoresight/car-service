export function calculatePayrollBalance({
  grossWage,
  socialSecurity,
  otherDeduction,
  advanceAmount,
  carryIn,
}: {
  grossWage: number;
  socialSecurity: number;
  otherDeduction: number;
  advanceAmount: number;
  carryIn: number;
}) {
  const netWage = Number(
    (
      grossWage -
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
