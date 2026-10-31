"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { OrderService } from "@/services/order-service";
import { requireSuccess } from "@/lib/query-result";
import { OrderPaymentAction } from "@/components/order-payment-action";
import { AccountShell } from "@/components/forge/account-shell";
import { ForgeSelectField } from "@/components/forge/select-field";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Package,
  Search,
  ArrowRight,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  SlidersHorizontal,
  CheckCircle2,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  filterOrderPage,
  orderDate,
  orderItemCount,
  ORDER_STATUS_LABELS,
  type OrderHistoryFilters,
} from "@/lib/order-history";
import type { Order, OrderStatus } from "@/lib/types";

const EMPTY_FILTERS: OrderHistoryFilters = {
  query: "",
  status: "all",
  days: "all",
};

function HistoryCard({ order }: { order: Order }) {
  const date = orderDate(order.createdAt);
  const count = orderItemCount(order);
  const visibleItems = order.items.slice(0, 3);
  return (
    <article
      className="forge-order-card"
      aria-label={`Order ${order.id.slice(0, 8)}`}
    >
      <div className="forge-order-card-heading">
        <span className="forge-order-icon">
          <Package size={22} />
        </span>
        <div>
          <p className="forge-eyebrow">ORDER / {order.id.slice(0, 8)}</p>
          <h2>
            {count} {count === 1 ? "item" : "items"} in your loadout
          </h2>
          {date ? (
            <time dateTime={date.iso}>
              {date.label} <span>UTC</span>
            </time>
          ) : (
            <p className="forge-order-date-missing">Order date unavailable</p>
          )}
        </div>
        <span className={`forge-order-badge is-${order.status}`}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      <div className="forge-order-items">
        {visibleItems.map((item, index) => (
          <div key={`${item.productId}-${index}`}>
            <span>
              {item.name || `Item ${index + 1}`}{" "}
              <small>× {item.quantity}</small>
            </span>
            <strong>
              {item.price != null
                ? formatPrice(item.price * item.quantity)
                : "Price not listed"}
            </strong>
          </div>
        ))}
        {order.items.length > visibleItems.length && (
          <p>
            + {order.items.length - visibleItems.length} more{" "}
            {order.items.length - visibleItems.length === 1
              ? "product"
              : "products"}{" "}
            in order details
          </p>
        )}
      </div>
      <div className="forge-order-payment-status">
        {order.status === 'payment_review' ? 'Payment received · needs review' : order.isPaid ? (
          <>
            <CheckCircle2 size={15} /> Payment received
          </>
        ) : order.paymentMethod === "cod" ? (
          "Cash on delivery"
        ) : (
          "Payment not recorded"
        )}
        {order.paymentMethod && (
          <span>
            {order.paymentMethod === "stripe"
              ? "Stripe"
              : order.paymentMethod === "cod"
                ? "COD"
                : "PayPal"}
          </span>
        )}
      </div>
      <div className="forge-order-card-footer">
        <div>
          <span>Order total</span>
          <strong>
            {order.total != null
              ? formatPrice(order.total)
              : "Total unavailable"}
          </strong>
        </div>
        <div>
          <OrderPaymentAction order={order} compact />
          <Button asChild variant="outline">
            <Link href={`/orders/${order.id}`} prefetch={false}>
              View details <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<OrderHistoryFilters>(EMPTY_FILTERS);
  const query = useQuery({
    queryKey: ["orders", "list", page],
    queryFn: () => OrderService.list({ page, limit: 20 }).then(requireSuccess),
  });
  const orders = query.data?.data ?? [];
  const total = query.data?.pagination?.total;
  const pages = Math.max(1, Math.ceil((total ?? 0) / 20));
  const visible = filterOrderPage(orders, filters);
  const filtering =
    filters.query.trim() !== "" ||
    filters.status !== "all" ||
    filters.days !== "all";
  function changePage(value: number) {
    setPage(value);
    setFilters(EMPTY_FILTERS);
  }
  return (
    <AccountShell>
      <header className="forge-account-page-heading">
        <p className="forge-eyebrow">EVERY UPGRADE, IN VIEW.</p>
        <h1>Your order history.</h1>
        <p>
          Review purchases, continue eligible payments and open an order for
          tracking details and its printable invoice.
        </p>
      </header>
      <div className="forge-orders-overview">
        <div>
          <Package size={19} />
          <span>
            Current page
            <strong>
              {query.isLoading
                ? "Loading…"
                : `${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
            </strong>
          </span>
        </div>
        <div>
          <CalendarDays size={19} />
          <span>
            History page
            <strong>
              {page}
              {pages > 1 ? ` of ${pages}` : ""}
            </strong>
          </span>
        </div>
        <div>
          <FileText size={19} />
          <span>
            Invoices & status<strong>Inside order details</strong>
          </span>
        </div>
      </div>
      {query.isLoading ? (
        <div
          className="forge-order-loading"
          aria-busy="true"
          aria-label="Loading order history"
        >
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-60 rounded-xl" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="forge-account-state" role="alert">
          <AlertCircle size={32} />
          <h2>Your orders could not be loaded.</h2>
          <p>{query.error.message}</p>
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
          >
            <RefreshCw size={16} /> Retry orders
          </Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="forge-account-state">
          <Package size={42} />
          <p className="forge-eyebrow">YOUR NEXT UPGRADE STARTS HERE</p>
          <h2>
            {page > 1
              ? "No orders on this page."
              : "Your loadout history is waiting."}
          </h2>
          <p>
            {page > 1
              ? "The order list may have changed. Return to the first page to review your history."
              : "When you place an order, its status, payment options and invoice will be available here."}
          </p>
          {page > 1 ? (
            <Button onClick={() => changePage(1)}>Back to first page</Button>
          ) : (
            <Button asChild>
              <Link href="/products" prefetch={false}>
                Explore the shop <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <section
            className="forge-order-filters"
            aria-labelledby="order-filters-title"
          >
            <div className="forge-order-filter-heading">
              <h2 id="order-filters-title">
                <SlidersHorizontal size={17} /> Find on this page
              </h2>
              {filtering && (
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)}>
                  Clear filters
                </button>
              )}
            </div>
            <p id="order-filter-scope">
              Search and filters apply only to the {orders.length} orders loaded
              on page {page}. Change page to explore more; filters reset when
              the page changes.
            </p>
            <div className="forge-order-filter-fields">
              <label className="forge-order-search">
                <span>Search order ID or product</span>
                <div>
                  <Search size={17} />
                  <input
                    type="search"
                    value={filters.query}
                    maxLength={120}
                    placeholder="Order ID or product name"
                    aria-describedby="order-filter-scope"
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        query: event.target.value,
                      }))
                    }
                  />
                </div>
              </label>
              <ForgeSelectField
                id="order-status"
                label="Order status"
                value={filters.status}
                describedBy="order-filter-scope"
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    status: value as "all" | OrderStatus,
                  }))
                }
                options={[
                  { value: "all", label: "All statuses" },
                  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <ForgeSelectField
                id="order-date"
                label="Placed within"
                value={filters.days}
                describedBy="order-filter-scope"
                onValueChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    days: value as OrderHistoryFilters["days"],
                  }))
                }
                options={[
                  { value: "all", label: "All dates on this page" },
                  { value: "30", label: "Past 30 days" },
                  { value: "90", label: "Past 90 days" },
                  { value: "365", label: "Past year" },
                ]}
              />
            </div>
          </section>
          <p className="forge-order-results" role="status">
            Showing {visible.length} of {orders.length} orders on this page
            {total != null ? ` · ${total} across your history` : ""}.
          </p>
          {!visible.length ? (
            <div className="forge-account-state forge-order-no-results">
              <Search size={32} />
              <h2>No matches on this page.</h2>
              <p>
                Clear these filters or use the page controls below to explore
                another part of your history.
              </p>
              <Button
                variant="outline"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                Clear page filters
              </Button>
            </div>
          ) : (
            <div className="forge-order-list">
              {visible.map((order) => (
                <HistoryCard order={order} key={order.id} />
              ))}
            </div>
          )}
        </>
      )}
      {pages > 1 && (
        <nav className="forge-order-pagination" aria-label="Order pages">
          <Button
            variant="outline"
            disabled={page <= 1 || query.isFetching}
            onClick={() => changePage(page - 1)}
          >
            <ChevronLeft /> Previous
          </Button>
          <span>
            Page {page} of {pages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pages || query.isFetching}
            onClick={() => changePage(page + 1)}
          >
            Next <ChevronRight />
          </Button>
        </nav>
      )}
    </AccountShell>
  );
}
