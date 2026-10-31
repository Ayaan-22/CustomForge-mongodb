/** URL filters are independent of pagination, sorting, search and deals mode. */
export const CATALOG_FILTER_KEYS = [
  "category",
  "brand",
  "brands",
  "specs",
  "availability",
  "minPrice",
  "maxPrice",
  "minRating",
  "maxRating",
  "features",
  "isFeatured",
] as const;

export type CatalogFilterDraft = {
  category: string;
  brand: string;
  brands?: string[];
  specs?: Record<string, string[]>;
  availability: string;
  minRating: string;
  minPrice: string;
  maxPrice: string;
};

export type CatalogFilterChip = {
  id: string;
  label: string;
  keys: string[];
  feature?: string;
  brand?: string;
  spec?: { field: string; value: string };
};

export function readSelectedBrands(params: URLSearchParams): string[] {
  let brands: unknown = [];
  try {
    brands = JSON.parse(params.get("brands") || "[]");
  } catch {
    brands = [];
  }
  return [
    ...new Set([
      ...(Array.isArray(brands)
        ? brands
            .filter(
              (value): value is string =>
                typeof value === "string" && Boolean(value.trim()),
            )
            .map((value) => value.trim())
        : []),
      ...(params.get("brand") ? [params.get("brand")!] : []),
    ]),
  ];
}
export function readSelectedSpecs(
  params: URLSearchParams,
): Record<string, string[]> {
  try {
    const parsed: unknown = JSON.parse(params.get("specs") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(
          ([key, values]) =>
            /^[a-z][a-z0-9_]*$/.test(key) && Array.isArray(values),
        )
        .map(([key, values]) => [
          key,
          [
            ...new Set(
              (values as unknown[]).filter(
                (value): value is string =>
                  typeof value === "string" && Boolean(value),
              ),
            ),
          ],
        ]),
    );
  } catch {
    return {};
  }
}

export function readCatalogDraft(params: URLSearchParams): CatalogFilterDraft {
  return {
    category: params.get("category") || "All",
    brand: params.get("brand") || "All",
    brands: readSelectedBrands(params),
    specs: readSelectedSpecs(params),
    availability: params.get("availability") || "All",
    minRating: params.get("minRating") || "0",
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
  };
}

export function validateCatalogPrices(minPrice: string, maxPrice: string) {
  const errors: { minPrice?: string; maxPrice?: string } = {};
  const valid = (value: string) =>
    /^(?:\d+|\d*\.\d{1,2})$/.test(value.trim()) &&
    Number.isFinite(Number(value));
  if (minPrice.trim() && !valid(minPrice)) {
    errors.minPrice =
      "Enter a price of 0 or more, with up to two decimal places.";
  }
  if (maxPrice.trim() && !valid(maxPrice)) {
    errors.maxPrice =
      "Enter a price of 0 or more, with up to two decimal places.";
  }
  if (
    !errors.minPrice &&
    !errors.maxPrice &&
    minPrice.trim() &&
    maxPrice.trim() &&
    Number(minPrice) > Number(maxPrice)
  ) {
    errors.maxPrice = "Maximum price must be at least the minimum price.";
  }
  return errors;
}

/** Keep legitimate selections within the public API's bounded query payloads. */
export function validateCatalogSelections(draft: CatalogFilterDraft) {
  const brands = [...new Set(draft.brands || [])];
  const specs = Object.fromEntries(
    Object.entries(draft.specs || {}).filter(([, values]) => values.length),
  );
  if (brands.length > 20 || JSON.stringify(brands).length > 3000)
    return "Choose fewer brands to apply this selection.";
  if (
    Object.keys(specs).length > 8 ||
    Object.values(specs).some((values) => values.length > 12) ||
    JSON.stringify(specs).length > 4000
  )
    return "Choose fewer specification options to apply this selection.";
  return undefined;
}

