import { describe, expect, it } from "vitest";
import { checkCompatibility } from "@/lib/compatibility";
import type { Product } from "@/lib/types";
function part(
  category: string,
  specifications: Record<string, string>,
): Product {
  return {
    id: category,
    name: category,
    brand: "Test",
    sku: category,
    category,
    originalPrice: 1,
    availability: "In Stock",
    images: [],
    description: "",
    ratings: { average: 0, totalReviews: 0 },
    specifications: Object.entries(specifications).map(([key, value]) => ({
      key,
      value,
    })),
  };
}
describe("published-spec compatibility", () => {
  it("flags mismatched sockets and DDR generations", () => {
    const result = checkCompatibility({
      CPU: part("CPU", { Socket: "AM5" }),
      Motherboard: part("Motherboard", { Socket: "LGA1700", Memory: "DDR4" }),
      RAM: part("RAM", { Type: "DDR5" }),
    });
    expect(result.map((c) => c.state)).toEqual(["conflict", "conflict"]);
  });
  it("does not certify parts with missing metadata", () => {
    const result = checkCompatibility({
      CPU: part("CPU", {}),
      Motherboard: part("Motherboard", {}),
      GPU: part("GPU", {}),
      "Power Supply": part("Power Supply", { Output: "750 W" }),
      Case: part("Case", {}),
    });
    expect(result.every((c) => c.state === "unknown")).toBe(true);
  });
  it("keeps placeholder sockets unknown even when both parts publish the same placeholder", () => {
    for (const value of ["N/A", "unknown", "Not specified", "—"])
      expect(
        checkCompatibility({
          CPU: part("CPU", { Socket: value }),
          Motherboard: part("Motherboard", { Socket: value }),
        })[0].state,
      ).toBe("unknown");
  });
  it("checks cooler socket boundaries and power headroom", () => {
    const result = checkCompatibility({
      CPU: part("CPU", { Socket: "AM5", Power: "105 W" }),
      GPU: part("GPU", { Power: "300 W" }),
      Cooler: part("Cooler", { Sockets: "AM5 / LGA1700" }),
      "Power Supply": part("Power Supply", { Output: "550 W" }),
    });
    expect(result.find((c) => c.label === "Cooler socket support")?.state).toBe(
      "pass",
    );
    expect(
      result.find((c) => c.label === "Estimated power headroom")?.state,
    ).toBe("conflict");
  });
  it("rejects a longer GPU than the documented case clearance", () => {
    const result = checkCompatibility({
      GPU: part("GPU", { Length: "350 mm" }),
      Case: part("Case", { "GPU clearance": "320 mm" }),
    });
    expect(result[0].state).toBe("conflict");
  });
  it("compares complete decimal dimensions and leaves invalid or ambiguous lengths unknown", () => {
    const clearance = part("Case", { "GPU clearance": "300.5 mm" });
    expect(
      checkCompatibility({
        GPU: part("GPU", { Length: "340.5 mm" }),
        Case: clearance,
      })[0].state,
    ).toBe("conflict");
    expect(
      checkCompatibility({
        GPU: part("GPU", { Length: "300.4 mm" }),
        Case: clearance,
      })[0].state,
    ).toBe("pass");
    for (const value of [
      "0 mm",
      "-340.5 mm",
      "340 x 120 mm",
      "340,5 mm",
      "unknown",
    ])
      expect(
        checkCompatibility({
          GPU: part("GPU", { Length: value }),
          Case: clearance,
        })[0].state,
      ).toBe("unknown");
  });
});
