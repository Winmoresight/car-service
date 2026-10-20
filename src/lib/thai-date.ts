const THAI_BUDDHIST_LOCALE = "th-TH-u-ca-buddhist";

export function formatThaiDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(THAI_BUDDHIST_LOCALE, options).format(date);
}

export function formatThaiShortDate(date: Date) {
  return formatThaiDate(date, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatThaiLongDate(date: Date) {
  return formatThaiDate(date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
