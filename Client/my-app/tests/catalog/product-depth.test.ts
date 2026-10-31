import { describe, expect, it } from "vitest";
import {
  describeComplement,
  getComplementCategories,
  getDecisionNote,
  getProductProfile,
  getProductStory,
} from "@/lib/product-depth";
import type { Product } from "@/lib/types";

function product(
  category: string,
  specs: Record<string, string> = {},
  overrides: Partial<Product> = {},
): Product {
  return {
    id: category,
    category,
    name: "Published product",
    brand: "Brand",
    sku: "SKU",
    originalPrice: 100,
    availability: "In Stock",
    ratings: { average: 0, totalReviews: 0 },
    images: [],
    description: "Listing text",
    specifications: Object.entries(specs).map(([key, value]) => ({
      key,
      value,
    })),
    ...overrides,
  };
}

describe("product story and complementary setup guidance", () => {
  it("resolves profiles from category aliases and real peripheral fields", () => {
    expect(getProductProfile(product("Graphics Cards"))).toBe("gpu");
    expect(
      getProductProfile(
        product("Peripherals", { "Switch Type": "Mechanical" }),
      ),
    ).toBe("keyboard");
    expect(
      getProductProfile(product("Accessories", {}, { name: "Gaming Mouse" })),
    ).toBeUndefined();
  });

  it("keeps category guidance distinct without inventing product performance", () => {
    expect(getProductStory(product("CPU")).setup).toContain("BIOS");
    expect(getProductStory(product("Monitor")).setup).toContain("refresh");
    expect(getProductStory(product("Accessories")).title).toBe(
      "Make it part of your setup.",
    );
    expect(getDecisionNote("Memory", "gpu")).toContain("Graphics memory");
    expect(getDecisionNote("Memory", "motherboard")).toContain(
      "motherboard support",
    );
  });

  it("uses only available catalog categories for complements", () => {
    expect(
      getComplementCategories(product("CPU"), [
        "RAM",
        "Motherboards",
        "Cooling",
      ]),
    ).toEqual([
      { category: "Motherboards", profile: "motherboard" },
      { category: "Cooling", profile: "cooler" },
    ]);
    expect(getComplementCategories(product("GPU"), ["CPU"])).toEqual([]);
  });

  it("excludes known socket conflicts while explaining published matches", () => {
    const cpu = product("CPU", { Socket: "AM5" });
    expect(
      describeComplement(cpu, product("Motherboard", { Socket: "LGA1700" })),
    ).toBeNull();
    const match = describeComplement(
      cpu,
      product("Motherboard", { Socket: "AM5" }),
    );
    expect(match?.status).toBe("Published specs match");
    expect(match?.reason).toContain("AM5 CPU / AM5 motherboard");
  });

  it("marks missing compatibility metadata as unverified", () => {
    const item = describeComplement(
      product("CPU", { Socket: "AM5" }),
      product("Motherboard"),
    );
    expect(item?.needsVerification).toBe(true);
    expect(item?.status).toBe("Verify your setup");
    expect(item?.reason).toContain("BIOS");
  });

  it("does not imply hardware compatibility for a category complement", () => {
    const item = describeComplement(product("GPU"), product("Monitor"));
    expect(item?.status).toBe("Verify your setup");
    expect(item?.reason).toContain("ports");
    expect(item?.needsVerification).toBe(true);
  });

  it("excludes alternatives, the current listing and unavailable stock", () => {
    const source = product("CPU");
    expect(
      describeComplement(source, product("CPU", {}, { id: "another-cpu" })),
    ).toBeNull();
    expect(
      describeComplement(source, product("Motherboard", {}, { stock: 0 })),
    ).toBeNull();
    expect(
      describeComplement(source, product("Motherboard", {}, { id: source.id })),
    ).toBeNull();
    expect(
      describeComplement(
        source,
        product("Cooler", {}, { availability: "Out of Stock" }),
      ),
    ).toBeNull();
  });

  it("rejects a GPU that exceeds published case clearance", () => {
    expect(
      describeComplement(
        product("Case", { "GPU Clearance": "300 mm" }),
        product("GPU", { Length: "340.5 mm" }),
      ),
    ).toBeNull();
    expect(
      describeComplement(
        product("Case", { "GPU Clearance": "300 mm" }),
        product("GPU", { Length: "290 mm" }),
      )?.reason,
    ).toContain("290 mm GPU / 300 mm case");
  });
});
