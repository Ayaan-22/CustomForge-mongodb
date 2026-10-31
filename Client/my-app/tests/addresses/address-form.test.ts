import { describe, expect, it } from "vitest";
import {
  addressToForm,
  addressFormPayload,
  emptyAddressForm,
  validateAddressForm,
} from "@/lib/address-form";
import type { Address } from "@/lib/types";

const saved: Address = {
  id: "address",
  fullName: "Test member",
  phoneNumber: "+92 300 1234567",
  address: "Suite 4, Tower B, 18 Example Street, Block 8",
  line1: "Suite 4",
  line2: "Tower B",
  city: "Karachi",
  state: "Sindh",
  postalCode: "12345",
  country: "Pakistan",
  isDefault: true,
  label: "Work",
};

describe("address editing preserves canonical data", () => {
  it("round-trips every segment even when the API also supplies a truncated legacy split", () => {
    const form = addressToForm(saved);
    expect(form.line1).toBe(saved.address);
    expect(form.line2).toBe("");
    expect(addressFormPayload(form).address).toBe(saved.address);
  });
  it("preserves internal line breaks and punctuation instead of guessing street components", () => {
    const address = "Flat 2, East Wing\n18 Example Road, Near the park";
    expect(
      addressFormPayload(addressToForm({ ...saved, address })).address,
    ).toBe(address);
  });
  it("uses legacy lines only if a canonical address is missing", () => {
    const form = addressToForm({
      ...saved,
      address: "",
      line1: "18 Example Street",
      line2: "Suite 4, Tower B",
    });
    expect(form.line2).toBe("Suite 4, Tower B");
    expect(addressFormPayload(form).address).toBe(
      "18 Example Street, Suite 4, Tower B",
    );
  });
  it("does not mutate the saved address or transmit default/label changes during an edit", () => {
    const original = { ...saved };
    const form = addressToForm(saved);
    form.city = "Lahore";
    expect(saved).toEqual(original);
    const payload = addressFormPayload(form);
    expect(payload).not.toHaveProperty("isDefault");
    expect(payload).not.toHaveProperty("label");
  });
  it("accepts complete international addresses and requires the phone used by the address API", () => {
    expect(validateAddressForm(addressToForm(saved))).toEqual({});
    expect(
      validateAddressForm({ ...addressToForm(saved), phoneNumber: "" })
        .phoneNumber,
    ).toContain("7–32");
    expect(
      validateAddressForm({ ...addressToForm(saved), phoneNumber: "12" })
        .phoneNumber,
    ).toBeTruthy();
  });
  it("reports all incomplete checkout fields without stripping a legacy draft", () => {
    const form = emptyAddressForm();
    expect(Object.keys(validateAddressForm(form))).toEqual([
      "fullName",
      "line1",
      "city",
      "state",
      "postalCode",
      "country",
      "phoneNumber",
    ]);
    expect(
      validateAddressForm({ ...addressToForm(saved), state: " " }).state,
    ).toBeTruthy();
    expect(
      validateAddressForm({
        ...addressToForm(saved),
        line1: "",
        line2: "Tower B",
      }).line1,
    ).toBeTruthy();
  });
  it("validates the combined street-address limit without silently truncating either line", () => {
    const form = {
      ...addressToForm(saved),
      line1: "a".repeat(250),
      line2: "Suite 4",
    };
    expect(validateAddressForm(form).line1).toContain("255");
    expect(addressFormPayload(form).address).toBe(
      `${"a".repeat(250)}, Suite 4`,
    );
    expect(
      validateAddressForm({ ...form, line1: "a".repeat(246) }).line1,
    ).toBeUndefined();
  });
});
