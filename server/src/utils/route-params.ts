/** Express 5 params may be string | string[] — routes use single segments */
export function segment(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}
