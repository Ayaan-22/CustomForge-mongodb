"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Eye, Edit2, Trash2, EyeOff, Package } from "lucide-react";
import type { AdminProduct } from "@/types/admin";
import { isLowStock } from "@/lib/commerce-policy";
import "../forge-commerce.css";

interface ProductCardProps {
  product: AdminProduct;
  onView: (product: AdminProduct) => void;
  onEdit: (product: AdminProduct) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string) => void;
}

export function ProductCard({ product, onView, onEdit, onDelete, onToggleVisibility }: ProductCardProps) {
  const lowStock = isLowStock(product.stock);
  const stockTone = product.stock === 0 ? "is-danger" : lowStock ? "is-warning" : "is-success";

  return (
    <Card className="fc-product-card">
      <button className="fc-product-stage" onClick={() => onView(product)} aria-label={`View ${product.name}`}>
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} loading="lazy" />
        ) : (
          <span className="fc-no-image">
            <Package aria-hidden="true" />
            <span>No image uploaded</span>
          </span>
        )}
        <span className={`fa-status fc-visibility ${product.isActive ? "is-success" : "is-neutral"}`}>
          {product.isActive ? "Published" : "Hidden"}
        </span>
        {product.isFeatured && <span className="fc-featured">
          <Star size={12} aria-hidden="true" /> Featured</span>}
      </button>
      <div className="fc-product-body">
        <div className="fc-product-category">
          <span>{product.category}</span>
          <span>{product.brand}</span>
        </div>
        <h2 title={product.name}>{product.name}</h2>
        <p className="fc-sku">SKU / {product.sku}</p>
        <div className="fc-product-price">
          <strong>${Number(product.finalPrice).toFixed(2)}</strong>
          {product.discountPercentage > 0 && <>
            <del>${Number(product.originalPrice).toFixed(2)}</del>
            <span className="fc-discount">−{product.discountPercentage}%</span>
          </>}
        </div>
        <div className="fc-product-health">
          <span className={`fa-status ${stockTone}`}>
            <Package size={13} aria-hidden="true" />{product.stock} units{lowStock ? " · Low stock" : product.stock === 0 ? " · Sold out" : ""}</span>
          {product.ratings && <span className="fc-rating">
            <Star size={13} aria-hidden="true" />{product.ratings.average}<span>({product.ratings.totalReviews})</span>
          </span>}
        </div>
        <div className="fc-card-actions">
          <Button variant="outline" onClick={() => onView(product)} className="fc-view-button">
            <Eye size={15} />Details</Button>
          <Button variant="outline" size="icon" onClick={() => onEdit(product)} aria-label={`Edit ${product.name}`} title="Edit product">
            <Edit2 size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onToggleVisibility(product.id)} aria-label={`${product.isActive ? "Hide" : "Publish"} ${product.name}`} title={product.isActive ? "Hide product" : "Publish product"}>{product.isActive ? <Eye size={16} /> : <EyeOff size={16} />}</Button>
          <Button variant="outline" size="icon" onClick={() => onDelete(product.id)} aria-label={`Delete ${product.name}`} title="Delete product" className="fc-danger-action">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
