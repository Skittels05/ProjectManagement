export function formatLocaleDateTime(
  value: string | Date | null | undefined,
  locale: string,
): string {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const loc = locale === "ru" ? "ru-RU" : "en-US";
  return d.toLocaleString(loc);
}
