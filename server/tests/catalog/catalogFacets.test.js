import { describe, expect, it } from "vitest";
import {
  buildCatalogFacets,
  matchesSpecFilters,
  normalizeFacetValue,
  parseCatalogFilters,
  productFacetValues,
} from "../../utils/catalogFacets.js";

describe("published category facet normalization", () => {
  it("treats inherited object names as unknown categories instead of profiles", () => {
    expect(
      productFacetValues({
        category: "constructor",
        specifications: { Socket: "AM5" },
      }),
    ).toEqual({});
    expect(buildCatalogFacets([], "constructor")).toEqual({
      brands: [],
      specs: [],
    });
    expect(parseCatalogFilters({ category: "constructor" }).specs).toEqual({});
    expect(() =>
      parseCatalogFilters({
        category: "constructor",
        specs: JSON.stringify({ socket: ["am5"] }),
      }),
    ).toThrow(/category/);
  });
  it("normalizes key case, punctuation, value spacing and unit aliases without extracting product names", () => {
    expect(
      productFacetValues({
        category: "GPU",
        name: "Pretend 32GB",
        specifications: {
          VIDEO_MEMORY: "12GB",
          cooling_system: "  Dual   Fan ",
          unrelated: "32 GB",
        },
      }),
    ).toEqual({ memory: ["12 gb"], cooling: ["dual fan"] });
    expect(
      productFacetValues({ category: "GPU", specifications: "{bad JSON" }),
    ).toEqual({});
  });
  it("accepts array and JSON object specifications and counts each product only once per value", () => {
    const rows = [
      {
        category: "GPU",
        brand: "A",
        specifications: [
          { key: "Memory", value: "12 GB" },
          { key: "VRAM", value: "12GB" },
        ],
      },
      {
        category: "GPU",
        brand: "B",
        specifications: JSON.stringify({ memory: "12 GB" }),
      },
    ];
    expect(buildCatalogFacets(rows, "GPU").specs[0].options).toMatchObject([
      { value: "12 gb", count: 2 },
    ]);
  });
  it("offers only category-relevant published fields and ignores nested or oversized metadata", () => {
    expect(
      productFacetValues({
        category: "CPU",
        specifications: {
          CPU_SOCKET: "AM5",
          Core_Count: 8,
          Memory: "16 GB",
          Threads: { nested: 16 },
          TDP: "x".repeat(161),
        },
      }),
    ).toEqual({ socket: ["am5"], cores: ["8"] });
    expect(
      buildCatalogFacets(
        [{ category: "GPU", specifications: { socket: "AM5" } }],
        "GPU",
      ).specs,
    ).toEqual([]);
  });
  it("matches OR within values and AND between selected fields; missing data never passes", () => {
    const row = {
      category: "RAM",
      specifications: { type: "DDR5", capacity: "32GB", frequency: "6000 MHz" },
    };
    expect(
      matchesSpecFilters(row, {
        memory_type: ["ddr4", "ddr5"],
        capacity: ["32 gb"],
      }),
    ).toBe(true);
    expect(
      matchesSpecFilters(row, { memory_type: ["ddr5"], capacity: ["16 gb"] }),
    ).toBe(false);
    expect(
      matchesSpecFilters(
        { ...row, specifications: {} },
        { capacity: ["32 gb"] },
      ),
    ).toBe(false);
  });
  it("handles real Cooler/PSU aliases without changing stored category identities", () => {
    expect(
      productFacetValues({
        category: "PSU",
        specifications: { Power_Output: "750W", Certification: "80 Plus Gold" },
      }),
    ).toEqual({ wattage: ["750 w"], efficiency: ["80 plus gold"] });
    expect(
      productFacetValues({
        category: "Cooler",
        specifications: { Radiator_Size: "240 mm", Cooling_Type: "Liquid" },
      }),
    ).toEqual({ type: ["liquid"], radiator: ["240 mm"] });
  });
  it("bounds selections, rejects unknown keys and requires the selected category", () => {
    expect(() =>
      parseCatalogFilters({ brands: JSON.stringify(Array(21).fill("A")) }),
    ).toThrow(/20/);
    expect(() =>
      parseCatalogFilters({
        brand: "legacy",
        brands: JSON.stringify(
          Array.from({ length: 20 }, (_, index) => `Brand ${index}`),
        ),
      }),
    ).toThrow(/20/);
    expect(() =>
      parseCatalogFilters({ specs: JSON.stringify({ socket: ["am5"] }) }),
    ).toThrow(/category/);
    expect(() =>
      parseCatalogFilters({
        category: "CPU",
        specs: JSON.stringify({ internal_cost: ["0"] }),
      }),
    ).toThrow(/category/);
    expect(
      parseCatalogFilters({
        category: "CPU",
        specs: JSON.stringify({ socket: [" AM5 ", "am5"] }),
      }).specs,
    ).toEqual({ socket: ["am5"] });
  });
  it("uses published aliases shared with highlights and suppresses placeholder values", () => {
    expect(
      productFacetValues({
        category: "RAM",
        specifications: {
          "DDR Generation": "DDR5",
          "Total Capacity": "32 GB",
          speed: "N/A",
        },
      }),
    ).toEqual({ memory_type: ["ddr5"], capacity: ["32 gb"] });
    expect(
      productFacetValues({
        category: "Motherboard",
        specifications: { Memory: "DDR5", Chipset: "unknown", Socket: "—" },
      }),
    ).toEqual({ memory_type: ["ddr5"] });
    expect(
      productFacetValues({
        category: "Cooler",
        specifications: {
          "Supported Sockets": ["AM5", "LGA1700"],
          Type: "Not specified",
        },
      }),
    ).toEqual({ socket: ["am5", "lga1700"] });
  });
  it("merges unit-spacing aliases without changing numeric quantities or converting units", () => {
    for (const [raw, normalized] of [
      ["5.4GHz", "5.4 ghz"],
      ["6000MT/s", "6000 mt/s"],
      ["64MB", "64 mb"],
      ["100kHz", "100 khz"],
    ])
      expect(normalizeFacetValue(raw)).toBe(normalized);
    expect(normalizeFacetValue("1024MB")).not.toBe(normalizeFacetValue("1 GB"));
  });
});
