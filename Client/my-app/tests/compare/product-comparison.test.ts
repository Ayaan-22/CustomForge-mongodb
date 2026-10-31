import { describe, expect, it } from "vitest";
import { comparisonRows, comparisonSpecifications } from "@/lib/product-comparison";
import type { Product } from "@/lib/types";
const product = (overrides: Partial<Product> = {}): Product => ({
  id: "1",
  name: "Test product",
  brand: "CustomForge",
  category: "GPU",
  sku: "TEST",
  originalPrice: 100,
  finalPrice: 90,
  availability: "In Stock",
  images: [],
  description: "",
  ratings: { average: 0, totalReviews: 0 },
  ...overrides,
});

describe("honest product comparison", () => {
  it("merges same-category published key aliases and normalizes unit spacing/case", () => {
    const rows = comparisonRows([
      product({ specifications: [{ key: "VRAM", value: "12GB" }] }),
      product({ specifications: [{ key: "Video Memory", value: "12 gb" }] }),
    ]);
    const specRows = rows.filter((row) => row.section === "specifications");
    expect(specRows).toHaveLength(1);
    expect(specRows[0].label).toBe("Graphics memory");
    expect(specRows[0].cells.map((cell) => cell.text)).toEqual([
      "12GB",
      "12 gb",
    ]);
    expect(specRows[0].different).toBe(false);
  });
  it("does not equate unrelated same-named attributes across categories", () => {
    const rows = comparisonRows([
      product({ specifications: [{ key: "Memory", value: "12 GB" }] }),
      product({
        category: "Motherboard",
        specifications: [{ key: "Memory", value: "DDR5" }],
      }),
    ]);
    const specs = rows.filter((row) => row.section === "specifications");
    expect(specs).toHaveLength(2);
    expect(specs.map((row) => row.label)).toEqual([
      "GPU · Graphics memory",
      "Motherboard · Memory",
    ]);
    expect(specs[0].cells[1].kind).toBe("missing");
  });
  it("leaves missing/placeholder metadata unverified, including in difference comparisons", () => {
    const rows = comparisonRows([
      product({ specifications: [{ key: "Memory", value: "12GB" }] }),
      product({
        specifications: [
          { key: "VRAM", value: "N/A" },
          { key: "Cooling", value: "unknown" },
        ],
      }),
    ]);
    const row = rows.find((row) => row.key === "gpu:memory")!;
    expect(row.cells[1]).toMatchObject({
      text: "Not listed",
      kind: "missing",
      comparable: null,
    });
    expect(row.different).toBe(true);
    expect(rows.some((row) => row.key === "gpu:cooling")).toBe(false);
  });
  it("retains conflicting aliases without selecting a favorable value", () => {
    const specs = comparisonSpecifications(
      product({
        specifications: [
          { key: "Memory", value: "12 GB" },
          { key: "VRAM", value: "16 GB" },
        ],
      }),
    );
    expect(specs.get("gpu:memory")?.cell).toMatchObject({
      text: "12 GB / 16 GB",
      kind: "conflict",
      comparable: null,
    });
  });
  it("retains unknown published fields within their category and rejects prototype category keys", () => {
    expect(
      [
        ...comparisonSpecifications(
          product({
            category: "constructor",
            specifications: [{ key: "Unique_field", value: "Published" }],
          }),
        ).values(),
      ][0],
    ).toMatchObject({ label: "Unique field", cell: { text: "Published" } });
    const rows = comparisonRows([
      product({ specifications: [{ key: "Firmware Revision", value: "1.0" }] }),
      product({ specifications: [{ key: "firmware_revision", value: "1.0" }] }),
    ]);
    expect(rows.filter((row) => row.section === "specifications")).toHaveLength(
      1,
    );
  });
  it("preserves failed/loading columns and compares only refreshed products", () => {
    const rows = comparisonRows([
      product(),
      undefined,
      product({ id: "3", finalPrice: 120 }),
    ]);
    expect(rows[0].cells).toHaveLength(3);
    expect(rows[0].cells[1].kind).toBe("missing");
    expect(rows[0].different).toBe(true);
    expect(
      comparisonRows([product(), undefined]).some((row) => row.different),
    ).toBe(false);
  });
  it("uses authoritative final price, including zero, or computes an actual listed discount", () => {
    const prices = comparisonRows([
      product({ finalPrice: 0 }),
      product({
        finalPrice: undefined,
        originalPrice: 100,
        discountPercentage: 20,
      }),
    ])[0];
    expect(prices.cells.map((cell) => cell.text)).toEqual(["$0.00", "$80.00"]);
    expect(prices.different).toBe(true);
  });
  it("does not perform invented unit conversions or combine RAM capacity with generation", () => {
    const rows = comparisonRows([
      product({
        category: "RAM",
        specifications: [
          { key: "Total Capacity", value: "1024MB" },
          { key: "Memory Type", value: "DDR5" },
        ],
      }),
      product({
        category: "RAM",
        specifications: [
          { key: "Memory Capacity", value: "1 GB" },
          { key: "DDR Generation", value: "DDR5" },
        ],
      }),
    ]);
    expect(rows.find((row) => row.key === "ram:capacity")?.different).toBe(
      true,
    );
    expect(rows.find((row) => row.key === "ram:type")?.different).toBe(false);
  });
  it("does not invent a review score when the catalog has no reviews", () => {
    const row = comparisonRows([product(), product()]).find(
      (row) => row.key === "rating",
    )!;
    expect(row.cells.map((cell) => cell.text)).toEqual([
      "No reviews yet",
      "No reviews yet",
    ]);
    expect(row.different).toBe(false);
  });
  it("separates included fans from mounting capacity and leaves generic fans unclassified", () => {
    const specs = comparisonSpecifications(
      product({
        category: "Case",
        specifications: [
          { key: "Included Fans", value: "3 x 120 mm" },
          { key: "Fan Support", value: "6 x 120 mm" },
          { key: "Fans", value: "RGB" },
        ],
      }),
    );
    expect(specs.size).toBe(3);
    expect(specs.get("case:included_fans")).toMatchObject({
      label: "Included fans",
      cell: { text: "3 x 120 mm", kind: "value" },
    });
    expect(specs.get("case:fan_support")).toMatchObject({
      label: "Fan support",
      cell: { text: "6 x 120 mm", kind: "value" },
    });
    expect(specs.get("case:raw:fans")).toMatchObject({
      label: "Fans",
      cell: { text: "RGB" },
    });
  });
  it("never equates chassis type with form factor or board memory capacity with memory type", () => {
    const cases = comparisonSpecifications(
      product({
        category: "Case",
        specifications: [
          { key: "Case Type", value: "Mid tower" },
          { key: "Type", value: "Gaming" },
          { key: "Form Factor", value: "ATX" },
        ],
      }),
    );
    expect(cases.size).toBe(3);
    expect(cases.get("case:form")).toMatchObject({
      label: "Form factor",
      cell: { text: "ATX", kind: "value" },
    });
    expect(cases.get("case:raw:casetype")).toMatchObject({
      label: "Case Type",
      cell: { text: "Mid tower" },
    });
    const board = comparisonSpecifications(
      product({
        category: "Motherboard",
        specifications: [
          { key: "Memory", value: "128 GB" },
          { key: "RAM Type", value: "DDR5" },
        ],
      }),
    );
    expect(board.size).toBe(2);
    expect(board.get("motherboard:type")).toMatchObject({
      label: "Memory type",
      cell: { text: "DDR5", kind: "value" },
    });
    expect(board.get("motherboard:raw:memory")).toMatchObject({
      label: "Memory",
      cell: { text: "128 GB" },
    });
  });
  it("keeps generic certifications and RAM packaging types independent of efficiency and generation", () => {
    const psu = comparisonSpecifications(
      product({
        category: "Power Supply",
        specifications: [
          { key: "Certification", value: "CE" },
          { key: "80 Plus Rating", value: "Gold" },
        ],
      }),
    );
    expect(psu.size).toBe(2);
    expect(psu.get("psu:efficiency")).toMatchObject({
      label: "Efficiency",
      cell: { text: "Gold", kind: "value" },
    });
    expect(psu.get("psu:raw:certification")).toMatchObject({
      label: "Certification",
      cell: { text: "CE" },
    });
    const ram = comparisonSpecifications(
      product({
        category: "RAM",
        specifications: [
          { key: "Type", value: "SO-DIMM" },
          { key: "DDR Generation", value: "DDR5" },
        ],
      }),
    );
    expect(ram.size).toBe(2);
    expect(ram.get("ram:type")).toMatchObject({
      label: "Memory type",
      cell: { text: "DDR5" },
    });
    expect(ram.get("ram:raw:type")).toMatchObject({
      label: "Type",
      cell: { text: "SO-DIMM" },
    });
  });
});
