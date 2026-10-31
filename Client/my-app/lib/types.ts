export type StockStatus = "in-stock" | "out-of-stock" | "preorder";

export interface Rating {
  average: number; // 0-5
  count: number;
}

export interface Review {
  isActive?: boolean;
  id: string;
  userId?: string;
  productId?: string;
  userName?: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  gameDetails?: Record<string, unknown> | null;
  pcDetails?: Record<string, unknown> | null;
  id: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  originalPrice: number;
  discountPercentage?: number;
  finalPrice?: number;
  stock?: number;
  availability: "In Stock" | "Out of Stock" | "Preorder";
  warranty?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  salesCount?: number;
  ratings: { average: number; totalReviews: number };
  images: string[];
  description: string;
  specifications?: Array<{ key: string; value: string }>;
  features?: string[];
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
}

export type Role = "user" | "admin";

export interface Address {
  id: string;
  userId?: string;
  label?: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault?: boolean;
  // Legacy fields for backward compatibility
  line1?: string;
  line2?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  phone?: string;
  address?: Address;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  twoFactorEnabled?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Cart {
  id?: string;
  items: CartItem[];
  subtotal?: number;
  discount?: number;
  total?: number;
  couponCode?: string | null;
  updatedAt?: string;
}

export type WishlistItem = import("./schema").WishlistItem;

export interface OrderItem {
  productId: string;
  name?: string;
  price?: number;
  quantity: number;
}

export type OrderStatus =
  | "processing"
  | "refunded"
  | "pending"
  | "paid"
  | "payment_review"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Order {
  isPaid: boolean;
  paymentMethod?: "stripe" | "paypal" | "cod";
  paymentResult?: { reconciliationRequired?: boolean; [key: string]: unknown };
  returnStatus?: string;
  id: string;
  userId: string;
  items: OrderItem[];
  address?: Address;
  status: OrderStatus;
  subtotal?: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  total?: number;
  paymentIntentId?: string;
  paymentExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "succeeded"
    | "processing"
    | "canceled"
    | "failed";
}

export interface PaymentMethod {
  id: string;
  type: "card";
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
  createdAt?: string;
}
