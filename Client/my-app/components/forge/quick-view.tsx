"use client";
import { Eye, ArrowUpRight, ShoppingBag } from "lucide-react";
import { ProductImage as Image } from "@/components/forge/product-image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import { announceCartAddition } from "./mini-cart";

export function QuickView({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const { addToCart, isPending } = useCart();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="forge-quick-view"
          aria-label={`Quick view ${product.name}`}
        >
          <Eye size={13} />
          Quick view
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            {product.brand} / {product.category}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={product.images[0] || "/gaming-component.jpg"}
              alt={product.name}
              fill
              sizes="320px"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center gap-4">
            <p className="text-2xl font-bold">
              {formatPrice(product.finalPrice ?? product.originalPrice)}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-4">
              {product.description}
            </p>
            <span className="text-xs text-primary">{product.availability}</span>
            <Button
              disabled={
                isPending(product.id) || product.availability === "Out of Stock"
              }
              onClick={async () => {
                try {
                  await addToCart(product);
                  setOpen(false);
                  setTimeout(announceCartAddition, 100);
                } catch {
                  /* Cart hook displays the error. */
                }
              }}
            >
              <ShoppingBag />
              {isPending(product.id) ? "Adding…" : "Add to cart"}
            </Button>
            <Button asChild variant="outline" onClick={() => setOpen(false)}>
              <Link href={`/products/${product.id}`}>
                View full details <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
