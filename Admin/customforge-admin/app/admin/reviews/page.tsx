"use client";
import "../forge-operations.css";
import {useUrlState} from "@/hooks/use-url-state";
import {useAdminMutation} from "@/hooks/use-admin-mutation";
import { useConfirmation } from "@/hooks/use-confirmation";

import {useAdminQuery} from '@/hooks/use-admin-query';
import {useDebouncedValue} from '@/hooks/use-debounced-value';
import {QueryError} from '@/components/patterns/query-error';
import {Pagination} from '@/components/patterns/pagination';
import { useState } from "react";
import { Search, Star, Eye, Trash2, MessageSquare, BadgeCheck, Flag, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeader } from "@/components/patterns/section-header";
import { PageShell } from "@/components/patterns/page-shell";
import { ActionBar } from "@/components/patterns/action-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/patterns/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { ReviewDetailsModal } from "./components/review-details-modal";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string;
  comment: string;
  verified_purchase: boolean;
  helpful_votes: number;
  reported: boolean;
  report_reason?: string;
  media: string[];
  platform?: string;
  playtime_hours?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    name: string;
    email: string;
  };
  product?: {
    name: string;
  };
}

export default function ReviewsPage() {
  const { toast } = useToast();
  const runMutation = useAdminMutation();
  const { confirm, confirmationDialog } = useConfirmation();
  const [searchTerm, setSearchTerm] = useUrlState("searchTerm", "");
  const [ratingFilter, setRatingFilter] = useUrlState("ratingFilter", "all");
  const [reportedFilter, setReportedFilter] = useUrlState("reportedFilter", "all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [page, setPage] = useUrlState("page", 1);
  const search = useDebouncedValue(searchTerm);
  const filters = {page, limit: 20, search, ...(ratingFilter !== 'all' ? {rating: ratingFilter} : {}), ...(reportedFilter !== 'all' ? {reported: String(reportedFilter === 'reported')} : {})};
  const listQuery = useAdminQuery(['reviews', filters], () => apiClient.getReviews(filters));
  const reviews: Review[] = listQuery.data?.data ?? [];
  const filteredReviews = reviews;
  const loading = listQuery.isLoading;
  const fetchReviews = () => {void listQuery.refetch();};


  const stats = {
    total: reviews?.length || 0,
    verified: reviews?.filter((r) => r.verified_purchase).length || 0,
    reported: reviews?.filter((r) => r.reported).length || 0,
    withMedia:
      reviews?.filter((r) => r.media && r.media.length > 0).length || 0,
    averageRating:
      reviews && reviews.length > 0
        ? (
            reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          ).toFixed(1)
        : 0,
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setShowDetailsModal(true);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (await confirm({ title: "Delete review?", description: "Are you sure you want to delete this review?", confirmLabel: "Delete review" })) {
      try {
        await runMutation(() => apiClient.deleteReview(reviewId));
        toast({ title: "Success", description: "Review deleted successfully" });
        fetchReviews();
      } catch (err: unknown) {
        console.error("Failed to delete review:", err);
        toast({
          title: "Error",
          description: ((err instanceof Error && err.message) || "Failed to delete review"),
          variant: "destructive",
        });
      }
    }
  };

  return (
    <PageShell className="fo-page">
      <SectionHeader eyebrow="Community trust" title="Review moderation" description="Review customer feedback, investigate reports and keep product conversations useful." icon={<MessageSquare />} />
      <QueryError error={listQuery.error} retry={fetchReviews} />
      <div className="fo-stats fo-stats-five" aria-label="Reviews on the current page">
        {[{label: "Reviews", value: stats.total, icon: MessageSquare}, {label: "Verified purchases", value: stats.verified, icon: BadgeCheck}, {label: "Reported", value: stats.reported, icon: Flag}, {label: "With media", value: stats.withMedia, icon: ImageIcon}, {label: "Average rating", value: stats.averageRating, icon: Star}].map(({label, value, icon: Icon}) => <div className="fo-stat" key={label}><div className="fo-stat-head"><p className="fo-stat-label">{label}</p><Icon className="fo-stat-icon" aria-hidden="true" /></div><p className="fo-stat-value">{loading ? "—" : value}</p><p className="fo-stat-note">On this results page</p></div>)}
      </div>
      <ActionBar className="fo-toolbar" layout="filters">
        <div className="fo-field"><label htmlFor="reviews-search">Search feedback</label><div className="fo-search"><Search aria-hidden="true" /><Input id="reviews-search" placeholder="Title or comment…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div></div>
        <div className="fo-field"><label htmlFor="reviews-rating">Rating</label><Select value={ratingFilter} onValueChange={setRatingFilter}><SelectTrigger id="reviews-rating"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All ratings</SelectItem>{[5,4,3,2,1].map((rating) => <SelectItem key={rating} value={String(rating)}>{rating} {rating === 1 ? "star" : "stars"}</SelectItem>)}</SelectContent></Select></div>
        <div className="fo-field"><label htmlFor="reviews-status">Report status</label><Select value={reportedFilter} onValueChange={setReportedFilter}><SelectTrigger id="reviews-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All reviews</SelectItem><SelectItem value="not-reported">Not reported</SelectItem><SelectItem value="reported">Reported</SelectItem></SelectContent></Select></div>
      </ActionBar>
      {/* Reviews Table */}
      <Card className="fa-panel fa-results-panel">
        <div className="fa-panel-heading"><div><h2>Review queue</h2><p>Inspect purchase verification, helpful votes and reports.</p></div><span className="fo-count">{listQuery.data?.count ?? reviews.length} reviews</span></div>
        {loading ? (
          <div className="fo-loading" role="status" aria-label="Loading reviews"><span className="fo-loading-label">Loading review queue…</span>{[0,1,2].map((row) => <div key={row} className="fo-loading-bar" />)}</div>
        ) : (
          <>
            <div className="fa-table-scroll" role="region" aria-label="Review moderation" tabIndex={0}>
              <table className="fa-data-table fo-table" aria-label="Product reviews">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Product
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Verified
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Helpful
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map((review) => (
                    <tr
                      key={review.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-foreground">
                        <span className={review.product?.name ? undefined : "font-mono text-xs"}>{review.product?.name || review.product_id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="fo-rating" role="img" aria-label={`${review.rating} out of 5 stars`}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "text-[var(--fa-warning)] fill-current"
                                  : "text-muted-foreground/40"
                              }`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground truncate max-w-xs">
                        {review.title}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`fa-status ${review.verified_purchase ? "is-success" : "is-neutral"}`}
                        >
                          {review.verified_purchase ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {review.helpful_votes}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`fa-status ${review.reported ? "is-danger" : review.is_active ? "is-success" : "is-neutral"}`}
                        >
                          {review.reported ? "Reported" : review.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="fo-actions">
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`View review: ${review.title}`}
                            onClick={() => handleViewDetails(review)}
                            className="size-11"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`Delete review: ${review.title}`}
                            onClick={() => handleDeleteReview(review.id)}
                            className="size-11 fo-danger"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredReviews.length === 0 && (
              <EmptyState className="m-5" icon={<MessageSquare />} title="No reviews to show" description="Change your search or filters to explore more feedback." />
            )}
          </>
        )}
        {!loading && (listQuery.data?.count ?? reviews.length) > 0 && <Pagination page={page} pages={listQuery.data?.pages ?? 1} pending={listQuery.isFetching} onPage={setPage} total={listQuery.data?.count ?? reviews.length} pageSize={20} noun="reviews" />}
      </Card>
      {/* Review Details Modal */}
      {selectedReview && (
        <ReviewDetailsModal
          review={selectedReview}
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          onModerate={async (id, action) => {
            try {
              await runMutation(() => apiClient.moderateReview(id, { action }));
              toast({
                title: "Success",
                description: action === "approve" ? "Review approved successfully" : "Review rejected successfully",
              });
              setShowDetailsModal(false);
              fetchReviews();
            } catch (error: unknown) {
              toast({
                title: "Error",
                description: ((error instanceof Error && error.message) || "Failed to moderate review"),
                variant: "destructive",
              });
            }
          }}
        />
      )}
      {confirmationDialog}
    </PageShell>
  );
}
