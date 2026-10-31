import { z } from "zod";
import { shippingAddressSchema } from "./orderSchemas.js";

export const addressSchema = shippingAddressSchema.extend({
  phoneNumber: z.string().trim().min(7).max(32),
  label: z.string().trim().max(100).optional(),
  isDefault: z.boolean().optional(),
});
export const updateAddressSchema = addressSchema.partial();
