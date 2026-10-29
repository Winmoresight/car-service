interface PaymentTotals {
  cash: number;
  transfer: number;
}

export function addPaymentTotals(
  current: PaymentTotals,
  additional: PaymentTotals,
): PaymentTotals {
  return {
    cash: current.cash + additional.cash,
    transfer: current.transfer + additional.transfer,
  };
}
