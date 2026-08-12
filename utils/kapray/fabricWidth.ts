export type FabricWidthSpec = {
  value: number;
  unit: "in";
};

function parsePositiveNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  const text = String(value ?? "").trim();
  if (!text) return 0;

  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return 0;

  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatNumber(value: number) {
  return String(Math.round(value * 100) / 100)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

export function normalizeFabricWidth(value: unknown): FabricWidthSpec | null {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as any).value ??
        (value as any).width ??
        (value as any).inches ??
        (value as any).fabric_width_in
      : value;

  const n = parsePositiveNumber(raw);
  if (n <= 0) return null;

  return {
    value: Math.round(n * 100) / 100,
    unit: "in",
  };
}

export function normalizeFabricWidthFromSpec(spec: unknown) {
  const s = spec && typeof spec === "object" ? (spec as any) : {};
  return normalizeFabricWidth(
    s.fabric_width ??
      s.fabric_width_in ??
      s.fabricWidth ??
      s.fabric_panna ??
      s.panna,
  );
}

export function formatFabricWidth(value: unknown) {
  const width = normalizeFabricWidth(value);
  return width ? `${formatNumber(width.value)} in` : "";
}

export function formatFabricWidthFromSpec(spec: unknown) {
  const width = normalizeFabricWidthFromSpec(spec);
  return width ? `${formatNumber(width.value)} in` : "";
}
