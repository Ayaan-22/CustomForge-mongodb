// Optional richer media. Key by the real product SKU, never by a demo product ID.
// Files live in public/media/products/<sku>/. Empty entries show the real gallery.
export const PRODUCT_MEDIA: Record<
  string,
  { video?: string; spinFrames?: string[] }
> = {};
