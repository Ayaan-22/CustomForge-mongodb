import { ArrowRight, Cpu, ScanLine, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { ProductImage } from "./product-image";
import { getProductHighlights } from "@/lib/product-highlights";
import {
  getDecisionNote,
  getProductProfile,
  getProductStory,
} from "@/lib/product-depth";
import type { Product } from "@/lib/types";

export function ProductStory({ product }: { product: Product }) {
  const story = getProductStory(product);
  const highlights = getProductHighlights(product);
  const profile = getProductProfile(product);
  const features = product.features?.filter((feature) => feature.trim()) ?? [];
  return (
    <section className="forge-depth-story" id="features">
      <div className="forge-depth-intro">
        <div>
          <p className="forge-eyebrow">
            <ScanLine size={14} /> EXPLORE THE UPGRADE
          </p>
          <h2>{story.title}</h2>
          <p>{story.intro}</p>
        </div>
        <div className="forge-depth-art">
          <span aria-hidden="true" className="forge-depth-grid" />
          <ProductImage
            src={
              product.images[1] || product.images[0] || "/gaming-component.jpg"
            }
            alt={`${product.name}, product detail`}
            fill
            sizes="(max-width: 767px) 90vw, 30vw"
          />
          <span className="forge-depth-art-label">
            {product.category} / {product.brand}
          </span>
        </div>
      </div>
      <div className="forge-depth-description">
        <p className="forge-eyebrow">FROM THE PRODUCT LISTING</p>
        <p>
          {product.description ||
            "The product description has not been published yet."}
        </p>
      </div>
      {highlights.length > 0 && (
        <div className="forge-decision-grid">
          {highlights.map((highlight, index) => (
            <article key={highlight.label}>
              <span className="forge-decision-number" aria-hidden="true">
                0{index + 1}
              </span>
              <p className="forge-eyebrow">{highlight.label}</p>
              <h3>{highlight.value}</h3>
              <p>{getDecisionNote(highlight.label, profile)}</p>
            </article>
          ))}
        </div>
      )}
      {features.length > 0 && (
        <div className="forge-depth-features">
          <h3>
            <Cpu size={17} /> Listed features
          </h3>
          <ul>
            {features.map((feature, index) => (
              <li key={`${feature}-${index}`}>
                <span aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ProductSetupGuide({ product }: { product: Product }) {
  return (
    <div className="forge-setup-guide">
      <Wrench size={21} />
      <div>
        <h3>Check your setup before you buy.</h3>
        <p>{getProductStory(product).setup}</p>
        <Link href="/compare" className="forge-text-link">
          Compare published specifications <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}

export function ProductSupport({ product }: { product: Product }) {
  const warranty =
    product.warranty?.trim() ||
    (typeof product.pcDetails?.warranty_period === "string"
      ? product.pcDetails.warranty_period.trim()
      : "");
  return (
    <section className="forge-product-story forge-product-support" id="support">
      <p className="forge-eyebrow">BUY WITH THE DETAILS IN VIEW</p>
      <h2>Warranty &amp; order information.</h2>
      <div className="forge-support-grid">
        <div>
          <ShieldCheck size={20} />
          <h3>Listed warranty</h3>
          <strong>{warranty || "Warranty not listed"}</strong>
          <p>
            {warranty
              ? "This is the warranty text supplied with the listing. Confirm coverage, exclusions and the claim process before purchasing."
              : "Coverage and terms have not been published for this product. Confirm the warranty with the seller before purchasing."}
          </p>
        </div>
        <div>
          <ScanLine size={20} />
          <h3>Your order, in one place</h3>
          <p>
            After checkout, your account shows the order status and printable
            invoice. Delivery estimates and return terms are not specified in
            this product listing.
          </p>
          <Link href="/orders" className="forge-text-link">
            View your orders <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
