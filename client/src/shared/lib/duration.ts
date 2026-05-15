export function formatDurationMinutes(total: number): string {
  if (total < 1) return "0m";
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDurationInput(hoursStr: string, minutesStr: string): number | null {
  const h = hoursStr.trim() === "" ? 0 : Number.parseInt(hoursStr, 10);
  const m = minutesStr.trim() === "" ? 0 : Number.parseInt(minutesStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || m < 0 || m > 59) {
    return null;
  }
  const total = h * 60 + m;
  if (total < 1 || total > 24 * 60) return null;
  return total;
}

export function splitDurationMinutes(total: number): { hours: string; minutes: string } {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return { hours: h > 0 ? String(h) : "", minutes: m > 0 || h === 0 ? String(m) : "" };
}
