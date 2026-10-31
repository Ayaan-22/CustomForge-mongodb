import { z } from "zod";

export const shippingAddressSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(255),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2, "State/Province is required").max(120),
  postalCode: z.string().trim().min(2).max(32),
  country: z.string().trim().min(2).max(120),
  phoneNumber: z.string().min(7).max(32).optional(),
});

export const createOrderSchema = z
  .object({
    shippingAddress: shippingAddressSchema.optional(),
    shippingAddressId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    paymentMethod: z.enum(["stripe", "paypal", "cod"]).optional(),
    idempotencyKey: z.string().min(8).max(255),
  })
  .refine((data) => Boolean(data.shippingAddress || data.shippingAddressId), {
    message: "shippingAddress or shippingAddressId is required",
    path: ["shippingAddress"],
  });