export function applyCatalogDraft(
  params: URLSearchParams,
  draft: CatalogFilterDraft,
) {
  const next = new URLSearchParams(params);
  for (const key of [
    "category",
    "brand",
    "availability",
    "minRating",
  ] as const) {
    const value = draft[key];
    if (value && value !== "All" && value !== "0") next.set(key, value);
    else next.delete(key);
  }
  for (const key of ["minPrice", "maxPrice"] as const) {
    const value = draft[key].trim();
    if (value) next.set(key, String(Number(value)));
    else next.delete(key);
  }
  if (draft.brands !== undefined) {
    next.delete("brand");
    if (draft.brands.length)
      next.set("brands", JSON.stringify([...new Set(draft.brands)]));
    else next.delete("brands");
  }
  if (draft.specs !== undefined) {
    const specs = Object.fromEntries(
      Object.entries(draft.specs).filter(([, values]) => values.length),
    );
    if (Object.keys(specs).length) next.set("specs", JSON.stringify(specs));
    else next.delete("specs");
  }
  next.set("page", "1");
  return next;
}

const money = (raw: string) => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value)
    : raw;
};

export function catalogFilterChips(
  params: URLSearchParams,
): CatalogFilterChip[] {
  const chips: CatalogFilterChip[] = [];
  for (const [key, prefix] of [
    ["category", "Category"],
    ["availability", "Stock"],
  ]) {
    const value = params.get(key);
    if (value && value !== "All")
      chips.push({ id: key, label: `${prefix}: ${value}`, keys: [key] });
  }
  for (const brand of readSelectedBrands(params))
    chips.push({
      id: `brand:${brand}`,
      label: `Brand: ${brand}`,
      keys: ["brand", "brands"],
      brand,
    });
  for (const [field, values] of Object.entries(readSelectedSpecs(params)))
    for (const value of values)
      chips.push({
        id: `spec:${field}:${value}`,
        label: `${field.replace(/_/g, " ")}: ${value}`,
        keys: ["specs"],
        spec: { field, value },
      });
  const min = params.get("minPrice"),
    max = params.get("maxPrice");
  if (min || max)
    chips.push({
      id: "price",
      label:
        min && max
          ? `${money(min)} – ${money(max)}`
          : min
            ? `From ${money(min)}`
            : `Up to ${money(max!)}`,
      keys: ["minPrice", "maxPrice"],
    });
  for (const [key, prefix] of [
    ["minRating", "Rated at least"],
    ["maxRating", "Rated up to"],
  ]) {
    const value = params.get(key);
    if (value && (key === "maxRating" || value !== "0"))
      chips.push({ id: key, label: `${prefix} ${value} stars`, keys: [key] });
  }
  for (const feature of new Set(
    (params.get("features") || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  )) {
    chips.push({
      id: `feature:${feature}`,
      label: feature.replace(/_/g, " "),
      keys: ["features"],
      feature,
    });
  }
  if (params.get("isFeatured") === "true")
    chips.push({
      id: "featured",
      label: "Featured gear",
      keys: ["isFeatured"],
    });
  return chips;
}

export function removeCatalogFilter(
  params: URLSearchParams,
  chip: CatalogFilterChip,
) {
  const next = new URLSearchParams(params);
  if (chip.brand) {
    const brands = readSelectedBrands(params).filter(
      (brand) => brand !== chip.brand,
    );
    next.delete("brand");
    if (brands.length) next.set("brands", JSON.stringify(brands));
    else next.delete("brands");
  } else if (chip.spec) {
    const specs = readSelectedSpecs(params);
    const remaining =
      specs[chip.spec.field]?.filter((value) => value !== chip.spec!.value) ||
      [];
    if (remaining.length) specs[chip.spec.field] = remaining;
    else delete specs[chip.spec.field];
    if (Object.keys(specs).length) next.set("specs", JSON.stringify(specs));
    else next.delete("specs");
  } else if (chip.feature) {
    const remaining = (params.get("features") || "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && value !== chip.feature);
    if (remaining.length) next.set("features", remaining.join(","));
    else next.delete("features");
  } else chip.keys.forEach((key) => next.delete(key));
  if (chip.keys.includes("category")) next.delete("specs");
  next.set("page", "1");
  return next;
}

export function clearCatalogFilters(params: URLSearchParams) {
  const next = new URLSearchParams(params);
  CATALOG_FILTER_KEYS.forEach((key) => next.delete(key));
  next.set("page", "1");
  return next;
}

export function catalogHref(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
