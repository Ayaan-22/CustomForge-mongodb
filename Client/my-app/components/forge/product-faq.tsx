import { ChevronDown } from "lucide-react";
import type { Product } from "@/lib/types";

export function ProductFAQ({ product }: { product: Product }) {
  const questions = [
    [
      "How do I know this works with my setup?",
      "Use the PC builder to check available socket, memory, cooling, power and clearance metadata. Always verify BIOS support, connectors and fit with the manufacturer before purchasing.",
    ],
    [
      "What warranty is listed for this product?",
      product.warranty ||
        "No warranty information is listed. Confirm the terms before purchasing.",
    ],
    [
      "How can I follow my order?",
      "After checkout, open your order history to see payment confirmation, shipping status and your printable invoice.",
    ],
  ];
  return (
    <section className="forge-product-story">
      <p className="forge-eyebrow">BEFORE YOU UPGRADE</p>
      <h2>Good questions. Clear answers.</h2>
      {questions.map(([question, answer]) => (
        <details key={question} className="border-b border-border py-2">
          <summary className="flex min-h-11 items-center justify-between gap-4 text-sm font-medium">
            {question}
            <ChevronDown size={15} />
          </summary>
          <p className="pb-3 pt-2 text-xs leading-7 text-muted-foreground">
            {answer}
          </p>
        </details>
      ))}
      <p className="mt-4 text-xs text-muted-foreground">
        Store guidance. Community Q&A submissions are not available yet.
      </p>
    </section>
  );
}
