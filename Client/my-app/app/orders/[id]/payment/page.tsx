"use client";

import "@/app/forge-payment.css";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
  AlertCircle,
} from "lucide-react";
import { OrderService } from "@/services/order-service";
import { PaymentService } from "@/services/payment-service";
import { requireSuccess } from "@/lib/query-result";
import { recordedLineTotal } from "@/lib/order-detail";
import {
  paymentPresentation,
  recordedAmount,
  stripeCheckoutUrl,
  paymentTimeRemaining,
} from "@/lib/payment-presentation";
import { usePaymentClock } from '@/hooks/use-payment-clock';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { CheckoutStepper } from "@/components/forge/checkout-stepper";

export default function PaymentPage() {
  const orderId = useParams().id as string;
  const submitting = useRef(false);
  const [handingOff, setHandingOff] = useState(false);
  const orderQuery = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => OrderService.get(orderId).then(requireSuccess),
    refetchInterval: query => query.state.data?.data?.paymentMethod === 'stripe' &&
      query.state.data.data.isPaid === false && ['pending','processing'].includes(query.state.data.data.status) ? 30_000 : false,
  });
  const order = orderQuery.data?.data;
  const now = usePaymentClock(order?.isPaid === false ? order.paymentExpiresAt : undefined);
  const state = order ? paymentPresentation(order, now) : null;
  const payment = useMutation({
    mutationFn: async () => {
      const result = requireSuccess(
        await PaymentService.createStripeSession({ orderId }),
      );
      const url = stripeCheckoutUrl(result.data?.url);
      setHandingOff(true);
      try {
        window.location.assign(url);
      } catch (error) {
        setHandingOff(false);
        throw error;
      }
    },
    retry: false,
    onError: () => {
      submitting.current = false;
      setHandingOff(false);
    },
  });
  const busy = payment.isPending || handingOff;
  function pay() {
    if (submitting.current || !order || paymentPresentation(order) !== "ready") return;
    submitting.current = true;
    payment.mutate();
  }
  const orderHref = `/orders/${encodeURIComponent(orderId)}`;

  return (
    <div className="forge-payment forge-container">
      <Link className="forge-payment-back" href={orderHref} prefetch={false}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to your order
      </Link>
      <header className="forge-payment-heading">
        <div>
          <p className="forge-eyebrow">CHECKOUT / SECURE HANDOFF</p>
          <h1>One step from your next level.</h1>
          <p>
            Your order is saved. Review the amount, then continue to secure
            payment.
          </p>
        </div>
        <LockKeyhole size={35} aria-hidden="true" />
      </header>
      <CheckoutStepper step={state === "confirmed" ? 3 : 2} />
      {orderQuery.isLoading ? (
        <div
          className="forge-payment-layout"
          aria-busy="true"
          aria-label="Loading payment details"
        >
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-80 w-full" />
          <span className="sr-only" role="status">
            Loading your order
          </span>
        </div>
      ) : orderQuery.isError || !order ? (
        <section className="forge-payment-recovery" role="alert">
          <AlertCircle size={32} aria-hidden="true" />
          <h2>Your order could not be loaded.</h2>
          <p>
            {orderQuery.error?.message ||
              "Payment needs the saved order details. Reload to try again."}
          </p>
          <Button
            onClick={() => orderQuery.refetch()}
            disabled={orderQuery.isFetching}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {orderQuery.isFetching ? "Loading order…" : "Retry loading order"}
          </Button>
        </section>
      ) : (
        <div className="forge-payment-layout">
          <section
            className="forge-payment-panel"
            aria-labelledby="payment-title"
          >
            <div className="forge-payment-panel-label">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>YOUR PAYMENT</span>
              <span className="forge-payment-tag">
                {state === 'review' ? 'NEEDS REVIEW' : state === "confirmed" ? "CONFIRMED" : "ORDER SAVED"}
              </span>
            </div>
            {state === "ready" ? (
              <>
                <div className="forge-payment-provider">
                  <span className="forge-payment-icon">
                    <CreditCard size={28} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="payment-title">Secure card checkout</h2>
                    <p>Powered by Stripe</p>
                  </div>
                </div>
                <p className="forge-payment-description">
                  Enter your card on Stripe’s secure checkout. You’ll return
                  here after payment; your order updates when payment is
                  confirmed by the server.
                </p>
                {order.paymentExpiresAt && <p className="forge-payment-description" suppressHydrationWarning>
                  {paymentTimeRemaining(order, now)}. Pay within two hours of placing your order.
                  Unpaid orders are automatically cancelled after the deadline.
                  Open a new checkout with at least 31 minutes remaining; an existing checkout can be resumed until it expires.
                </p>}
                <ol className="forge-payment-steps">
                  <li>
                    <i>01</i>
                    <span>
                      <strong>Continue securely</strong>
                      <small>Open checkout for this saved order.</small>
                    </span>
                  </li>
                  <li>
                    <i>02</i>
                    <span>
                      <strong>Complete payment</strong>
                      <small>Stripe handles your card information.</small>
                    </span>
                  </li>
                  <li>
                    <i>03</i>
                    <span>
                      <strong>Return to your order</strong>
                      <small>Check the latest confirmed payment status.</small>
                    </span>
                  </li>
                </ol>
                {payment.isError && (
                  <div className="forge-payment-error" role="alert">
                    <AlertCircle size={17} aria-hidden="true" />
                    <div>
                      <strong>Checkout could not open.</strong>
                      <p>{payment.error.message}</p>
                      <small>
                        Your saved order is still available. Try again to
                        continue payment.
                      </small>
                    </div>
                  </div>
                )}
                <Button
                  className="forge-payment-submit"
                  disabled={busy}
                  onClick={pay}
                >
                  {busy ? (
                    <span className="forge-processing" role="status">
                      <i />
                      Opening secure payment…
                    </span>
                  ) : (
                    <>
                      Pay {formatPrice(order.total!)} with Stripe{" "}
                      <ArrowUpRight size={18} aria-hidden="true" />
                    </>
                  )}
                </Button>
                <p className="forge-payment-fineprint">
                  <LockKeyhole size={13} aria-hidden="true" /> Card details are
                  entered on Stripe Checkout.
                </p>
              </>
            ) : (
              <div className="forge-payment-result">
                {state === "confirmed" ? (
                  <CheckCircle2 size={42} aria-hidden="true" />
                ) : state === "delivery" ? (
                  <Truck size={42} aria-hidden="true" />
                ) : (
                  <AlertCircle size={42} aria-hidden="true" />
                )}
                <h2 id="payment-title">
                  {state === 'expired' ? 'Payment window ended.' : state === 'review' ? 'Payment needs review.' : state === "confirmed"
                    ? "Payment confirmed."
                    : state === "delivery"
                      ? "Pay on delivery."
                      : state === "missing-total"
                        ? "Order total needs a refresh."
                        : state === "closed"
                          ? "Payment is unavailable for this order."
                          : "This payment method is unavailable."}
                </h2>
                <p>
                  {state === 'expired' ? 'We’re checking payment before automatically cancelling this unpaid order and releasing its items. If you already paid, wait for confirmation.' : state === 'review' ? 'Your payment was received after the item reservation ended. This order cannot be sent until the store reviews it. Do not pay again; contact store support with your order number.' : state === "confirmed"
                    ? "Your order already has a confirmed payment. View its current progress and invoice."
                    : state === "delivery"
                      ? "Payment will be collected on delivery. No card payment is required here."
                      : state === "missing-total"
                        ? "A valid saved total is required before checkout can open. Reload your order details to try again."
                        : state === "closed"
                          ? `This order is ${order.status}. Review its current details for next steps.`
                          : "Review your order details or contact store support for help with payment."}
                </p>
                {(state === "missing-total" || state === "expired") && (
                  <Button
                    variant="outline"
                    disabled={orderQuery.isFetching}
                    onClick={() => orderQuery.refetch()}
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    {orderQuery.isFetching ? "Refreshing…" : "Refresh order"}
                  </Button>
                )}
                <Button asChild>
                  <Link href={orderHref} prefetch={false}>
                    View your order{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            )}
          </section>
          <aside
            className="forge-payment-summary"
            aria-labelledby="payment-summary-title"
          >
            <p className="forge-eyebrow">
              SAVED ORDER / {order.id.slice(0, 8).toUpperCase()}
            </p>
            <h2 id="payment-summary-title">Your loadout</h2>
            <div className="forge-payment-items">
              {order.items.map((item, index) => (
                <div key={`${item.productId}-${index}`}>
                  <Package size={19} aria-hidden="true" />
                  <span>
                    <strong>{item.name || "Ordered product"}</strong>
                    <small>Quantity {item.quantity}</small>
                  </span>
                  <b>
                    {recordedLineTotal(item) !== undefined
                      ? formatPrice(recordedLineTotal(item)!)
                      : "Not recorded"}
                  </b>
                </div>
              ))}
            </div>
            <dl className="forge-payment-totals">
              {recordedAmount(order.subtotal) && (
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(order.subtotal)}</dd>
                </div>
              )}
              {recordedAmount(order.discount) && order.discount > 0 && (
                <div>
                  <dt>Discount</dt>
                  <dd>−{formatPrice(order.discount)}</dd>
                </div>
              )}
              {recordedAmount(order.shipping) && (
                <div>
                  <dt>Shipping</dt>
                  <dd>
                    {order.shipping === 0
                      ? "Free"
                      : formatPrice(order.shipping)}
                  </dd>
                </div>
              )}
              {recordedAmount(order.tax) && (
                <div>
                  <dt>Tax</dt>
                  <dd>{formatPrice(order.tax)}</dd>
                </div>
              )}
              <div className="forge-payment-total">
                <dt>Order total</dt>
                <dd>
                  {recordedAmount(order.total)
                    ? formatPrice(order.total)
                    : "Not recorded"}
                </dd>
              </div>
            </dl>
            <p className="forge-payment-summary-note">
              Amounts come from your saved order. Opening checkout does not
              create another order.
            </p>
            <Link
              href={orderHref}
              prefetch={false}
              className="forge-payment-detail-link"
            >
              Review shipping & order details{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
