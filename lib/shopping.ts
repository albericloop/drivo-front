export type DisplayItem = {
  intitule: string;
  code: string;
  quantity?: number;
  unit?: string;
};

function pickString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function fromCandidate(candidate: unknown, fallbackName: string): DisplayItem | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const intitule =
    pickString(record, ["intitule", "product", "name", "product_name"]) ||
    fallbackName;
  const code = digitsOnly(
    pickString(record, ["gtin", "ean", "code", "barcode", "numero"]),
  );

  if (!intitule && !code) {
    return null;
  }

  return { intitule, code };
}

export function normalizeItems(payload: unknown): DisplayItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as Record<string, unknown>;
  const rawItems = Array.isArray(root.items) ? root.items : [];
  const items: DisplayItem[] = [];

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const record = raw as Record<string, unknown>;
    const productName = pickString(record, [
      "intitule",
      "product",
      "name",
      "product_name",
    ]);

    if (Array.isArray(record.candidates) && record.candidates.length > 0) {
      const matched = fromCandidate(record.candidates[0], productName);
      if (matched) {
        items.push({
          ...matched,
          quantity:
            typeof record.quantity === "number" ? record.quantity : undefined,
          unit: pickString(record, ["unit"]) || undefined,
        });
        continue;
      }
    }

    const code = digitsOnly(
      pickString(record, ["gtin", "ean", "code", "barcode", "numero"]),
    );

    if (!productName && !code) {
      continue;
    }

    items.push({
      intitule: productName,
      code,
      quantity: typeof record.quantity === "number" ? record.quantity : undefined,
      unit: pickString(record, ["unit"]) || undefined,
    });
  }

  return items;
}

export function parseShoppingList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s*•\-]+/, "").trim())
    .filter(Boolean);
}
