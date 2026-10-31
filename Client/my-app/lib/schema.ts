import { z } from "zod";

export const EntityIdSchema = z.union([z.guid(), z.string().regex(/^[a-f\d]{24}$/i)]);

// ========================
// Core Enums & Literals
// ========================

export const ROLES = ["user", "admin"] as const;
export const ORDER_STATUSES = [
  "pending",
  "paid",
  "payment_review",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export const PAYMENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "succeeded",
  "processing",
  "canceled",
  "failed",
] as const;
export const AVAILABILITY_STATUSES = [
  "In Stock",
  "Out of Stock",
  "Preorder",
] as const;
export const RETURN_STATUSES = [
  "none",
  "requested",
  "approved",
  "rejected",
  "completed",
] as const;
export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;

// ========================
// User Schema
// ========================

export const UserSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(ROLES),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  isEmailVerified: z.boolean().default(false),
  twoFactorEnabled: z.boolean().default(false),
  active: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

// ========================
// Address Schema
// ========================

export const AddressSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  label: z.enum(ADDRESS_LABELS),
  fullName: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default("United States"),
  phoneNumber: z.string().min(1),
  isDefault: z.boolean().default(false),
});

export type Address = z.infer<typeof AddressSchema>;

// ========================
// Payment Method Schema
// ========================

export const PaymentMethodSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  type: z.literal("card"),
  cardHolderName: z.string().min(1),
  cardNumber: z.string().regex(/^\d{16}$/),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(2024),
  billingAddress: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().default(false),
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

// ========================
// Product Schema
// ========================

export const SpecificationSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export const RatingsSchema = z.object({
  average: z.number().min(0).max(5),
  totalReviews: z.number().min(0),
});

export const ProductSchema = z.object({
  id: EntityIdSchema,
  name: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().min(1),
  specifications: SpecificationSchema.array().optional(),
  originalPrice: z.number().min(0),
  discountPercentage: z.number().min(0).max(100).default(0),
  finalPrice: z.number().min(0),
  stock: z.number().min(0),
  availability: z.enum(AVAILABILITY_STATUSES),
  images: z.string().url().array().min(1),
  description: z.string().min(1),
  ratings: RatingsSchema,
  features: z.string().array().optional(),
  warranty: z.string().default("1 year limited warranty"),
  weight: z.number().optional(),
  dimensions: z
    .object({ length: z.number(), width: z.number(), height: z.number() })
    .optional(),
  sku: z.string().min(1),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  salesCount: z.number().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Product = z.infer<typeof ProductSchema>;

// ========================
// Review Schema
// ========================

export const ReviewSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
  userId: EntityIdSchema,
  rating: z.number().min(1).max(5),
  title: z.string().min(1),
  comment: z.string().min(1),
  verifiedPurchase: z.boolean().default(false),
  helpfulVotes: z.number().min(0).default(0),
  reported: z.boolean().default(false),
  reportReason: z.string().optional(),
  media: z.string().url().array().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Review = z.infer<typeof ReviewSchema>;

// ========================
// Coupon Schema
// ========================

export const CouponSchema = z.object({
  id: EntityIdSchema,
  code: z.string().min(1),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0),
  minPurchase: z.number().min(0).default(0),
  maxDiscount: z.number().optional(),
  validFrom: z.string().datetime(),
  validTo: z.string().datetime(),
  isActive: z.boolean().default(true),
  usageLimit: z.number().optional(),
  timesUsed: z.number().min(0).default(0),
  perUserLimit: z.number().optional(),
  applicableProducts: EntityIdSchema.array().optional(),
  excludedProducts: EntityIdSchema.array().optional(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Coupon = z.infer<typeof CouponSchema>;

// ========================
// Cart Schema
// ========================

export const CartItemSchema = z.object({
  id: EntityIdSchema,
  cartId: EntityIdSchema,
  productId: EntityIdSchema,
  quantity: z.number().min(1),
  addedAt: z.string().datetime(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  couponId: EntityIdSchema.optional(),
  items: CartItemSchema.array(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Cart = z.infer<typeof CartSchema>;

// ========================
// Order Schema
// ========================

export const OrderItemSchema = z.object({
  id: EntityIdSchema,
  orderId: EntityIdSchema,
  productId: EntityIdSchema,
  name: z.string(),
  image: z.string().url(),
  price: z.number().min(0),
  quantity: z.number().min(1),
  priceSnapshot: z.number().min(0),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: EntityIdSchema,
  userId: EntityIdSchema,
  shippingAddress: z.record(z.string(), z.unknown()),
  paymentMethod: z.string(),
  paymentResult: z.record(z.string(), z.unknown()).optional(),
  paymentExpiresAt: z.string().datetime().optional(),
  itemsPrice: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  shippingPrice: z.number().min(0),
  taxPrice: z.number().min(0),
  totalPrice: z.number().min(0),
  couponApplied: z.record(z.string(), z.unknown()).optional(),
  isPaid: z.boolean().default(false),
  paidAt: z.string().datetime().optional(),
  isDelivered: z.boolean().default(false),
  deliveredAt: z.string().datetime().optional(),
  status: z.enum(ORDER_STATUSES),
  notes: z.string().optional(),
  returnRequestedAt: z.string().datetime().optional(),
  returnStatus: z.enum(RETURN_STATUSES).default("none"),
  items: OrderItemSchema.array(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Order = z.infer<typeof OrderSchema>;

// ========================
// Wishlist Schema
// ========================

export const WishlistItemSchema = z.object({
  id: EntityIdSchema,
  productId: EntityIdSchema,
});

export type WishlistItem = z.infer<typeof WishlistItemSchema>;
