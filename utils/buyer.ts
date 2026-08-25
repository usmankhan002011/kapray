export function firstStringParam(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim() || null;
  }
  return null;
}

export function toOptionalNumber(value: unknown): number | null {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function decodeNumberParam(value: unknown): number | null {
  const raw = firstStringParam(value);
  if (!raw) return null;

  try {
    return toOptionalNumber(decodeURIComponent(raw));
  } catch {
    return toOptionalNumber(raw);
  }
}

export function displayText(value: unknown): string {
  return String(value ?? "").trim() || "—";
}

export function joinOrDash(items: unknown): string {
  return Array.isArray(items) && items.length ? items.join(", ") : "—";
}

export function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(String)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
