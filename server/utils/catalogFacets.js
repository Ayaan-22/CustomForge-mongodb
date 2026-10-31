import AppError from "./appError.js";

// No schema migration is required: bounded reads normalize only published metadata.
// Larger catalogs must add a database facet index/RPC rather than return partial counts.
export const FACET_CANDIDATE_LIMIT = 1000;
export const FACET_FIELDS = "id,category,brand,specifications";

const facet = (key, label, ...aliases) => ({
  key,
  label,
  aliases: [label, ...aliases],
});
const profiles = {
  gpu: [
    facet(
      "memory",
      "Memory",
      "VRAM",
      "Video Memory",
      "Memory Size",
      "Memory Capacity",
    ),
    facet(
      "resolution",
      "Target resolution",
      "Target Resolution",
      "Recommended Resolution",
    ),
    facet("cooling", "Cooling", "Cooling System", "Cooler"),
    facet("interface", "Interface", "Bus Interface"),
  ],
  cpu: [
    facet("socket", "Socket", "CPU Socket", "Processor Socket"),
    facet("cores", "Cores", "CPU Cores", "Core Count", "Number of Cores"),
    facet("threads", "Threads", "Thread Count"),
    facet(
      "boost_clock",
      "Boost clock",
      "Max Boost Clock",
      "Boost Frequency",
      "Turbo Frequency",
      "Max Turbo Frequency",
    ),
    facet("tdp", "TDP", "Power"),
  ],
  ram: [
    facet(
      "memory_type",
      "Memory type",
      "Type",
      "RAM Type",
      "Memory Technology",
      "Generation",
      "DDR Generation",
    ),
    facet(
      "capacity",
      "Capacity",
      "Memory",
      "Memory Size",
      "Memory Capacity",
      "Total Capacity",
    ),
    facet("speed", "Speed", "Frequency", "Memory Speed", "Data Rate"),
  ],
  motherboard: [
    facet("socket", "Socket", "CPU Socket", "Processor Socket"),
    facet("chipset", "Chipset", "Motherboard Chipset"),
    facet("form_factor", "Form factor", "Size", "Board Size"),
    facet(
      "memory_type",
      "Memory type",
      "RAM Type",
      "Supported Memory",
      "Memory",
    ),
  ],
  storage: [
    facet("capacity", "Capacity", "Storage Capacity", "Drive Capacity"),
    facet(
      "interface",
      "Interface",
      "Connection",
      "Connection Interface",
      "Bus Interface",
    ),
    facet("form_factor", "Form factor", "Drive Size"),
    facet("type", "Type", "Storage Type"),
  ],
  monitor: [
    facet(
      "resolution",
      "Resolution",
      "Display Resolution",
      "Screen Resolution",
      "Native Resolution",
    ),
    facet(
      "refresh_rate",
      "Refresh rate",
      "Refresh",
      "Max Refresh Rate",
      "Refresh Frequency",
    ),
    facet("screen_size", "Screen size", "Size", "Display Size"),
    facet("panel", "Panel", "Panel Type", "Display Technology"),
  ],
  keyboard: [
    facet("layout", "Layout", "Form Factor", "Keyboard Layout"),
    facet("switches", "Switches", "Switch Type", "Switch", "Key Switches"),
    facet(
      "connection",
      "Connection",
      "Connectivity",
      "Connection Type",
      "Interface",
    ),
  ],
  mouse: [
    facet("dpi", "DPI", "Max DPI"),
    facet("connection", "Connection", "Connectivity"),
    facet("sensor", "Sensor", "Sensor Type"),
  ],
  headset: [
    facet("connection", "Connection", "Connectivity"),
    facet("driver", "Driver", "Driver Size"),
    facet("audio", "Audio", "Surround Sound"),
  ],
  case: [
    facet("form_factor", "Form factor", "Motherboard Support"),
    facet("type", "Type", "Case Type"),
  ],
  powersupply: [
    facet(
      "wattage",
      "Wattage",
      "Power",
      "Power Output",
      "Output Power",
      "Output",
    ),
    facet(
      "efficiency",
      "Efficiency",
      "Efficiency Rating",
      "Certification",
      "80 Plus Rating",
    ),
    facet("modularity", "Modularity", "Modular", "Cabling", "Cable Type"),
  ],
  cooling: [
    facet("type", "Type", "Cooler Type", "Cooling Type"),
    facet("radiator", "Radiator", "Radiator Size"),
    facet(
      "socket",
      "Socket",
      "Socket Support",
      "Supported Sockets",
      "Socket Compatibility",
      "Sockets",
    ),
  ],
  networking: [
    facet("interface", "Interface", "Connection"),
    facet("speed", "Speed", "Ethernet", "Ethernet Speed", "Transfer Rate"),
    facet("wireless", "Wireless", "WiFi Standard", "Wireless Standard"),
    facet("bands", "Bands", "Frequency Bands"),
    facet("ports", "Ports", "Port Count"),
  ],
};
const normalizeKey = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const profileFor = (category) => {
  const key = normalizeKey(category);
  const resolved =
    key === "psu"
      ? "powersupply"
      : key === "cooler"
        ? "cooling"
        : key === "externalstorage"
          ? "storage"
          : key;
  // Category text is untrusted; inherited Object keys are not facet profiles.
  return Object.hasOwn(profiles, resolved) ? profiles[resolved] : [];
};
export const normalizeFacetValue = (value) =>
  String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(\d)\s*(gb|tb|mb|ghz|mhz|khz|hz|w|mt\/s)\b/gi, "$1 $2")
    .toLowerCase();

