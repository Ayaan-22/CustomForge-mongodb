"use client";
import "../../forge-order-detail.css";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { OrderService } from "@/services/order-service";
import { Button } from "@/components/ui/button";
import { OrderPaymentAction } from "@/components/order-payment-action";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  FileText,
  MapPin,
  Package,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { RequestError, requireSuccess } from "@/lib/query-result";
import {
  OrderCelebration,
  OrderTimeline,
} from "@/components/forge/order-timeline";
import { Invoice } from "@/components/forge/invoice";
import {
  OrderActionDialog,
  type OrderAction,
} from "@/components/forge/order-action-dialog";
import {
  hasInvoicePricing,
  orderActionEligibility,
  orderNeedsPaymentReview,
  recordedLineTotal,
  recordedOrderAmount,
  recordedOrderDate,
} from "@/lib/order-detail";
import { ORDER_STATUS_LABELS } from '@/lib/order-history';

const amount = (value: unknown) =>
  recordedOrderAmount(value) ? formatPrice(value) : "Not recorded";

export default function OrderDetailsPage() {
  const orderId = useParams().id as string;
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [action, setAction] = useState<OrderAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewRequired, setReviewRequired] = useState(false);
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const actionTrigger = useRef<HTMLButtonElement | null>(null);

  // This URL only requests a banner. Its content uses the server's payment record.
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccessBanner(true);
      const timer = setTimeout(() => setShowSuccessBanner(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const query = useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => OrderService.get(orderId).then(requireSuccess),
    refetchInterval: (state) =>
      searchParams.get("success") === "true" &&
      !state.state.data?.data?.isPaid &&
      state.state.dataUpdateCount < 12
        ? 5000
        : state.state.data?.data?.paymentMethod === 'stripe' && state.state.data.data.isPaid === false &&
          ['pending','processing'].includes(state.state.data.data.status) ? 30_000 : false,
  });
  const order = query.data?.data;

  async function actionConfirmed(message: string) {
    // Acknowledged mutations still refresh the authoritative order record.
    await queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
    await queryClient.invalidateQueries({ queryKey: ["orders"] });
    setAction(null);
    setActionError(null);
    setReviewRequired(false);
    toast.success(message);
  }
  function actionFailed(error: Error) {
    setActionError(error.message);
    setReviewRequired(true);
    toast.error(error.message);
  }
  const cancelOrderMutation = useMutation({
    mutationFn: () => OrderService.cancel(orderId).then(requireSuccess),
    retry: false,
    onSuccess: () => actionConfirmed("Order cancelled successfully"),
    onError: actionFailed,
  });
  const returnOrderMutation = useMutation({
    mutationFn: () => OrderService.return(orderId).then(requireSuccess),
    retry: false,
    onSuccess: () => actionConfirmed("Return request submitted successfully"),
    onError: actionFailed,
  });
  const actionPending =
    cancelOrderMutation.isPending || returnOrderMutation.isPending;

  async function confirmAction() {
    if (
      !order ||
      !action ||
      submitting.current ||
      actionPending ||
      query.isFetching ||
      query.isError ||
      reviewRequired
    )
      return;
    const eligibility = orderActionEligibility(order);
    if (action === "cancel" ? !eligibility.canCancel : !eligibility.canReturn)
      return;
    submitting.current = true;
    setActionError(null);
    try {
      if (action === "cancel") await cancelOrderMutation.mutateAsync();
      else await returnOrderMutation.mutateAsync();
    } catch {
      // The mutation retains the dialog, reports the error, and requires a status refresh.
    } finally {
      submitting.current = false;
    }
  }
  async function refreshActionStatus() {
    const refreshed = await query.refetch();
    if (!refreshed.isError && refreshed.data?.data) setReviewRequired(false);
  }

  if (query.isLoading)
    return (
      <div className="forge-container forge-order-detail" aria-busy="true">
        <p className="forge-eyebrow">YOUR UPGRADE JOURNEY</p>
        <h1>Opening your order.</h1>
        <p className="forge-order-detail-intro" role="status">
          Loading the latest order and payment record…
        </p>
        <div className="forge-order-detail-loading">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  if (!order) {
    const missing =
      query.error instanceof RequestError && query.error.status === 404;
    return (
      <div className="forge-container forge-order-detail">
        <section className="forge-order-detail-state" role="alert">
          <span>
            <AlertCircle size={35} />
          </span>
          <p className="forge-eyebrow">
            {missing ? "ORDER UNAVAILABLE" : "CONNECTION INTERRUPTED"}
          </p>
          <h1>
            {missing
              ? "We couldn’t find this order."
              : "Let’s reconnect your order."}
          </h1>
          <p>
            {query.error?.message ||
              "Order details could not be loaded. Refresh to retrieve the current server record."}
          </p>
          <div>
            <Button disabled={query.isFetching} onClick={() => query.refetch()}>
              <RefreshCw size={17} />
              {query.isFetching ? "Refreshing…" : "Retry order details"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/orders" prefetch={false}>
                View my orders
              </Link>
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // These conditions exactly preserve existing cancellation/return eligibility.
  const { canCancel, canReturn } = orderActionEligibility(order);
  const placedDate = recordedOrderDate(order.createdAt);
  const displayOrder = {
    ...order,
    createdAt: placedDate ? order.createdAt : undefined,
  };
  const exportReady = hasInvoicePricing(order);
  const paymentReview = orderNeedsPaymentReview(order);
  const stopped = paymentReview || ["cancelled", "returned", "refunded"].includes(order.status);
  const paymentLabel = paymentReview ? 'Payment received · needs review' : order.isPaid
    ? "Payment confirmed"
    : order.paymentMethod === "cod"
      ? "Due on delivery"
      : "Payment not confirmed";
  const methodLabel =
    order.paymentMethod === "stripe"
      ? "Card / Stripe"
      : order.paymentMethod === "cod"
        ? "Cash on delivery"
        : order.paymentMethod || "Not recorded";

  return (
    <div className="forge-container forge-order-detail forge-order-page">
      <Link href="/orders" prefetch={false} className="forge-order-detail-back">
        <ArrowLeft size={15} />
        Back to your orders
      </Link>
      {showSuccessBanner && !stopped && <OrderCelebration order={order} />}
      {paymentReview && <div className="forge-order-detail-notice" role="status">
        <AlertCircle size={18} /><div><strong>Payment needs review</strong><p>Your payment was received after the item reservation ended. Fulfillment is paused while the store reviews it. Do not pay again; contact store support with your order number.</p></div>
      </div>}
      {searchParams.get("canceled") === "true" && !order.isPaid && (
        <div className="forge-order-detail-notice" role="status">
          <ShieldCheck size={18} />
          <p>
            You returned from the payment flow. The order record below shows its
            latest status; continue payment if it is offered.
          </p>
        </div>
      )}
      {query.isError && (
        <div className="forge-order-detail-notice is-error" role="alert">
          <AlertCircle size={18} />
          <div>
            <strong>The latest status could not be refreshed.</strong>
            <p>
              The last loaded record is shown. Refresh before taking an order
              action.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw size={15} />
            Retry
          </Button>
        </div>
      )}
      <header className="forge-order-detail-heading">
        <div>
          <p className="forge-eyebrow">YOUR UPGRADE RECORD</p>
          <h1 ref={heading} tabIndex={-1}>
            Order #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p>
            {placedDate ? (
              <time dateTime={placedDate.toISOString()}>
                Placed{" "}
                {placedDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            ) : (
              "Order date not recorded"
            )}
          </p>
        </div>
        <div className={`forge-order-detail-status is-${order.status}`}>
          <span />
          <strong>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </strong>
        </div>
      </header>
      <div className="forge-order-detail-signal">
        <span>
          <ShieldCheck size={15} />
          {paymentLabel}
        </span>
        <span>{methodLabel}</span>
        <Button
          variant="ghost"
          disabled={query.isFetching || actionPending}
          onClick={() => query.refetch()}
        >
          <RefreshCw size={14} />
          {query.isFetching ? "Updating…" : "Refresh status"}
        </Button>
      </div>
      {!query.isError && <OrderPaymentAction order={order} />}
      <OrderTimeline order={displayOrder} />

      <div className="forge-order-detail-layout">
        <div className="forge-order-detail-sections">
          <section
            className="forge-order-detail-card"
            aria-labelledby="order-items-heading"
          >
            <header>
              <div>
                <p className="forge-eyebrow">THE GEAR YOU ORDERED</p>
                <h2 id="order-items-heading">
                  <Package size={19} />
                  Your loadout
                </h2>
              </div>
              <span>
                {order.items.length}{" "}
                {order.items.length === 1 ? "product" : "products"}
              </span>
            </header>
            <ul className="forge-order-detail-items">
              {order.items.map((item, index) => (
                <li key={`${item.productId}-${index}`}>
                  <span className="forge-order-item-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{item.name || `Item ${index + 1}`}</h3>
                    <p>Quantity {item.quantity}</p>
                    {item.productId && (
                      <Link
                        href={`/products/${encodeURIComponent(item.productId)}`}
                        prefetch={false}
                      >
                        View current listing <ArrowUpRight size={12} />
                      </Link>
                    )}
                  </div>
                  <div className="forge-order-item-price">
                    <strong>{amount(recordedLineTotal(item))}</strong>
                    <span>
                      {recordedOrderAmount(item.price)
                        ? `${formatPrice(item.price)} each`
                        : "Unit price not recorded"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {!order.items.length && (
              <p className="forge-order-detail-empty">
                No line items were included in this order record.
              </p>
            )}
          </section>

          <section
            className="forge-order-detail-card"
            aria-labelledby="order-shipping-heading"
          >
            <header>
              <h2 id="order-shipping-heading">
                <MapPin size={19} />
                Shipping address
              </h2>
            </header>
            {order.address ? (
              <address className="forge-order-shipping">
                <strong>
                  {order.address.fullName || "Recipient not recorded"}
                </strong>
                <span>
                  {order.address.address || "Street address not recorded"}
                </span>
                <span>
                  {[
                    order.address.city,
                    order.address.state,
                    order.address.postalCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "City and postal details not recorded"}
                </span>
                <span>{order.address.country || "Country not recorded"}</span>
                {order.address.phoneNumber && (
                  <span>{order.address.phoneNumber}</span>
                )}
              </address>
            ) : (
              <p className="forge-order-detail-empty">
                No shipping address was included in this order record.
              </p>
            )}
          </section>

          {(canCancel || canReturn) && (
            <section
              className="forge-order-detail-card forge-order-actions"
              aria-labelledby="order-actions-heading"
            >
              <header>
                <h2 id="order-actions-heading">Manage this order</h2>
              </header>
              <p>
                {canCancel
                  ? "Cancellation is offered for this pending, unpaid cash-on-delivery order. The server confirms the final result."
                  : "A return request is available for the delivered order. The server checks eligibility and records the request."}
              </p>
              <div>
                {canCancel && (
                  <Button
                    className="forge-order-cancel-button"
                    variant="outline"
                    disabled={
                      actionPending || query.isFetching || query.isError
                    }
                    onClick={(event) => {
                      actionTrigger.current = event.currentTarget;
                      setAction("cancel");
                    }}
                  >
                    <XCircle size={16} />
                    Cancel order
                  </Button>
                )}
                {canReturn && (
                  <Button
                    variant="outline"
                    disabled={
                      actionPending || query.isFetching || query.isError
                    }
                    onClick={(event) => {
                      actionTrigger.current = event.currentTarget;
                      setAction("return");
                    }}
                  >
                    <RotateCcw size={16} />
                    Request return
                  </Button>
                )}
              </div>
              {actionError && (
                <p className="forge-order-action-inline-error" role="status">
                  The last request needs review. Reopen the action to check its
                  status before retrying.
                </p>
              )}
            </section>
          )}
        </div>

        <aside
          className="forge-order-detail-card forge-order-detail-summary"
          aria-labelledby="order-summary-heading"
        >
          <header>
            <div>
              <p className="forge-eyebrow">CONFIRMED ORDER RECORD</p>
              <h2 id="order-summary-heading">Order summary</h2>
            </div>
            <FileText size={19} />
          </header>
          <dl className="forge-order-amounts">
            {(
              [
                ["Subtotal", order.subtotal],
                ["Discount", order.discount],
                ["Shipping", order.shipping],
                ["Tax", order.tax],
                ["Total", order.total],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd
                  className={
                    !recordedOrderAmount(value) ? "is-unrecorded" : undefined
                  }
                >
                  {label === "Discount" &&
                  recordedOrderAmount(value) &&
                  value > 0
                    ? `−${formatPrice(value)}`
                    : amount(value)}
                </dd>
              </div>
            ))}
          </dl>
          <dl className="forge-order-reference">
            <div>
              <dt>Order reference</dt>
              <dd>{order.id}</dd>
            </div>
            <div>
              <dt>Placed</dt>
              <dd>
                {placedDate
                  ? formatDistanceToNow(placedDate, { addSuffix: true })
                  : "Not recorded"}
              </dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>{methodLabel}</dd>
            </div>
            <div>
              <dt>Payment state</dt>
              <dd>{paymentLabel}</dd>
            </div>
            {order.paymentIntentId && (
              <div>
                <dt>Payment reference</dt>
                <dd>{order.paymentIntentId}</dd>
              </div>
            )}
          </dl>
          <p className="forge-order-record-note">
            <ShieldCheck size={14} />
            Amounts and status reflect the server record. Missing values remain
            unrecorded.
          </p>
        </aside>
      </div>

      <section className="forge-order-invoice-area" aria-label="Order invoice">
        <div className="forge-order-invoice-heading">
          <div>
            <p className="forge-eyebrow">KEEP YOUR RECORD</p>
            <h2>Your invoice.</h2>
          </div>
          <FileText size={23} />
        </div>
        {exportReady ? (
          <Invoice order={displayOrder} />
        ) : (
          <div className="forge-order-detail-notice">
            <AlertCircle size={19} />
            <div>
              <strong>Complete invoice pricing is not recorded.</strong>
              <p>
                Some line prices or subtotal, discount, shipping, tax or total
                fields are missing. Print/download is unavailable so absent
                amounts cannot become $0 values. A recorded total above remains
                valid even if line details are incomplete.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={query.isFetching}
              onClick={() => query.refetch()}
            >
              <RefreshCw size={15} />
              Refresh order
            </Button>
          </div>
        )}
      </section>
      <OrderActionDialog
        action={action}
        orderReference={order.id.slice(0, 8).toUpperCase()}
        eligible={
          action === "cancel"
            ? canCancel
            : action === "return"
              ? canReturn
              : false
        }
        pending={actionPending}
        checking={query.isFetching}
        statusUnavailable={query.isError}
        error={actionError}
        reviewRequired={reviewRequired}
        onClose={() => setAction(null)}
        onConfirm={confirmAction}
        onRefresh={refreshActionStatus}
        onRestoreFocus={() => {
          if (actionTrigger.current?.isConnected) actionTrigger.current.focus();
          else heading.current?.focus();
        }}
      />
    </div>
  );
}
