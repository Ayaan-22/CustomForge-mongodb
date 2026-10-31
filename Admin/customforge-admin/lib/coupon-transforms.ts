/**
 * Data transformation utilities for coupon management
 * Handles field name conversions and discount type mapping between frontend and backend
 */

// Frontend Coupon Interface (camelCase)
export interface Coupon {
  id?: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  validFrom: string | null;
  validTo: string | null;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  isActive: boolean;
  usageLimit?: number | null;
  timesUsed?: number | null;
  perUserLimit?: number;
  applicableProducts?: string[];
  excludedProducts?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Backend Coupon Payload (camelCase - matching adminController.js expectations)
export interface CouponPayload {
  id?: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  validFrom: string | null;
  validTo: string | null;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  isActive: boolean;
  usageLimit?: number | null;
  timesUsed?: number | null;
  perUserLimit?: number;
  applicableProducts?: string[];
  excludedProducts?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

type CouponFieldAliases = {
  discountType: 'discount_type';
  discountValue: 'discount_value';
  validFrom: 'valid_from';
  validTo: 'valid_to';
  minPurchase: 'min_purchase';
  maxDiscount: 'max_discount';
  isActive: 'is_active';
  usageLimit: 'usage_limit';
  timesUsed: 'times_used';
  perUserLimit: 'per_user_limit';
  applicableProducts: 'applicable_products';
  excludedProducts: 'excluded_products';
  createdAt: 'created_at';
  updatedAt: 'updated_at';
};

type CouponRow = {
  [K in keyof CouponPayload as K extends keyof CouponFieldAliases ? CouponFieldAliases[K] : K]: CouponPayload[K];
};

/**
 * Map frontend discount type to backend format
 * @param type Frontend discount type ("percentage" | "fixed")
 * @returns Backend discount type ("percent" | "fixed")
 */
export function mapDiscountTypeToBackend(
  type: "percentage" | "fixed"
): "percent" | "fixed" {
  return type === "percentage" ? "percent" : "fixed";
}

/**
 * Map backend discount type to frontend format
 * @param type Backend discount type ("percent" | "fixed")
 * @returns Frontend discount type ("percentage" | "fixed")
 */
export function mapDiscountTypeToFrontend(
  type: "percent" | "fixed"
): "percentage" | "fixed" {
  return type === "percent" ? "percentage" : "fixed";
}

/**
 * Validate and ensure ISO 8601 date format
 * @param date Date string to validate
 * @returns ISO 8601 formatted date string
 * @throws Error if date is invalid
 */
export function validateDateFormat(date: string): string {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date format: ${date}`);
  }
  return dateObj.toISOString();
}

/**
 * Transform frontend coupon to backend payload
 * @param coupon Frontend coupon object
 * @returns Backend coupon payload
 */
export function transformCouponToBackend(coupon: Coupon): CouponPayload {
  // Create a shallow copy to avoid mutating the original
  const payload: CouponPayload = {
    ...coupon,
    discountType: coupon.discountType
      ? mapDiscountTypeToBackend(coupon.discountType)
      : coupon.discountType,
  };

  // Validate date formats
  if (payload.validFrom) {
    payload.validFrom = validateDateFormat(payload.validFrom);
  }
  if (payload.validTo) {
    payload.validTo = validateDateFormat(payload.validTo);
  }

  return payload;
}

/**
 * Transform backend coupon to frontend format
 * @param payload Backend coupon payload (or raw DB response which might be snake_case)
 * @returns Frontend coupon object
 */
export function transformCouponToFrontend(payload: CouponPayload | CouponRow): Coupon {
  // Accept either controller fields or raw database fields, preferring camelCase.
  const fields = payload as Partial<CouponPayload & CouponRow>;
  const get = <K extends keyof CouponFieldAliases>(camel: K, snake: CouponFieldAliases[K]): CouponPayload[K] =>
    (fields[camel] !== undefined ? fields[camel] : fields[snake]) as CouponPayload[K];

  const rawType = get("discountType", "discount_type");
  return {
    id: payload.id,
    code: payload.code,
    discountType: rawType ? mapDiscountTypeToFrontend(rawType) : "fixed",
    discountValue: get("discountValue", "discount_value"),
    validFrom: get("validFrom", "valid_from"),
    validTo: get("validTo", "valid_to"),
    minPurchase: get("minPurchase", "min_purchase"),
    maxDiscount: get("maxDiscount", "max_discount"),
    isActive: get("isActive", "is_active"),
    usageLimit: get("usageLimit", "usage_limit"),
    timesUsed: get("timesUsed", "times_used"),
    perUserLimit: get("perUserLimit", "per_user_limit"),
    applicableProducts: get("applicableProducts", "applicable_products"),
    excludedProducts: get("excludedProducts", "excluded_products"),
    description: payload.description,
    createdAt: get("createdAt", "created_at"),
    updatedAt: get("updatedAt", "updated_at"),
  };
}
