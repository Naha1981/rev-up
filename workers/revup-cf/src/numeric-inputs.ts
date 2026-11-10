// Match PostgreSQL numeric(10,2) and signed integer storage before any write.
export function boundedMoney(raw: unknown): number | null {
  if (raw === undefined || String(raw).trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && Math.round(value * 100) <= 9999999999 ? value : null;
}
export function boundedWhole(raw: unknown, min: number, fallback: number, max = 2147483647): number | null {
  const value = raw === undefined || String(raw).trim() === "" ? fallback : Number(raw);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}