function specificationEntries(row) {
  let specs = row.specifications;
  if (typeof specs === "string") {
    try {
      specs = JSON.parse(specs);
    } catch {
      return [];
    }
  }
  if (!specs || typeof specs !== "object") return [];
  return Array.isArray(specs)
    ? specs.map((item) => [item?.key, item?.value])
    : Object.entries(specs);
}
export function productFacetValues(row) {
  const entries = specificationEntries(row);
  const result = {};
  for (const field of profileFor(row.category)) {
    const aliases = field.aliases.map(normalizeKey);
    const values = entries
      .filter(([key]) => key && aliases.includes(normalizeKey(key)))
      .flatMap(([, value]) => (Array.isArray(value) ? value : [value]));
    const valid = values.filter(
      (value) =>
        (typeof value === "string" ||
          (typeof value === "number" && Number.isFinite(value))) &&
        String(value).trim() &&
        String(value).length <= 160 &&
        !/^(?:n\/?a|unknown|unspecified|not specified|not available|tbd|[-–—]+)$/i.test(
          String(value).trim(),
        ),
    );
    if (valid.length)
      result[field.key] = [...new Set(valid.map(normalizeFacetValue))];
  }
  return result;
}

export function matchesSpecFilters(row, selected) {
  const values = productFacetValues(row);
  // OR inside one facet; AND across different facets.
  return Object.entries(selected).every(([field, options]) =>
    options.some((value) => values[field]?.includes(value)),
  );
}

export function buildCatalogFacets(rows, category) {
  const brands = new Map();
  const fields = profileFor(category);
  const counts = new Map(fields.map((field) => [field.key, new Map()]));
  const labels = new Map();
  for (const row of rows) {
    if (row.brand) brands.set(row.brand, (brands.get(row.brand) || 0) + 1);
    const values = productFacetValues(row);
    for (const [, raw] of specificationEntries(row))
      for (const value of Array.isArray(raw) ? raw : [raw]) {
        if (typeof value === "string" || typeof value === "number")
          labels.set(normalizeFacetValue(value), String(value).trim());
      }
    for (const field of fields)
      for (const value of values[field.key] || []) {
        const map = counts.get(field.key);
        map.set(value, (map.get(value) || 0) + 1);
      }
  }
  return {
    brands: [...brands]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    specs: fields
      .map(({ key, label }) => ({
        key,
        label,
        options: [...counts.get(key)]
          .map(([value, count]) => ({
            value,
            label: labels.get(value) || value,
            count,
          }))
          .sort((a, b) =>
            a.value.localeCompare(b.value, undefined, { numeric: true }),
          ),
      }))
      .filter((field) => field.options.length),
  };
}

