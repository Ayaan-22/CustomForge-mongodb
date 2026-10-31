"use client";
import { useRef } from "react";
import { Download, Printer } from "lucide-react";
import { Brand } from "./brand";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";

const standaloneStyles = `body{font:14px/1.6 Arial,sans-serif;max-width:850px;margin:40px auto;padding:30px;color:#142335}.forge-invoice header,.forge-invoice-meta{display:flex;justify-content:space-between;gap:25px}.forge-invoice header{border-bottom:3px solid #087b6d;padding-bottom:20px}.forge-brand{display:flex;align-items:center;gap:10px;font-size:25px;font-weight:800}.forge-mark,.text-primary{color:#087b6d}.forge-wordmark-dot{display:none}h2{font-size:36px;margin:0}h3{font-size:14px;margin-top:30px}p{margin:5px 0}.forge-invoice-meta{padding:20px 0}.forge-invoice-meta>div{max-width:50%}table{width:100%;border-collapse:collapse;margin:25px 0}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #ccd4dc}th{font-size:11px;color:#087b6d}.forge-invoice-totals{margin-left:auto;width:45%}.forge-invoice-totals>div{display:flex;justify-content:space-between;padding:8px}.forge-invoice-totals>div:last-child{border-top:2px solid #087b6d;font-size:20px;font-weight:bold}.forge-invoice-note{font-size:12px;color:#526274;border-top:1px solid #ccd4dc;padding-top:20px;margin-top:40px}@media print{@page{size:A4;margin:18mm}body{margin:0;padding:0}tr{break-inside:avoid}}`;

export function Invoice({ order }: { order: Order }) {
  const ref = useRef<HTMLElement>(null);
  function download() {
    if (!ref.current) return;
    // React has escaped all catalog/address values in this rendered markup.
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CustomForge invoice ${order.id.replace(/[^a-zA-Z0-9-]/g, "")}</title><style>${standaloneStyles}</style></head><body>${ref.current.outerHTML}</body></html>`;
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `CustomForge-invoice-${order.id.slice(0, 8)}.html`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="my-6 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Print / save PDF
        </Button>
        <Button variant="outline" onClick={download}>
          <Download />
          Download invoice
        </Button>
      </div>
      <section
        ref={ref}
        className="forge-invoice"
        aria-label="Printable order invoice"
      >
        <header>
          <div>
            <Brand />
            <p>Forge your advantage.</p>
          </div>
          <div>
            <h2>INVOICE</h2>
            <p>Order #{order.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </header>
        <div className="forge-invoice-meta">
          <div>
            <h3>SHIP TO</h3>
            {order.address ? (
              <>
                <p>
                  <strong>{order.address.fullName}</strong>
                </p>
                <p>{order.address.address}</p>
                <p>
                  {order.address.city}, {order.address.state}{" "}
                  {order.address.postalCode}
                </p>
                <p>{order.address.country}</p>
              </>
            ) : (
              <p>No shipping address recorded.</p>
            )}
          </div>
          <div>
            <h3>ORDER DETAILS</h3>
            <p>
              Date:{" "}
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("en-US")
                : "Not recorded"}
            </p>
            <p>Status: {order.status}</p>
            <p>
              Payment:{" "}
              {order.isPaid
                ? "Paid"
                : order.paymentMethod === "cod"
                  ? "Due on delivery"
                  : "Pending"}
            </p>
            <p>Method: {order.paymentMethod || "Not recorded"}</p>
            <p>Currency: USD</p>
          </div>
        </div>
        <table>
          <caption className="sr-only">Order line items</caption>
          <thead>
            <tr>
              <th scope="col">YOUR LOADOUT</th>
              <th scope="col">QTY</th>
              <th scope="col">UNIT PRICE</th>
              <th scope="col">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.productId}-${index}`}>
                <td>{item.name || `Item ${index + 1}`}</td>
                <td>{item.quantity}</td>
                <td>{formatPrice(item.price ?? 0)}</td>
                <td>{formatPrice((item.price ?? 0) * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="forge-invoice-totals">
          <div>
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal ?? 0)}</span>
          </div>
          <div>
            <span>Discount</span>
            <span>−{formatPrice(order.discount ?? 0)}</span>
          </div>
          <div>
            <span>Shipping</span>
            <span>{formatPrice(order.shipping ?? 0)}</span>
          </div>
          <div>
            <span>Tax</span>
            <span>{formatPrice(order.tax ?? 0)}</span>
          </div>
          <div>
            <span>Total</span>
            <span>{formatPrice(order.total ?? 0)}</span>
          </div>
        </div>
        <div className="forge-invoice-note">
          <p>Good gear. Great games. Thanks for choosing CustomForge.</p>
          <p>
            Order reference: {order.id}. Payment status reflects the server
            record at the time this invoice was generated.
          </p>
          <p>This is an order invoice, not a separate proof of payment.</p>
        </div>
      </section>
    </>
  );
}
