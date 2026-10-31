"use client";
import { useUrlState } from "@/hooks/use-url-state";
import type { AdminOrder } from "@/types/admin";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { useConfirmation } from "@/hooks/use-confirmation";

import { useAdminQuery } from '@/hooks/use-admin-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { QueryError } from '@/components/patterns/query-error';
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  Package,
  Truck,
  RotateCcw,
  CreditCard,
  MapPin,
  Search,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { canApproveReturn, canRecordCashPayment, nextFulfillmentStatus, needsPaymentReview } from "@/lib/commerce-policy";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "@/components/patterns/section-header";
import { PageShell } from "@/components/patterns/page-shell";
import { ActionBar } from "@/components/patterns/action-bar";
import { Pagination } from "@/components/patterns/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "../forge-commerce.css";

const statusColors: Record<string, string> = {
  pending: "is-warning", paid: "is-success", processing: "is-neutral", shipped: "is-success",
  delivered: "is-success", cancelled: "is-danger", refunded: "is-neutral", returned: "is-warning",
  payment_review: 'is-warning',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Package className="w-4 h-4" />,
  paid: <CreditCard className="w-4 h-4" />,
  payment_review: <CreditCard className="w-4 h-4" />,
  processing: <Package className="w-4 h-4" />,
  shipped: <Truck className="w-4 h-4" />,
  delivered: <Truck className="w-4 h-4" />,
  cancelled: <RotateCcw className="w-4 h-4" />,
  refunded: <RotateCcw className="w-4 h-4" />,
  returned: <RotateCcw className="w-4 h-4" />,
};

const isCompleteId = (value: string) => /^[0-9a-f]{24}$/i.test(value);
const statusLabel = (status: string) => status === 'payment_review' ? 'Payment needs review' : status.charAt(0).toUpperCase() + status.slice(1);

