/**
 * Admin API shapes (subset used by dashboard modals).
 */
export type Page<T> = {data: T[]; count: number; page: number; pages: number};
export type AdminProduct = {
  sku: string; description: string; specifications: Array<{key: string; value: string}>; features: string[]; warranty?: string; weight?: number; dimensions?: {length?: number; width?: number; height?: number}; salesCount: number; availability: string;
  id: string; name: string; category: string; brand: string; images: string[];
  originalPrice: number; finalPrice: number; discountPercentage: number; stock: number;
  isActive: boolean; isFeatured: boolean; ratings: {average: number; totalReviews: number};
};
export type AdminProductPayload = Pick<AdminProduct,
  'name' | 'sku' | 'category' | 'brand' | 'description' | 'originalPrice' |
  'discountPercentage' | 'stock' | 'images' | 'specifications' | 'features' |
  'warranty' | 'weight' | 'dimensions' | 'isActive' | 'isFeatured'
> & { imageFiles?: File[] };
export type AdminUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: AdminUserRow['role'];
  active?: boolean;
};
export type AdminUserRow = {
  id: string; name: string; email: string; role: string; phone?: string; avatar?: string;
  active: boolean; is_email_verified: boolean; two_factor_enabled: boolean; created_at: string;
};
export type AdminOrder = {
  id: string; user_id: string; status: string; is_paid: boolean; total_price: number;
  items_price: number; tax_price: number; shipping_price: number; discount_amount: number;
  payment_method: string; created_at: string; return_status: string;
  payment_result?: { reconciliationRequired?: boolean; [key: string]: unknown };
  shipping_address: {fullName?: string; address?: string; city?: string; state?: string; postalCode?: string; country?: string; phoneNumber?: string};
  items: Array<{id: string; product_id: string; name: string; price: number; quantity: number}>;
};

export type AdminUserAddress = {
  id: string;
  userId: string;
  label: string;
  fullName: string;
  line1?: string;
  line2?: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
};

export type AdminUserPaymentMethod = {
  id: string;
  userId: string;
  type: string;
  cardHolderName: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  billingAddress: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  isDefault: boolean;
};

export type AdminUserDetail = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  addresses?: AdminUserAddress[];
  paymentMethods?: AdminUserPaymentMethod[];
  [key: string]: unknown;
};
