// Preserve the date component of both date-only input and legacy ISO timestamps.
// DOB is not an instant in the viewer's timezone.
export function formatBirthDate(value: string, locale?: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return date.toLocaleDateString(locale, { timeZone: "UTC" });
}

export function isBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
}
