import { describe, expect, it } from "vitest";
import { missingShippingFields } from "@/lib/address-validation";

const address = { fullName: "Test Customer", address: "18 Example Street", city: "city",
  state: "state", postalCode: "12345", country: "country" };

describe("checkout address preflight", () => {
  it.each([undefined, "", "  "])("identifies a legacy address missing state: %s", state => {
    expect(missingShippingFields({ ...address, state })).toEqual(["State/Province"]);
  });
  it("accepts a complete address after repair", () => {
    expect(missingShippingFields(address)).toEqual([]);
  });
  it("reports all missing fields instead of failing one at a time during order placement", () => {
    expect(missingShippingFields({ ...address, fullName: "", postalCode: "", state: "" }))
      .toEqual(["Full name", "State/Province", "Postal code"]);
  });
});
