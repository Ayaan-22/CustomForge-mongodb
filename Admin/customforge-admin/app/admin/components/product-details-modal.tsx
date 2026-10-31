"use client";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { AdminProduct } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Star, Package, DollarSign, TrendingUp, Ruler, Image } from "lucide-react";
import "../forge-commerce.css";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: AdminProduct | null;
}

export function ProductDetailsModal({ isOpen, onClose, product }: ProductDetailsModalProps) {
  if (!isOpen || !product) return null;
  const discountAmount = (Number(product.originalPrice) * Number(product.discountPercentage)) / 100;
  const stockTone = product.stock === 0 ? "is-danger" : product.stock < 10 ? "is-warning" : "is-success";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="fc-modal fc-editor">
        <div className="fc-modal-header">
          <span className="fa-kicker">Catalogue / Product overview</span>
          <DialogTitle>Product details</DialogTitle>
          <DialogDescription>Review storefront information, pricing and inventory for this SKU.</DialogDescription>
        </div>
        <div className="fc-product-detail-hero">
          {product.images?.[0] ? <img src={product.images[0]} alt={product.name} /> : <span className="fc-no-image">
            <Package size={36} />
            <span>No product image</span>
          </span>}
          <div>
            <span className="fa-kicker">{product.category} / {product.brand}</span>
            <h2>{product.name}</h2>
            <p className="fc-sku">SKU / {product.sku}</p>
            <div className="fc-detail-price">
              <strong>${Number(product.finalPrice ?? 0).toFixed(2)}</strong>{product.discountPercentage > 0 && <del>${Number(product.originalPrice).toFixed(2)}</del>}</div>
          </div>
        </div>
        <div className="fc-detail-sections">
          <section>
            <h3>
              <Package size={16} />Inventory & visibility</h3>
            <dl className="fc-detail-list">
              <div>
                <dt>Stock</dt>
                <dd>
                  <span className={`fa-status ${stockTone}`}>{product.stock} units</span>
                </dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>{product.availability || "Unavailable"}</dd>
              </div>
              <div>
                <dt>Storefront visibility</dt>
                <dd>
                  <span className={`fa-status ${product.isActive ? "is-success" : "is-neutral"}`}>{product.isActive ? "Published" : "Hidden"}</span>
                </dd>
              </div>
              <div>
                <dt>Featured</dt>
                <dd>{product.isFeatured ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <DollarSign size={16} />Price breakdown</h3>
            <dl className="fc-detail-list">
              <div>
                <dt>Original price</dt>
                <dd>${Number(product.originalPrice).toFixed(2)}</dd>
              </div>
              <div>
                <dt>Discount</dt>
                <dd>{product.discountPercentage}%</dd>
              </div>
              <div>
                <dt>Discount amount</dt>
                <dd className="fc-cyan">−${discountAmount.toFixed(2)}</dd>
              </div>
              <div>
                <dt>Storefront price</dt>
                <dd>${Number(product.finalPrice ?? 0).toFixed(2)}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <TrendingUp size={16} />Sales & ratings</h3>
            <dl className="fc-detail-list">
              <div>
                <dt>Sales count</dt>
                <dd>{product.salesCount ?? 0}</dd>
              </div>
              <div>
                <dt>Average rating</dt>
                <dd className="flex items-center gap-1">
                  <Star size={13} className="fc-amber" />{product.ratings?.average ?? 0}</dd>
              </div>
              <div>
                <dt>Total reviews</dt>
                <dd>{product.ratings?.totalReviews ?? 0}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>
              <Ruler size={16} />Shipping & warranty</h3>
            <dl className="fc-detail-list">
              <div>
                <dt>Warranty</dt>
                <dd>{product.warranty || "Not specified"}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{product.weight != null ? `${product.weight} kg` : "Not specified"}</dd>
              </div>
              <div>
                <dt>Dimensions</dt>
                <dd>{product.dimensions ? `${product.dimensions.length ?? "—"} × ${product.dimensions.width ?? "—"} × ${product.dimensions.height ?? "—"} cm` : "Not specified"}</dd>
              </div>
            </dl>
          </section>
          {product.description && <section className="fc-full-width">
            <h3>Description</h3>
            <p className="whitespace-pre-line">{product.description}</p>
          </section>}
          {product.specifications?.length > 0 && <section className="fc-full-width">
            <h3>Technical specifications</h3>
            <dl className="fc-detail-list">{product.specifications.map(({ key, value }, idx) =>
              <div key={`${key}-${idx}`}>
                <dt>{key.replace(/_/g, " ")}</dt>
                <dd>{String(value)}</dd>
              </div>)}</dl>
          </section>}
          {product.features?.length > 0 && <section className="fc-full-width">
            <h3>Product highlights</h3>
            <ul>{product.features.map((feature, idx) =>
              <li key={idx}>{feature}</li>)}</ul>
          </section>}
          {product.images?.length > 0 && <section className="fc-full-width">
            <h3>
              <Image size={16} />Product media · {product.images.length} images</h3>
            <div className="fc-detail-thumbnails">{product.images.map((image, idx) =>
              <img key={idx} src={image || "/placeholder.svg"} alt={`${product.name}, image ${idx + 1}`} loading="lazy" />)}</div>
          </section>}
        </div>
        <div className="fc-modal-footer">
          <Button onClick={onClose}>Close details</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
