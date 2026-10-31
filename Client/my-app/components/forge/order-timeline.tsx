import { PackageCheck, Box, Truck, CheckCircle2, Trophy } from "lucide-react";
import type { Order } from "@/lib/types";
import { orderNeedsPaymentReview } from '@/lib/order-detail';

export function OrderCelebration({ order }: { order: Order }) {
  const complete = order.isPaid || order.paymentMethod === "cod";
  return (
    <section className="forge-order-success" role="status">
      <Trophy size={42} />
      <p className="forge-eyebrow">
        {complete
          ? "YOUR NEXT LEVEL IS ON ITS WAY"
          : "YOUR LOADOUT IS RESERVED"}
      </p>
      <h2>{complete ? "Order unlocked." : "One more step."}</h2>
      <p>
        {order.isPaid
          ? "Payment confirmed. Your upgrade journey starts now."
          : order.paymentMethod === "cod"
            ? "Order received. Payment will be collected on delivery."
            : "Order received. Complete payment to unlock your next upgrade."}
      </p>
    </section>
  );
}
export function OrderTimeline({ order }: { order: Order }) {
  const review = orderNeedsPaymentReview(order);
  const stopped = review || ["cancelled", "returned", "refunded"].includes(order.status);
  const shipped = ["shipped", "delivered"].includes(order.status);
  const steps = [
    {
      title: "Order placed",
      icon: PackageCheck,
      done: true,
      detail: order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-US")
        : "Received",
    },
    {
      title: "Packing",
      icon: Box,
      done: false,
      detail: shipped
        ? "Dispatched; packing timestamp unavailable"
        : "Packing status not provided",
    },
    {
      title: "Shipped",
      icon: Truck,
      done: shipped,
      detail: shipped ? "Dispatched" : "Awaiting dispatch",
    },
    {
      title: "Delivered",
      icon: CheckCircle2,
      done: order.status === "delivered",
      detail:
        order.status === "delivered"
          ? "Delivery complete"
          : "Next stop: your setup",
    },
  ];
  return (
    <section className="forge-order-timeline">
      <p className="forge-eyebrow">YOUR UPGRADE JOURNEY</p>
      {stopped ? (
        <p className="mt-3 text-sm">
          {review ? 'Payment needs review. Fulfillment is paused while the store reviews this payment.' : `This order is ${order.status}. Fulfillment progression has stopped.`}
        </p>
      ) : (
        <div>
          {steps.map(({ title, icon: Icon, done, detail }) => (
            <article className={done ? "is-complete" : ""} key={title}>
              <Icon size={22} />
              <strong className="block">{title}</strong>
              <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">
                {detail}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
