"use client";
import { useUrlState } from "@/hooks/use-url-state";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { useConfirmation } from "@/hooks/use-confirmation";

import { useAdminQuery } from '@/hooks/use-admin-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { QueryError } from '@/components/patterns/query-error';
import { Pagination } from '@/components/patterns/pagination';
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Copy, Check, TicketPercent, Eye, Search, CalendarDays } from "lucide-react";
import { CouponModal } from "../components/coupon-modal";
import type { Coupon as CouponInput } from "@/lib/coupon-transforms";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { SectionHeader } from "@/components/patterns/section-header";
import { PageShell } from "@/components/patterns/page-shell";
import { ActionBar } from "@/components/patterns/action-bar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "../forge-commerce.css";

// Frontend interface using camelCase (matches transformed API data)
interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  validFrom: string | null;
  validTo: string | null;
  minPurchase?: number;
  maxDiscount?: number;
  isActive: boolean;
  createdAt: string;
  usageLimit?: number;
  timesUsed?: number;
}



export default function CouponsPage() {
  const { toast } = useToast();
  const runMutation = useAdminMutation();
  const { confirm: requestConfirmation, confirmationDialog } = useConfirmation();
  const [searchTerm, setSearchTerm] = useUrlState("searchTerm", "");
  const [activeFilter, setActiveFilter] = useUrlState("activeFilter", "all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | undefined>();
  const [viewingCoupon, setViewingCoupon] = useState<Coupon | undefined>();

  const [page, setPage] = useUrlState("page", 1);
  const search = useDebouncedValue(searchTerm);
  const filters = { page, limit: 20, search, ...(activeFilter !== 'all' ? { active: String(activeFilter === 'active') } : {}) };
  const listQuery = useAdminQuery(['coupons', filters], () => apiClient.getCoupons(filters));
  const coupons: Coupon[] = listQuery.data?.data ?? [];
  const filteredCoupons = coupons;
  const loading = listQuery.isLoading;
  const fetchCoupons = () => { void listQuery.refetch(); };


  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast({ title: "Could not copy code", description: "Select the coupon code and copy it manually.", variant: "destructive" });
    }
  };

  const isExpired = (validTo: string | null) =>
    validTo ? new Date(validTo) < new Date() : false;

  const isExpiringSoon = (validTo: string | null) => {
    if (!validTo) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(validTo).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCreateCoupon = () => {
    setSelectedCoupon(undefined);
    setIsModalOpen(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (await requestConfirmation({ title: "Delete this coupon?", description: "This permanently removes the coupon. Customers will no longer be able to redeem this code.", confirmLabel: "Delete coupon" })) {
      try {
        await runMutation(() => apiClient.deleteCoupon(id));
        toast({ title: "Success", description: "Coupon deleted successfully" });
        fetchCoupons();
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: ((error instanceof Error && error.message) || "Failed to delete coupon"),
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmitCoupon = async (couponData: CouponInput) => {
    try {
      if (selectedCoupon && selectedCoupon.id) {
        await runMutation(() => apiClient.updateCoupon(selectedCoupon.id, couponData));
        toast({ title: "Success", description: "Coupon updated successfully" });
      } else {
        await runMutation(() => apiClient.createCoupon(couponData));
        toast({ title: "Success", description: "Coupon created successfully" });
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: ((error instanceof Error && error.message) || "Failed to save coupon"),
        variant: "destructive",
      });
      throw error; // Re-throw to ensure error is properly handled
    }
  };

  return (
    <PageShell className="fc-page">
      <SectionHeader eyebrow="Commerce / Promotions" icon={<TicketPercent size={20} />} title="Discount coupons" description="Create offers that convert. Manage codes, eligibility and campaign windows in one place." actions={<Button onClick={handleCreateCoupon}>
        <Plus size={16} />Create coupon</Button>} />
      <QueryError error={listQuery.error} retry={fetchCoupons} />
      <div className="fa-stat-grid">
        <Card className="fa-stat">
          <span>Loaded coupons</span>
          <strong>{coupons.length}</strong>
          <small>On this page</small>
        </Card>
        <Card className="fa-stat">
          <span>Active</span>
          <strong className="fc-cyan">{coupons.filter((c) => c.isActive && !isExpired(c.validTo)).length}</strong>
          <small>On this page · not expired</small>
        </Card>
        <Card className="fa-stat">
          <span>Expired</span>
          <strong className="fc-red">{coupons.filter((c) => isExpired(c.validTo)).length}</strong>
          <small>On this page</small>
        </Card>
        <Card className="fa-stat">
          <span>Inactive</span>
          <strong>{coupons.filter((c) => !c.isActive).length}</strong>
          <small>On this page</small>
        </Card>
      </div>
      <ActionBar layout="filters" className="fc-filters fc-filters-two">
        <div className="fa-field"><label htmlFor="coupons-search">Search code</label><div className="fc-search">
          <Search size={17} aria-hidden="true" />
          <Input id="coupons-search" aria-label="Search coupons" placeholder="Search coupon code…" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
        </div></div>
        <div className="fa-field"><label htmlFor="coupons-status">Status</label><Select value={activeFilter} onValueChange={(value) => { setActiveFilter(value); setPage(1); }}>
          <SelectTrigger id="coupons-status" aria-label="Filter coupon status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select></div>
      </ActionBar>
      <section className="fa-panel fc-coupon-panel" aria-label="Coupon management">
        <div className="fa-panel-heading">
          <div>
            <h2>Promotion library</h2>
            <p>{listQuery.data?.count ?? coupons.length} matching coupons</p>
          </div>
          <span className="fc-panel-note">Copy a code to share an offer</span>
        </div>
        {loading ? <div className="fc-coupon-grid" aria-label="Loading coupons" aria-busy="true">{Array.from({ length: 3 }, (_, i) =>
          <div className="fc-coupon-skeleton" key={i} />)}</div> : filteredCoupons.length === 0 ? <div className="fc-empty">
            <TicketPercent size={34} />
            <h3>No coupons found</h3>
            <p>{searchTerm || activeFilter !== "all" ? "Try another code or clear the status filter." : "Create a coupon to start your next promotion."}</p>{searchTerm || activeFilter !== "all" ? <Button variant="outline" onClick={() => { setSearchTerm(""); setActiveFilter("all"); setPage(1); }}>Clear filters</Button> : <Button onClick={handleCreateCoupon}>
              <Plus size={16} />Create coupon</Button>}</div> : (
          <div className="fc-coupon-grid">{filteredCoupons.map((coupon) => {
            const expired = isExpired(coupon.validTo);
            const expiringSoon = isExpiringSoon(coupon.validTo);
            const tone = expired ? "is-danger" : !coupon.isActive ? "is-neutral" : expiringSoon ? "is-warning" : "is-success";
            const status = expired ? "Expired" : !coupon.isActive ? "Inactive" : expiringSoon ? "Expiring soon" : "Active";
            return <Card key={coupon.id} className={`fc-coupon-card ${expired || !coupon.isActive ? "is-inactive" : ""}`}>
              <div className="fc-coupon-header">
                <TicketPercent size={19} />
                <span className={`fa-status ${tone}`}>{status}</span>
              </div>
              <div className="fc-coupon-value">
                <strong>{coupon.discountType === "fixed" ? "$" : ""}{coupon.discountValue}{coupon.discountType === "percentage" ? "%" : ""}</strong>
                <span>off<br />{coupon.discountType === "percentage" ? "Percentage discount" : "Fixed discount"}</span>
              </div>
              <div className="fc-code-strip">
                <code>{coupon.code}</code>
                <Button variant="outline" size="icon" aria-label={`Copy ${coupon.code}`} onClick={() => void handleCopyCode(coupon.code)}>{copiedCode === coupon.code ? <Check size={16} className="fc-cyan" /> : <Copy size={16} />}</Button>
                <span className="sr-only" role="status">{copiedCode === coupon.code ? "Code copied" : ""}</span>
              </div>
              <div className="fc-coupon-validity">
                <CalendarDays size={15} aria-hidden="true" />
                <span>{coupon.validFrom ? formatDate(coupon.validFrom) : "Any start date"}<span> — </span>{coupon.validTo ? formatDate(coupon.validTo) : "No expiry"}</span>
              </div>
              <dl className="fc-coupon-rules">
                <div>
                  <dt>Minimum spend</dt>
                  <dd>{coupon.minPurchase && coupon.minPurchase > 0 ? `$${coupon.minPurchase}` : "No minimum"}</dd>
                </div>
                <div>
                  <dt>Discount cap</dt>
                  <dd>{coupon.maxDiscount ? `$${coupon.maxDiscount}` : "No cap set"}</dd>
                </div>{coupon.timesUsed != null && <div>
                  <dt>Redemptions</dt>
                  <dd>{coupon.timesUsed}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</dd>
                </div>}</dl>
              <div className="fc-card-actions">
                <Button variant="outline" className="fc-view-button" onClick={() => setViewingCoupon(coupon)}>
                  <Eye size={15} />Details</Button>
                <Button variant="outline" size="icon" aria-label={`Edit coupon ${coupon.code}`} onClick={() => handleEditCoupon(coupon)}>
                  <Edit2 size={16} />
                </Button>
                <Button variant="outline" size="icon" className="fc-danger-action" aria-label={`Delete coupon ${coupon.code}`} onClick={() => handleDeleteCoupon(coupon.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>;
          })}</div>
        )}
        {!loading && <Pagination page={page} pages={listQuery.data?.pages ?? 1} pending={listQuery.isFetching} onPage={setPage} total={listQuery.data?.count ?? coupons.length} pageSize={20} noun="coupons" />}
      </section>
      <CouponModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedCoupon(undefined); }} onSubmit={handleSubmitCoupon} initialData={selectedCoupon} />
      <Dialog open={!!viewingCoupon} onOpenChange={(open) => { if (!open) setViewingCoupon(undefined); }}>
        <DialogContent className="fc-modal fc-coupon-details">
          <div className="fc-modal-header">
            <span className="fa-kicker">Promotion overview</span>
            <DialogTitle>Coupon details</DialogTitle>
            <DialogDescription>Eligibility and validity for this promotion.</DialogDescription>
          </div>
          {viewingCoupon && <>
            <div className="fc-coupon-detail-code">
              <TicketPercent size={22} />
              <code>{viewingCoupon.code}</code>
            </div>
            <dl className="fc-detail-list">
              <div>
                <dt>Discount</dt>
                <dd>{viewingCoupon.discountType === "fixed" ? "$" : ""}{viewingCoupon.discountValue}{viewingCoupon.discountType === "percentage" ? "%" : ""} · {viewingCoupon.discountType}</dd>
              </div>
              <div>
                <dt>Valid from</dt>
                <dd>{viewingCoupon.validFrom ? formatDate(viewingCoupon.validFrom) : "Any start date"}</dd>
              </div>
              <div>
                <dt>Valid until</dt>
                <dd>{viewingCoupon.validTo ? formatDate(viewingCoupon.validTo) : "No expiry"}</dd>
              </div>
              <div>
                <dt>Minimum purchase</dt>
                <dd>{viewingCoupon.minPurchase ? `$${viewingCoupon.minPurchase}` : "No minimum"}</dd>
              </div>
              <div>
                <dt>Maximum discount</dt>
                <dd>{viewingCoupon.maxDiscount ? `$${viewingCoupon.maxDiscount}` : "No cap set"}</dd>
              </div>{viewingCoupon.usageLimit != null && <div>
                <dt>Usage limit</dt>
                <dd>{viewingCoupon.usageLimit}</dd>
              </div>}{viewingCoupon.timesUsed != null && <div>
                <dt>Times used</dt>
                <dd>{viewingCoupon.timesUsed}</dd>
              </div>}<div>
                <dt>Enabled</dt>
                <dd>
                  <span className={`fa-status ${viewingCoupon.isActive ? "is-success" : "is-neutral"}`}>{viewingCoupon.isActive ? "Active" : "Inactive"}</span>
                </dd>
              </div>
            </dl>
            <div className="fc-modal-footer">
              <Button variant="outline" onClick={() => { setViewingCoupon(undefined); handleEditCoupon(viewingCoupon); }}>
                <Edit2 size={15} />Edit coupon</Button>
              <Button onClick={() => setViewingCoupon(undefined)}>Close</Button>
            </div>
          </>}
        </DialogContent>
      </Dialog>
      {confirmationDialog}
    </PageShell>
  );
}
