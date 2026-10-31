import type {AdminProduct} from '@/types/admin';
export type ProductRow = Omit<AdminProduct, 'originalPrice' | 'finalPrice' | 'discountPercentage' | 'isActive' | 'isFeatured' | 'salesCount' | 'specifications' | 'ratings'> & {
  original_price: number; final_price: number; discount_percentage: number; is_active: boolean; is_featured: boolean; sales_count: number;
  specifications: Record<string, string> | Array<{key: string; value: string}> | null;
  ratings: {average?: number; totalReviews?: number; total_reviews?: number} | null;
};
export function productFromRow(row: ProductRow): AdminProduct {
  return {...row, originalPrice: Number(row.original_price), finalPrice: Number(row.final_price), discountPercentage: Number(row.discount_percentage),
    isActive: row.is_active, isFeatured: row.is_featured, salesCount: row.sales_count,
    specifications: Array.isArray(row.specifications) ? row.specifications : Object.entries(row.specifications ?? {}).map(([key,value]) => ({key,value:String(value)})),
    features: row.features ?? [], images: row.images ?? [],
    ratings: {average: row.ratings?.average ?? 0, totalReviews: row.ratings?.totalReviews ?? row.ratings?.total_reviews ?? 0}};
}
