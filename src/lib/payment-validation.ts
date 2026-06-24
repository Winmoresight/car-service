const moneyFormatter = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0);
}

export function getOverpaymentMessage(params: {
  paidTotal: number;
  totalPrice: number;
}) {
  const excessAmount = Number(
    Math.max(params.paidTotal - params.totalPrice, 0).toFixed(2),
  );

  if (excessAmount <= 0) {
    return null;
  }

  return `คุณกรอกยอดแบ่งจ่ายเกินยอดรวมทั้งหมดไป ${formatMoney(excessAmount)} บาท`;
}
