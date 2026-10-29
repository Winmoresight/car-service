const bangkokOffsetHours = 7;

export function combineLegacyBangkokDateTime(
  dateValue: Date | string | null,
  timeValue: unknown,
) {
  if (!dateValue) return null;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return null;

  const match =
    typeof timeValue === "string"
      ? /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue.trim())
      : null;

  if (!match) return date.toISOString();

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);

  if (hour > 23 || minute > 59 || second > 59) return date.toISOString();

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hour - bangkokOffsetHours,
      minute,
      second,
    ),
  ).toISOString();
}
