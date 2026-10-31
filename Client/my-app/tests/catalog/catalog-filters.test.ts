import { describe, expect, it } from "vitest";
import {
  applyCatalogDraft,
  catalogFilterChips,
  clearCatalogFilters,
  readCatalogDraft,
  removeCatalogFilter,
  validateCatalogPrices,
  validateCatalogSelections,
} from "@/lib/catalog-filters";

describe("catalog filter URL behavior", () => {
  it("keeps selection counts and serialized payloads within API bounds without truncating choices", () => {
    const draft = readCatalogDraft(new URLSearchParams("category=CPU"));
    expect(
      validateCatalogSelections({
        ...draft,
        brands: ["AMD", "CustomForge"],
        specs: { socket: ["am5"] },
      }),
    ).toBeUndefined();
    expect(
      validateCatalogSelections({
        ...draft,
        brands: Array.from({ length: 20 }, (_, i) => `${i}${"A".repeat(159)}`),
      }),
    ).toMatch(/fewer brands/);
    expect(
      validateCatalogSelections({
        ...draft,
        specs: { socket: Array(13).fill("value") },
      }),
    ).toMatch(/fewer specification/);
    expect(
      validateCatalogSelections({
        ...draft,
        specs: Object.fromEntries(
          ["a", "b", "c"].map((key) => [key, Array(12).fill("x".repeat(160))]),
        ),
      }),
    ).toMatch(/fewer specification/);
  });
  it("supports prices beyond the old slider cap, including exact cents and zero", () => {
    expect(validateCatalogPrices("0", "49410.25")).toEqual({});
    const next = applyCatalogDraft(
      new URLSearchParams("q=GPU&sort=-final_price&page=3&discounted=true"),
      {
        category: "GPU",
        brand: "All",
        availability: "In Stock",
        minRating: "0",
        minPrice: "0",
        maxPrice: "49410.25",
      },
    );
    expect(Object.fromEntries(next)).toEqual({
      q: "GPU",
      sort: "-final_price",
      page: "1",
      discounted: "true",
      category: "GPU",
      availability: "In Stock",
      minPrice: "0",
      maxPrice: "49410.25",
    });
  });
  it("rejects negative, non-finite, exponential, overprecision and reversed budgets", () => {
    for (const value of ["-1", "Infinity", "1e3", "12.345", "abc"]) {
      expect(validateCatalogPrices(value, "").minPrice).toBeTruthy();
    }
    expect(validateCatalogPrices("100", "99").maxPrice).toBeTruthy();
    expect(validateCatalogPrices("", "")).toEqual({});
    expect(validateCatalogPrices(".50", "100.99")).toEqual({});
  });
  it("clears filters without dropping search, sorting or deals state", () => {
    const next = clearCatalogFilters(
      new URLSearchParams(
        "q=keyboard&sort=name&page=4&discounted=true&brand=CustomForge&minPrice=0&maxPrice=99&features=layout%3A+60%25&isFeatured=true",
      ),
    );
    expect(Object.fromEntries(next)).toEqual({
      q: "keyboard",
      sort: "name",
      page: "1",
      discounted: "true",
    });
  });
  it("removes one exact feature while preserving other selected features and filters", () => {
    const params = new URLSearchParams(
      "category=GPU&features=memory%3A+12+GB%2Ccooling%3A+Dual+fan&page=3",
    );
    const selected = catalogFilterChips(params).find(
      (chip) => chip.feature === "memory: 12 GB",
    )!;
    const next = removeCatalogFilter(params, selected);
    expect(next.get("features")).toBe("cooling: Dual fan");
    expect(next.get("category")).toBe("GPU");
    expect(next.get("page")).toBe("1");
  });
  it("represents an uncapped price range as one removable selection", () => {
    const params = new URLSearchParams("brand=ASUS&minPrice=0&maxPrice=50000");
    const chips = catalogFilterChips(params);
    expect(chips.map((chip) => chip.id)).toEqual(["brand:ASUS", "price"]);
    expect(chips[1].label).toBe("$0.00 – $50,000.00");
    const next = removeCatalogFilter(params, chips[1]);
    expect(next.has("minPrice")).toBe(false);
    expect(next.has("maxPrice")).toBe(false);
    expect(next.get("brand")).toBe("ASUS");
  });
  it("reads zero and missing budget bounds distinctly and preserves linked feature queries on apply", () => {
    const params = new URLSearchParams("minPrice=0&features=socket%3A+AM5");
    const draft = readCatalogDraft(params);
    expect(draft.minPrice).toBe("0");
    expect(draft.maxPrice).toBe("");
    expect(applyCatalogDraft(params, draft).get("features")).toBe(
      "socket: AM5",
    );
  });
  it("round trips multiple brands and normalized specifications, preserving independent state", () => {
    const params = new URLSearchParams({
      q: "gpu",
      sort: "name",
      page: "3",
      discounted: "true",
      brands: JSON.stringify(["ASUS", "MSI"]),
      category: "GPU",
      specs: JSON.stringify({
        memory: ["12 gb", "16 gb"],
        cooling: ["dual fan"],
      }),
    });
    const draft = readCatalogDraft(params);
    expect(draft.brands).toEqual(["ASUS", "MSI"]);
    expect(applyCatalogDraft(params, draft).get("specs")).toBe(
      params.get("specs"),
    );
    const brandChip = catalogFilterChips(params).find(
      (chip) => chip.brand === "ASUS",
    )!;
    const next = removeCatalogFilter(params, brandChip);
    expect(JSON.parse(next.get("brands")!)).toEqual(["MSI"]);
    expect(next.get("specs")).toBe(params.get("specs"));
    const memoryChip = catalogFilterChips(next).find(
      (chip) => chip.spec?.field === "memory" && chip.spec.value === "12 gb",
    )!;
    const narrowed = removeCatalogFilter(next, memoryChip);
    expect(JSON.parse(narrowed.get("specs")!)).toEqual({
      memory: ["16 gb"],
      cooling: ["dual fan"],
    });
    expect(narrowed.get("page")).toBe("1");
    expect(narrowed.get("q")).toBe("gpu");
    expect(Object.fromEntries(clearCatalogFilters(narrowed))).toEqual({
      q: "gpu",
      sort: "name",
      page: "1",
      discounted: "true",
    });
  });
  it("upgrades old brand links without losing selections and tolerates malformed filter URL JSON", () => {
    const params = new URLSearchParams({
      brand: "ASUS",
      brands: JSON.stringify(["MSI", "ASUS"]),
    });
    const draft = readCatalogDraft(params);
    expect(draft.brands).toEqual(["MSI", "ASUS"]);
    const next = applyCatalogDraft(params, draft);
    expect(next.has("brand")).toBe(false);
    expect(JSON.parse(next.get("brands")!)).toEqual(["MSI", "ASUS"]);
    expect(
      readCatalogDraft(new URLSearchParams("brands=invalid&specs=invalid"))
        .brands,
    ).toEqual([]);
  });
  it("drops category-specific specs when removing their category while keeping other filters", () => {
    const params = new URLSearchParams({
      category: "CPU",
      specs: JSON.stringify({ socket: ["am5"] }),
      brand: "AMD",
      sort: "name",
    });
    const chip = catalogFilterChips(params).find(
      (chip) => chip.id === "category",
    )!;
    const next = removeCatalogFilter(params, chip);
    expect(next.has("category")).toBe(false);
    expect(next.has("specs")).toBe(false);
    expect(next.get("brand")).toBe("AMD");
    expect(next.get("sort")).toBe("name");
  });
});