export default function OrdersPage() {
  const { toast } = useToast();
  const runMutation = useAdminMutation();
  const { confirm, confirmationDialog } = useConfirmation();
  const [searchTerm, setSearchTerm] = useUrlState("searchTerm", "");
  const [statusFilter, setStatusFilter] = useUrlState("statusFilter", "all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: string; kind: "status" | "return" | "payment" } | null>(null);
  const [page, setPage] = useUrlState("page", 1);
  const [limit, setLimit] = useUrlState("limit", 10);


  const search = useDebouncedValue(searchTerm.trim());
  const incompleteSearch = search !== "" && !isCompleteId(search);
  const showSearchHelp = searchTerm.trim() !== "" && !isCompleteId(searchTerm.trim());
  const filters = { page, limit, search: search, status: statusFilter };
  const listQuery = useAdminQuery(['orders', filters], () => apiClient.getOrders(filters), {enabled: !incompleteSearch});
  const statsQuery = useAdminQuery(['analytics', 'orders'], () => apiClient.getOrderAnalytics("30d"));
  const orders: AdminOrder[] = showSearchHelp ? [] : listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.pages ?? 1;
  const totalOrders = listQuery.data?.count ?? 0;
  const orderStats = statsQuery.data;
  const loading = !showSearchHelp && listQuery.isLoading;
  const fetchOrders = () => { if (!incompleteSearch && !showSearchHelp) void listQuery.refetch(); void statsQuery.refetch(); };


  const handleUpdateStatus = async (id: string, status: string) => {
    if (pendingAction) return;
    setPendingAction({ id, kind: "status" });
    try {
      if (status === "delivered") {
        await runMutation(() => apiClient.deliverOrder(id));
      } else {
        await runMutation(() => apiClient.updateOrderStatus(id, status));
      }
      toast({ title: "Success", description: `Order marked as ${status}` });
      fetchOrders();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: ((error instanceof Error && error.message) || "Failed to update order status"),
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleProcessReturn = async (id: string) => {
    if (pendingAction) return;
    setPendingAction({ id, kind: "return" });
    try {
      await runMutation(() => apiClient.approveReturn(id));
      toast({ title: "Success", description: "Return approved for review. Refund and inventory reconciliation are still required." });
      fetchOrders();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: ((error instanceof Error && error.message) || "Failed to process return"),
        variant: "destructive",
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleRecordPayment = async (order: AdminOrder) => {
    if (pendingAction || !canRecordCashPayment(order)) return;
    const approved = await confirm({
      title: "Confirm cash payment received?",
      description: `Only confirm after collecting $${Number(order.total_price).toFixed(2)} for order #${order.id.slice(0, 8)}. This records receipt of payment.`,
      confirmLabel: "Confirm payment received",
      variant: "default",
    });
    if (!approved) return;
    setPendingAction({ id: order.id, kind: "payment" });
    try {
      await runMutation(() => apiClient.markOrderAsPaid(order.id));
      toast({ title: "Payment recorded", description: "Cash-on-delivery payment marked as received." });
      fetchOrders();
    } catch (error) {
      toast({ title: "Payment not recorded", description: error instanceof Error ? error.message : "Could not record this payment. Please try again.", variant: "destructive" });
    } finally {
      setPendingAction(null);
    }
  };

  const statuses = [
    "all",
    "pending",
    "paid",
    "payment_review",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "returned",
  ];

  return (
    <PageShell className="fc-page">
      <SectionHeader eyebrow="Commerce / Fulfillment" icon={<Truck size={20} />} title="Orders & fulfillment" description="From checkout to delivery. Review orders, track payment and keep shipments moving." actions={<Button variant="outline" onClick={fetchOrders} disabled={listQuery.isFetching || !!pendingAction}>
        <RotateCcw size={15} />Refresh orders</Button>} />
      <QueryError error={(!showSearchHelp && listQuery.error) || statsQuery.error || null} retry={fetchOrders} />
      {orderStats && <div className="fa-stat-grid">
        <Card className="fa-stat">
          <span>Total orders</span>
          <strong>{orderStats.totalOrders}</strong>
          <small>Last 30 days</small>
        </Card>
        <Card className="fa-stat">
          <span>Paid orders</span>
          <strong className="fc-cyan">{orderStats.paidOrders}</strong>
          <small>Last 30 days</small>
        </Card>
        <Card className="fa-stat">
          <span>Revenue</span>
          <strong>${Number(orderStats.totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          <small>Last 30 days</small>
        </Card>
        <Card className="fa-stat">
          <span>Revenue growth</span>
          <strong className="fc-violet">{orderStats.growth == null ? "—" : `${orderStats.growth}%`}</strong>
          <small>{orderStats.growth == null ? "Comparison unavailable" : "Reported comparison"}</small>
        </Card>
      </div>}
      <ActionBar layout="filters" className="fc-filters fc-filters-two">
        <div className="fa-field"><label htmlFor="orders-search">Order or customer ID</label><div className="fc-search">
          <Search size={17} aria-hidden="true" />
          <Input id="orders-search" aria-label="Search by complete order or customer ID" aria-invalid={showSearchHelp} aria-describedby="order-search-help" placeholder="Paste a complete order or customer ID…" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
        </div></div>
        <div className="fa-field"><label htmlFor="orders-status">Status</label><Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger id="orders-status" aria-label="Filter order status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{statuses.map((status) =>
            <SelectItem key={status} value={status}>{status === "all" ? "All statuses" : statusLabel(status)}</SelectItem>)}</SelectContent>
        </Select></div>
      </ActionBar>
      <section className="fa-panel fc-orders-panel" aria-label="Order management">
        <div className="fa-panel-heading">
          <div>
            <h2>Order queue</h2>
            <p>{showSearchHelp ? "Complete an order or customer ID to search" : `${totalOrders} matching orders`}</p>
          </div>
          <span className="fc-panel-note">Open an order to manage fulfillment</span>
        </div>
        <p id="order-search-help" className="fc-search-help">Use a complete order or customer ID. Expand an order to find its full reference.</p>
        <div className="fc-order-columns" aria-hidden="true">
          <span>Order / customer</span>
          <span>Total / items</span>
          <span>Fulfillment</span>
          <span>Placed</span>
          <span />
        </div>
        {loading ? <div className="fc-order-loading" role="status" aria-label="Loading orders">{Array.from({ length: 4 }, (_, i) =>
          <div className="fc-order-skeleton" key={i} />)}</div> : orders.length === 0 ? <div className="fc-empty">
            <Package size={34} />
            <h3>{showSearchHelp ? "A complete ID is needed" : "No orders found"}</h3>
            <p>{showSearchHelp ? "Paste the full order or customer ID, or clear the search to browse the queue." : searchTerm || statusFilter !== "all" ? "Try another order ID or status." : "New orders will appear here when customers check out."}</p>{(searchTerm || statusFilter !== "all") && <Button variant="outline" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setPage(1); }}>Clear filters</Button>}</div> : <div className="fc-order-list">{orders.map((order) => (
              <article key={order.id} className={`fc-order ${expandedOrder === order.id ? "is-expanded" : ""}`}>
                <button className="fc-order-row" aria-expanded={expandedOrder === order.id} aria-controls={`order-details-${order.id}`} onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                  <div className="fc-order-identity">
                    <span className="fc-order-icon">
                      <Package size={18} />
                    </span>
                    <div>
                      <strong>#{order.id.slice(0, 8)}</strong>
                      <small>Customer {order.user_id?.slice(0, 8) || "Guest"}</small>
                    </div>
                  </div>
                  <div className="fc-order-value">
                    <strong>${Number(order.total_price).toFixed(2)}</strong>
                    <small>{order.items?.length || 0} line items · {needsPaymentReview(order) ? 'Payment captured · needs review' : order.is_paid ? "Paid" : "Awaiting payment"}</small>
                  </div>
                  <span className={`fa-status ${statusColors[order.status] || "is-neutral"}`}>{statusIcons[order.status] || statusIcons.pending}{needsPaymentReview(order) ? 'Payment needs review' : statusLabel(order.status)}</span>
                  <time dateTime={order.created_at}>{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
                  <ChevronDown size={18} className="fc-order-chevron" aria-hidden="true" />
                </button>
                {expandedOrder === order.id && <div className="fc-order-details" id={`order-details-${order.id}`}>
                  <div className="fc-order-detail-grid">
                    <section className="fc-order-items">
                      <h3>
                        <Package size={16} />Order items</h3>{order.items?.length ? order.items.map((item, idx) =>
                          <div className="fc-order-line" key={item.id || idx}>
                            <div>
                              <strong>{item.name || "Product"}</strong>
                              <small>{item.quantity} × ${Number(item.price).toFixed(2)}</small>
                            </div>
                            <strong>${(Number(item.price) * (item.quantity || 1)).toFixed(2)}</strong>
                          </div>) : <p className="fc-muted">No item details returned for this order.</p>}</section>
                    <section>
                      <h3>
                        <MapPin size={16} />Ship to</h3>{order.shipping_address && Object.keys(order.shipping_address).length > 0 ? <address className="fc-order-address">{order.shipping_address.fullName && <strong>{order.shipping_address.fullName}</strong>}{order.shipping_address.address && <span>{order.shipping_address.address}</span>}<span>{[order.shipping_address.city, order.shipping_address.state, order.shipping_address.postalCode].filter(Boolean).join(", ")}</span>{order.shipping_address.country && <span>{order.shipping_address.country}</span>}{order.shipping_address.phoneNumber && <span>{order.shipping_address.phoneNumber}</span>}</address> : <p className="fc-muted">Shipping address unavailable.</p>}</section>
                    <section>
                      <h3>
                        <CreditCard size={16} />Payment</h3>
                      <span className={`fa-status ${order.is_paid && !needsPaymentReview(order) ? "is-success" : "is-warning"}`}>{needsPaymentReview(order) ? 'Payment captured · needs review' : order.is_paid ? "Paid" : "Awaiting payment"}</span>{order.payment_method && <p className="fc-payment-method">{order.payment_method === "cod" ? "Cash on delivery" : order.payment_method}</p>}
                      {!order.is_paid && ["pending", "paid", "processing", "shipped"].includes(order.status) && <p className="fc-muted">{order.payment_method === "cod" ? "Record cash payment once collected. Payment must be received before marking delivery." : "Payment confirmation is required before fulfillment can continue."}</p>}
                      {needsPaymentReview(order) && <p className="fc-muted" role="status">Payment was captured after the inventory reservation ended. Fulfillment is paused. Reconcile the payment with Stripe and contact the customer; any refund must be completed and confirmed through the payment provider.</p>}
                      {order.return_status && order.return_status !== "none" && <p className="fc-muted">Return status: {order.return_status}</p>}</section>
                    <section>
                      <h3>Order summary</h3>
                      <dl className="fc-order-summary">{order.items_price != null && <div>
                        <dt>Items</dt>
                        <dd>${Number(order.items_price).toFixed(2)}</dd>
                      </div>}{order.shipping_price != null && <div>
                        <dt>Shipping</dt>
                        <dd>${Number(order.shipping_price).toFixed(2)}</dd>
                      </div>}{order.tax_price != null && <div>
                        <dt>Tax</dt>
                        <dd>${Number(order.tax_price).toFixed(2)}</dd>
                      </div>}{Number(order.discount_amount) > 0 && <div>
                        <dt>Discount</dt>
                        <dd>−${Number(order.discount_amount).toFixed(2)}</dd>
                      </div>}<div className="fc-summary-total">
                          <dt>Total</dt>
                          <dd>${Number(order.total_price).toFixed(2)}</dd>
                        </div>
                      </dl>
                    </section>
                  </div>
                  <div className="fc-order-detail-actions" aria-busy={pendingAction?.id === order.id}>
                    <p className="fc-muted">Order ID <span className="fc-id">{order.id}</span>
                    </p>
                    <div>
                      {canRecordCashPayment(order) && <Button variant="outline" onClick={() => handleRecordPayment(order)} disabled={!!pendingAction}>
                        <CreditCard size={16} />{pendingAction?.id === order.id && pendingAction.kind === "payment" ? "Recording payment…" : "Record cash payment"}</Button>}
                      {nextFulfillmentStatus(order) === "processing" && <Button onClick={() => handleUpdateStatus(order.id, "processing")} disabled={!!pendingAction}>
                        <Package size={16} />{pendingAction?.id === order.id && pendingAction.kind === "status" ? "Updating status…" : "Mark as processing"}</Button>}
                      {nextFulfillmentStatus(order) === "shipped" && <Button onClick={() => handleUpdateStatus(order.id, "shipped")} disabled={!!pendingAction}>
                        <Truck size={16} />{pendingAction?.id === order.id && pendingAction.kind === "status" ? "Updating status…" : "Mark as shipped"}</Button>}
                      {nextFulfillmentStatus(order) === "delivered" && <Button onClick={() => handleUpdateStatus(order.id, "delivered")} disabled={!!pendingAction}>
                        <Truck size={16} />{pendingAction?.id === order.id && pendingAction.kind === "status" ? "Updating status…" : "Mark as delivered"}</Button>}
                      {canApproveReturn(order) && <Button variant="outline" onClick={() => handleProcessReturn(order.id)} disabled={!!pendingAction}>
                        <RotateCcw size={16} />{pendingAction?.id === order.id && pendingAction.kind === "return" ? "Approving return…" : "Approve return"}</Button>}
                    </div>
                  </div>
                </div>}
              </article>
            ))}</div>}
        {!loading && !showSearchHelp && <Pagination page={page} pages={totalPages} pending={listQuery.isFetching} onPage={setPage} total={totalOrders} pageSize={limit} noun="orders"
          pageSizeControl={<Select value={String(limit)} disabled={listQuery.isFetching} onValueChange={(value) => { setLimit(Number(value)); setPage(1); }}>
            <SelectTrigger aria-label="Orders per page"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 20, 50].map((size) => <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>)}</SelectContent>
          </Select>} />}
      </section>
      {confirmationDialog}
    </PageShell>
  );
}
