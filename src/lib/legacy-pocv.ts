/**
 * MasterPrintCashVate stores newer POCV document dates using Buddhist years
 * (for example 2569). Older databases may contain Gregorian dates, so only
 * shift years that are clearly Buddhist Era values.
 */
export function getPocvDateExpression(alias = "p") {
  return `CASE
    WHEN YEAR(${alias}.DateCash) >= 2400
      THEN DATEADD(year, -543, ${alias}.DateCash)
    ELSE ${alias}.DateCash
  END`;
}
