export type CatalogHit = {
  name: string;
  ean: string;
  quantity: string;
  units_to_buy: number;
};

export type MatchResult = {
  product: string;
  quantity: number | null;
  unit: string | null;
  products: CatalogHit[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string") {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function normalizeHit(candidate: unknown): CatalogHit | null {
  const record = asRecord(candidate);
  if (!record) {
    return null;
  }

  const name = pickString(record, ["name", "intitule", "product", "product_name"]);
  const ean = pickString(record, ["ean", "gtin", "code", "barcode", "numero"]);
  const quantity = pickString(record, ["quantity", "pack", "packaging"]);
  const units = pickNumber(record, ["units_to_buy", "unitsToBuy"]) ?? 1;

  if (!name && !ean) {
    return null;
  }

  return {
    name,
    ean,
    quantity,
    units_to_buy: units >= 1 ? units : 1,
  };
}

function normalizeMatch(raw: unknown): MatchResult | null {
  const record = asRecord(raw);
  if (!record) {
    return null;
  }

  const product = pickString(record, ["product", "intitule", "name", "product_name"]);
  const quantity = pickNumber(record, ["quantity"]);
  const unitRaw = pickString(record, ["unit"]);
  const unit = unitRaw || null;

  const hitsSource = Array.isArray(record.products)
    ? record.products
    : Array.isArray(record.candidates)
      ? record.candidates
      : [];

  const products = hitsSource
    .map(normalizeHit)
    .filter((hit): hit is CatalogHit => hit !== null);

  if (!product && products.length === 0) {
    return null;
  }

  return {
    product,
    quantity,
    unit,
    products,
  };
}

export function normalizeResults(payload: unknown): MatchResult[] {
  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const source = Array.isArray(root.results)
    ? root.results
    : Array.isArray(root.items)
      ? root.items
      : [];

  return source
    .map(normalizeMatch)
    .filter((item): item is MatchResult => item !== null);
}

export function parseShoppingList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s*•\-]+/, "").trim())
    .filter(Boolean);
}

export function formatNeed(quantity: number | null, unit: string | null): string {
  if (quantity === null && !unit) {
    return "";
  }
  if (quantity === null) {
    return unit ?? "";
  }
  const amount = Number.isInteger(quantity) ? String(quantity) : String(quantity);
  return unit ? `${amount} ${unit}` : amount;
}
