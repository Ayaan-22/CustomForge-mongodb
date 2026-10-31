"use client";
import { useRef, useState } from "react";
import { ProductImage as Image } from "@/components/forge/product-image";
import {
  ZoomIn,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Play,
  Rotate3D,
  Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PRODUCT_MEDIA } from "@/lib/product-media";
import type { Product } from "@/lib/types";

export function ProductMedia({ product }: { product: Product }) {
  const images = product.images.length
    ? product.images
    : ["/gaming-component.jpg"];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<"image" | "video" | "spin">("image");
  const [frame, setFrame] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const media = PRODUCT_MEDIA[product.sku];
  const step = (direction: number) => {
    setActive((index) => (index + direction + images.length) % images.length);
    setScale(1);
  };
  const imageKeys = (event: React.KeyboardEvent) => {
    if (mode !== "image" || images.length < 2) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }
  };
  return (
    <Dialog open={zoom} onOpenChange={setZoom}>
      <div className="forge-product-gallery">
        <div
          className="forge-gallery-stage"
          role="region"
          aria-label={`${product.name} media gallery`}
          tabIndex={mode === "image" && images.length > 1 ? 0 : undefined}
          onKeyDown={imageKeys}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            touchOrigin.current = touch
              ? { x: touch.clientX, y: touch.clientY }
              : null;
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0],
              origin = touchOrigin.current;
            touchOrigin.current = null;
            if (!touch || !origin || mode !== "image" || images.length < 2)
              return;
            const horizontal = touch.clientX - origin.x,
              vertical = touch.clientY - origin.y;
            if (
              Math.abs(horizontal) > 60 &&
              Math.abs(horizontal) > Math.abs(vertical) * 1.4
            )
              step(horizontal > 0 ? -1 : 1);
          }}
        >
          {mode === "video" && media?.video ? (
            <video
              src={media.video}
              poster={images[0]}
              controls
              playsInline
              preload="none"
              aria-label={`${product.name} product video`}
              onError={() => {
                setMediaError(true);
                setMode("image");
              }}
              className="h-full w-full object-contain"
            />
          ) : (
            <Image
              src={
                mode === "spin" && media?.spinFrames?.length
                  ? media.spinFrames[frame]
                  : images[active]
              }
              alt={
                mode === "spin"
                  ? `${product.name}, rotation frame ${frame + 1}`
                  : `${product.name}, view ${active + 1} of ${images.length}`
              }
              fill
              priority={active === 0 && mode === "image"}
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 90vw, 55vw"
              onError={
                mode === "spin"
                  ? () => {
                      setMediaError(true);
                      setMode("image");
                    }
                  : undefined
              }
            />
          )}
          {mode === "image" && (
            <>
              <span className="forge-gallery-count" aria-hidden="true">
                {String(active + 1).padStart(2, "0")} /{" "}
                {String(images.length).padStart(2, "0")}
              </span>
              <DialogTrigger asChild>
                <Button
                  className="forge-gallery-zoom"
                  variant="outline"
                  onClick={() => setScale(1)}
                  aria-label={`Zoom ${product.name}`}
                >
                  <ZoomIn size={16} /> Zoom
                </Button>
              </DialogTrigger>
            </>
          )}
        </div>
        <div className="forge-gallery-navigation">
          <Button
            variant="ghost"
            size="icon"
            disabled={images.length < 2 || mode !== "image"}
            onClick={() => step(-1)}
            aria-label="Previous gallery image"
          >
            <ChevronLeft />
          </Button>
          <p aria-live="polite" aria-atomic="true">
            {mode === "image"
              ? `Image ${active + 1} of ${images.length}`
              : mode === "video"
                ? "Product video"
                : `360° view · frame ${frame + 1}`}
          </p>
          <Button
            variant="ghost"
            size="icon"
            disabled={images.length < 2 || mode !== "image"}
            onClick={() => step(1)}
            aria-label="Next gallery image"
          >
            <ChevronRight />
          </Button>
        </div>
        <div
          className="forge-gallery-thumbs"
          role="group"
          aria-label="Choose product media"
        >
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => {
                setActive(index);
                setMode("image");
                setScale(1);
              }}
              aria-label={`View product image ${index + 1}`}
              aria-pressed={mode === "image" && index === active}
            >
              <Image src={src} alt="" fill sizes="78px" />
            </button>
          ))}
          {media?.video && (
            <Button
              variant="outline"
              aria-pressed={mode === "video"}
              onClick={() => {
                setMediaError(false);
                setMode("video");
              }}
            >
              <Play /> Video
            </Button>
          )}
          {!!media?.spinFrames?.length && (
            <Button
              variant="outline"
              aria-pressed={mode === "spin"}
              onClick={() => {
                setMediaError(false);
                setMode("spin");
              }}
            >
              <Rotate3D />
              360° view
            </Button>
          )}
        </div>
        {images.length > 1 && (
          <p className="forge-gallery-help">
            Use the arrows or swipe to explore. Focus the image and use your
            keyboard arrow keys.
          </p>
        )}
        {mediaError && (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            The configured media is unavailable. Browse the product images
            instead.
          </p>
        )}
        {mode === "spin" && !!media?.spinFrames?.length && (
          <label className="forge-gallery-rotation">
            Rotate the product
            <input
              type="range"
              min="0"
              max={media.spinFrames.length - 1}
              value={frame}
              aria-valuetext={`Frame ${frame + 1} of ${media.spinFrames.length}`}
              onChange={(event) => setFrame(Number(event.target.value))}
            />
          </label>
        )}
      </div>
      <DialogContent
        className="forge-gallery-dialog max-w-[95vw] sm:max-w-4xl"
        onKeyDown={imageKeys}
      >
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Enlarge the image, then scroll to inspect details. Arrow keys change
            images; Escape closes the gallery.
          </DialogDescription>
        </DialogHeader>
        <div
          className="forge-gallery-zoom-stage"
          tabIndex={0}
          aria-label="Enlarged product image; scroll to pan when zoomed"
        >
          <div
            className="relative min-h-full"
            style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
          >
            <Image
              src={images[active]}
              alt={`${product.name}, enlarged view ${active + 1} of ${images.length}`}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
        <div className="forge-gallery-zoom-controls">
          <Button
            variant="outline"
            size="icon"
            disabled={images.length === 1}
            onClick={() => step(-1)}
            aria-label="Previous product image"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale((value) => Math.max(1, value - 0.5))}
            disabled={scale <= 1}
            aria-label="Zoom out"
          >
            <Minus />
          </Button>
          <span aria-live="polite">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScale((value) => Math.min(3, value + 0.5))}
            disabled={scale >= 3}
            aria-label="Zoom in"
          >
            <Plus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={images.length === 1}
            onClick={() => step(1)}
            aria-label="Next product image"
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setScale(1)}
            disabled={scale === 1}
          >
            <Maximize size={15} />
            Fit
          </Button>
        </div>
        <p className="forge-gallery-help" aria-live="polite">
          Image {active + 1} of {images.length}
        </p>
      </DialogContent>
    </Dialog>
  );
}
