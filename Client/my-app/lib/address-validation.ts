import type { Address } from "./types";

// Saved addresses created by older forms may lack fields required by checkout.
export function missingShippingFields(address: Partial<Address>): string[] {
  const fields = [
    ["fullName", "Full name", 2], ["address", "Street address", 5],
    ["city", "City", 2], ["state", "State/Province", 2],
    ["postalCode", "Postal code", 2], ["country", "Country", 2],
  ] as const;
  return fields.filter(([key, , minimum]) =>
    typeof address[key] !== "string" || address[key]!.trim().length < minimum
  ).map(([, label]) => label);
}
