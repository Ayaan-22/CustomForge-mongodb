"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ProductGallery({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const active = images[index] || "/product-image-large.jpg";

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted">
        <AnimatePresence mode="wait">
          <motion.img
            key={active}
            src={active}
            alt="Product image"
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
            initial={{ opacity: 0.2, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.2, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          />
        </AnimatePresence>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {images.slice(0, 5).map((src, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`aspect-square overflow-hidden rounded-md border ${
              i === index ? "border-primary" : "border-border"
            }`}
            aria-label={`View image ${i + 1}`}
          >
            <img
              src={src || "/placeholder.svg"}
              alt={`Thumbnail ${i + 1}`}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