const scalar = (query, key, max = 160) => {
  const value = query[key];
  if (value === undefined || value === "") return null;
  if (typeof value !== "string" || value.length > max)
    throw new AppError(`Invalid ${key} filter`, 400);
  return value.trim() || null;
};
export function parseCatalogFilters(query) {
  const filters = {};
  for (const key of ["category", "brand", "availability", "q"])
    filters[key] = scalar(query, key, key === "q" ? 200 : 160);
  filters.brands = [];
  const rawBrands = scalar(query, "brands", 3000);
  if (rawBrands) {
    let brands;
    try {
      brands = JSON.parse(rawBrands);
    } catch {
      throw new AppError("Invalid brands filter", 400);
    }
    if (
      !Array.isArray(brands) ||
      brands.length > 20 ||
      brands.some(
        (brand) =>
          typeof brand !== "string" || !brand.trim() || brand.length > 160,
      )
    )
      throw new AppError("Select up to 20 valid brands", 400);
    filters.brands = [...new Set(brands.map((brand) => brand.trim()))];
  }
  if (filters.brand)
    filters.brands = [...new Set([...filters.brands, filters.brand])];
  if (filters.brands.length > 20)
    throw new AppError("Select up to 20 valid brands", 400);
  for (const key of ["minPrice", "maxPrice", "minRating", "maxRating"]) {
    const raw = scalar(query, key, 24);
    filters[key] = raw === null ? null : Number(raw);
    if (
      raw !== null &&
      (!/^\d+(?:\.\d+)?$/.test(raw) ||
        !Number.isFinite(filters[key]) ||
        filters[key] < 0 ||
        (key.includes("Rating") && filters[key] > 5))
    )
      throw new AppError(`Invalid ${key} filter`, 400);
  }
  if (
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.minPrice > filters.maxPrice
  )
    throw new AppError("Maximum price must be at least the minimum price", 400);
  if (
    filters.minRating !== null &&
    filters.maxRating !== null &&
    filters.minRating > filters.maxRating
  )
    throw new AppError(
      "Maximum rating must be at least the minimum rating",
      400,
    );
  filters.features = (scalar(query, "features", 2000) || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const key of ["isFeatured", "discounted"]) {
    const value = scalar(query, key);
    if (value !== null && !["true", "false"].includes(value))
      throw new AppError(`Invalid ${key} filter`, 400);
  }
  filters.isFeatured =
    query.isFeatured === undefined
      ? null
      : scalar(query, "isFeatured") === "true";
  filters.discounted = scalar(query, "discounted") === "true";
  filters.specs = {};
  const rawSpecs = scalar(query, "specs", 4000);
  if (rawSpecs) {
    let specs;
    try {
      specs = JSON.parse(rawSpecs);
    } catch {
      throw new AppError("Invalid specifications filter", 400);
    }
    const allowed = new Set(
      profileFor(filters.category).map((field) => field.key),
    );
    if (
      !specs ||
      typeof specs !== "object" ||
      Array.isArray(specs) ||
      Object.keys(specs).length > 8
    )
      throw new AppError("Invalid specifications filter", 400);
    for (const [field, values] of Object.entries(specs)) {
      if (
        !allowed.has(field) ||
        !Array.isArray(values) ||
        !values.length ||
        values.length > 12 ||
        values.some(
          (value) =>
            typeof value !== "string" || !value.trim() || value.length > 160,
        )
      )
        throw new AppError(
          "Choose valid specification filters for one category",
          400,
        );
      filters.specs[field] = [...new Set(values.map(normalizeFacetValue))];
    }
  }
  return filters;
}

