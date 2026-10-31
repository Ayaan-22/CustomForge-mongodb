import type { Address } from "./types";
import type { AddressPayload } from "@/services/user-service";
import { missingShippingFields } from "./address-validation";

export const ADDRESS_FORM_FIELDS = [
  "fullName",
  "phoneNumber",
  "line1",
  "line2",
  "city",
  "state",
  "postalCode",
  "country",
] as const;
export type AddressFormField = (typeof ADDRESS_FORM_FIELDS)[number];
export type AddressForm = Record<AddressFormField, string>;
export type AddressFormErrors = Partial<Record<AddressFormField, string>>;

export function emptyAddressForm(): AddressForm {
  return {
    fullName: "",
    phoneNumber: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  };
}

/** Never reconstruct a canonical address from the API's lossy legacy split. */
export function addressToForm(address: Partial<Address>): AddressForm {
  const canonical =
    typeof address.address === "string" && address.address.length > 0;
  return {
    fullName: address.fullName ?? "",
    phoneNumber: address.phoneNumber ?? "",
    line1: canonical ? address.address! : (address.line1 ?? ""),
    line2: canonical ? "" : (address.line2 ?? ""),
    city: address.city ?? "",
    state: address.state ?? "",
    postalCode: address.postalCode ?? "",
    country: address.country ?? "",
  };
}

/** Defaults and address labels remain server-owned; editing never changes them. */
export function addressFormPayload(form: AddressForm): AddressPayload {
  return {
    fullName: form.fullName,
    phoneNumber: form.phoneNumber,
    address: form.line2 ? `${form.line1}, ${form.line2}` : form.line1,
    city: form.city,
    state: form.state,
    postalCode: form.postalCode,
    country: form.country,
  };
}

export function validateAddressForm(form: AddressForm): AddressFormErrors {
  const payload = addressFormPayload(form);
  const missing = new Set(missingShippingFields(payload));
  const errors: AddressFormErrors = {};
  const required = [
    ["fullName", "Full name", 2, 120],
    ["line1", "Street address", 5, 255],
    ["city", "City", 2, 120],
    ["state", "State/Province", 2, 120],
    ["postalCode", "Postal code", 2, 32],
    ["country", "Country", 2, 120],
  ] as const;
  for (const [field, label, minimum, maximum] of required) {
    const value = field === "line1" ? payload.address : form[field];
    if (field === "line1" && !form.line1.trim())
      errors[field] = "Enter your street address.";
    else if (missing.has(label))
      errors[field] =
        `Enter ${label.toLowerCase()} with at least ${minimum} characters.`;
    else if (value.trim().length > maximum)
      errors[field] =
        field === "line1"
          ? "The complete street address, including extra details, must be 255 characters or fewer."
          : `${label} must be ${maximum} characters or fewer.`;
  }
  const phone = form.phoneNumber.trim();
  if (phone.length < 7 || phone.length > 32)
    errors.phoneNumber = "Enter a phone number with 7–32 characters.";
  return errors;
}
