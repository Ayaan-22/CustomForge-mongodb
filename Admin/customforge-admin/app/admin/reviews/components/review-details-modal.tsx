"use client";

import "../../forge-operations.css";
import { useState, useRef } from "react";
import { Star, Flag, BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

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
    avatar?: string;
  };
  product?: {
    name: string;
  };
}

interface ReviewDetailsModalProps {
  review: Review;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModerate: (id: string, action: "approve" | "reject") => Promise<void>;
}

export function ReviewDetailsModal({ review, open, onOpenChange, onModerate }: ReviewDetailsModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const safeFormatDate = (dateValue: string, formatStr: string) => {
    if (!dateValue) return "N/A";
    const parsed = new Date(dateValue);
    if (isNaN(parsed.getTime())) return "Invalid Date";
    return format(parsed, formatStr);
  };
  const moderate = async (action: "approve" | "reject") => {
    if (pendingAction) return;
    setPendingAction(action);
    try { await onModerate(review.id, action); } finally { setPendingAction(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fo-modal"
        onOpenAutoFocus={() => { returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}
      >
        <DialogHeader>
          <span className="fa-kicker">Review inspection</span>
          <DialogTitle>{review.title || "Review details"}</DialogTitle>
          <DialogDescription>{review.product?.name || "Unknown Product"} · Submitted by {review.user?.name || "Unknown User"}</DialogDescription>
        </DialogHeader>
        <div className="fo-detail-grid">
          <div className="fo-detail-cell"><p>Customer rating</p><div className="fo-rating" role="img" aria-label={`${review.rating} out of 5 stars`}>{Array.from({length: 5}, (_, i) => <Star key={i} aria-hidden="true" className={i < review.rating ? "fill-current" : "text-muted-foreground/40"} />)}<span className="ml-2 text-sm text-foreground">{review.rating}/5</span></div></div>
          <div className="fo-detail-cell"><p>Purchase verification</p><span className={`fa-status ${review.verified_purchase ? "is-success" : "is-neutral"}`}><BadgeCheck className="w-3.5 h-3.5" />{review.verified_purchase ? "Verified purchase" : "Not verified"}</span></div>
        </div>
        <section className="fo-modal-section"><h3>Customer feedback</h3><p className="fo-review-comment">{review.comment}</p></section>
        <div className="fo-detail-grid">
          <div className="fo-detail-cell"><p>Helpful votes</p><p>{review.helpful_votes}</p></div>
          <div className="fo-detail-cell"><p>Visibility</p><span className={`fa-status ${review.is_active ? "is-success" : "is-neutral"}`}>{review.is_active ? "Active" : "Inactive"}</span></div>
        </div>
        {review.reported && <div className="fo-error-note"><p className="flex items-center gap-2 font-medium mb-2"><Flag className="w-4 h-4" /> Reported review</p><p>{review.report_reason || "No reason provided"}</p></div>}
        {review.media && review.media.length > 0 && <section className="fo-modal-section"><h3>Attached media · {review.media.length}</h3><div className="fo-review-media">{review.media.map((url, idx) => <img loading="lazy" key={idx} src={url || "/placeholder.svg"} alt={`Review media ${idx + 1}`} />)}</div></section>}
        <div className="fo-detail-grid">
          <div className="fo-detail-cell"><p>Created</p><p>{safeFormatDate(review.created_at, "MMM dd, yyyy HH:mm")}</p></div>
          <div className="fo-detail-cell"><p>Last updated</p><p>{safeFormatDate(review.updated_at, "MMM dd, yyyy HH:mm")}</p></div>
        </div>
        <div className="fo-modal-footer fo-review-footer">
          <div className="flex gap-2">
            {(review.reported || !review.is_active) && <Button disabled={pendingAction !== null} onClick={() => moderate("approve")}>{pendingAction === "approve" && <Loader2 className="w-4 h-4 animate-spin" />} {pendingAction === "approve" ? "Approving…" : "Approve"}</Button>}
            {review.is_active && <Button disabled={pendingAction !== null} variant="destructive" onClick={() => moderate("reject")}>{pendingAction === "reject" && <Loader2 className="w-4 h-4 animate-spin" />} {pendingAction === "reject" ? "Rejecting…" : "Reject"}</Button>}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
