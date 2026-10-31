"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, TicketPercent } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { couponDateForSubmit, couponFormDate } from "@/lib/coupon-dates";
import "../forge-commerce.css";

interface Coupon {
  id?: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  validFrom: string | null;
  validTo: string | null;
  minPurchase?: number;
  maxDiscount?: number;
  isActive: boolean;
  createdAt?: string;
  usageLimit?: number;
  timesUsed?: number;
}

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (coupon: Coupon) => Promise<void> | void;
  initialData?: Coupon;
}

export function CouponModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: CouponModalProps) {
  const [formData, setFormData] = useState<Coupon>({
    code: "",
    discountType: "percentage",
    discountValue: 0,
    validFrom: new Date().toISOString().split("T")[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    minPurchase: 0,
    maxDiscount: undefined,
    isActive: true,
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        validFrom: initialData.validFrom ? couponFormDate(initialData.validFrom) : null,
        validTo: initialData.validTo ? couponFormDate(initialData.validTo) : null,
      });
    } else {
      setFormData({
        code: "",
        discountType: "percentage",
        discountValue: 0,
        validFrom: new Date().toISOString().split("T")[0],
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        minPurchase: 0,
        maxDiscount: undefined,
        isActive: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = "Coupon code is required";
    } else if (formData.code.length < 3) {
      newErrors.code = "Code must be at least 3 characters";
    }

    if (formData.discountValue <= 0) {
      newErrors.discountValue = "Discount value must be greater than 0";
    }

    if (
      formData.discountType === "percentage" &&
      formData.discountValue > 100
    ) {
      newErrors.discountValue = "Percentage discount cannot exceed 100%";
    }

    const validFrom = formData.validFrom ? new Date(formData.validFrom) : null;
    const validTo = formData.validTo ? new Date(formData.validTo) : null;
    if (validFrom && Number.isNaN(validFrom.getTime())) newErrors.validFrom = "Choose a valid start date";
    if (validTo && Number.isNaN(validTo.getTime())) newErrors.validTo = "Choose a valid end date";
    // Unchanged dates retain their precise timestamps, including a campaign ending later on the same day.
    if (validFrom && validTo && !Number.isNaN(validFrom.getTime()) && !Number.isNaN(validTo.getTime())) {
      const start = couponDateForSubmit(formData.validFrom, initialData?.validFrom);
      const end = couponDateForSubmit(formData.validTo, initialData?.validTo);
      if (start && end && new Date(end) <= new Date(start)) newErrors.validTo = "Valid to date must be after valid from date";
    }

    if (formData.minPurchase && formData.minPurchase < 0) {
      newErrors.minPurchase = "Minimum purchase cannot be negative";
    }

    if (formData.maxDiscount && formData.maxDiscount < 0) {
      newErrors.maxDiscount = "Maximum discount cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !validateForm()) return;
    setSaving(true);
    try {
      await onSubmit({
        ...formData,
        code: formData.code.toUpperCase(),
        validFrom: couponDateForSubmit(formData.validFrom, initialData?.validFrom),
        validTo: couponDateForSubmit(formData.validTo, initialData?.validTo),
      });
      onClose();
    } catch (error) {
      setErrors((prev) => ({ ...prev, submit: error instanceof Error ? error.message : "Could not save this coupon. Please try again." }));
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: string) => errors[key] ? <p id={`coupon-${key}-error`} className="fc-form-error">
    <AlertCircle size={13} aria-hidden="true" />{errors[key]}</p> : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="fc-modal fc-coupon-editor">
        <div className="fc-modal-header">
          <span className="fa-kicker">Promotion editor</span>
          <DialogTitle>{initialData ? "Edit coupon" : "Create a coupon"}</DialogTitle>
          <DialogDescription>Choose a discount, set its campaign window and define purchase eligibility.</DialogDescription>
        </div>
        <form onSubmit={handleSubmit} className="fc-coupon-form">
          <section className="fa-modal-section">
            <h3 className="fc-editor-section-title">
              <TicketPercent size={16} />Offer details</h3>
            <div className="fa-field">
              <label htmlFor="coupon-code">Coupon code *</label>
              <Input id="coupon-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} disabled={!!initialData} placeholder="e.g. LEVELUP20" className="font-mono uppercase" required aria-invalid={!!errors.code} aria-describedby={errors.code ? "coupon-code-error" : undefined} />{fieldError("code")}<p className="fc-muted">{initialData ? "The code stays fixed when editing a coupon." : "Codes are saved in uppercase."}</p>
            </div>
            <div className="fa-form-grid fc-field-after">
              <div className="fa-field">
                <label htmlFor="coupon-discount-type">Discount type</label>
                <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value as "percentage" | "fixed" })}>
                  <SelectTrigger id="coupon-discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="fa-field">
                <label htmlFor="coupon-discount-value">Discount value *</label>
                <Input id="coupon-discount-value" type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: Number.parseFloat(e.target.value) || 0 })} placeholder="0" min="0" step="0.01" required aria-invalid={!!errors.discountValue} aria-describedby={errors.discountValue ? "coupon-discountValue-error" : undefined} />{fieldError("discountValue")}</div>
            </div>
          </section>
          <section className="fa-modal-section">
            <h3 className="fc-editor-section-title">Campaign window</h3>
            <div className="fa-form-grid">
              <div className="fa-field">
                <label htmlFor="coupon-valid-from">Valid from</label>
                <Input id="coupon-valid-from" type="date" value={formData.validFrom ?? ""} onChange={(e) => setFormData({ ...formData, validFrom: e.target.value || null })} aria-invalid={!!errors.validFrom} aria-describedby={errors.validFrom ? "coupon-validFrom-error coupon-start-help" : "coupon-start-help"} />
                <p id="coupon-start-help" className="fc-muted">Leave blank for no start restriction.</p>{fieldError("validFrom")}
              </div>
              <div className="fa-field">
                <label htmlFor="coupon-valid-to">Valid until</label>
                <Input id="coupon-valid-to" type="date" value={formData.validTo ?? ""} onChange={(e) => setFormData({ ...formData, validTo: e.target.value || null })} aria-invalid={!!errors.validTo} aria-describedby={errors.validTo ? "coupon-validTo-error coupon-end-help" : "coupon-end-help"} />
                <p id="coupon-end-help" className="fc-muted">Leave blank for no expiry.</p>{fieldError("validTo")}</div>
            </div>
          </section>
          <section className="fa-modal-section">
            <h3 className="fc-editor-section-title">Eligibility & limits</h3>
            <div className="fa-form-grid">
              <div className="fa-field">
                <label htmlFor="coupon-min-purchase">Minimum purchase ($)</label>
                <Input id="coupon-min-purchase" type="number" value={formData.minPurchase ?? ""} onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value ? Number.parseFloat(e.target.value) : undefined })} placeholder="No minimum" min="0" step="0.01" aria-invalid={!!errors.minPurchase} aria-describedby={errors.minPurchase ? "coupon-minPurchase-error" : undefined} />{fieldError("minPurchase")}</div>
              <div className="fa-field">
                <label htmlFor="coupon-max-discount">Maximum discount ($)</label>
                <Input id="coupon-max-discount" type="number" value={formData.maxDiscount ?? ""} onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value ? Number.parseFloat(e.target.value) : undefined })} placeholder="No cap" min="0" step="0.01" aria-invalid={!!errors.maxDiscount} aria-describedby={errors.maxDiscount ? "coupon-maxDiscount-error" : undefined} />{fieldError("maxDiscount")}</div>
            </div>
          </section>
          <div className="fc-publish-controls">
            <label htmlFor="coupon-is-active">
              <input id="coupon-is-active" type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />Enable this coupon</label>
          </div>
          {errors.submit && <p className="fc-form-error" role="alert">
            <AlertCircle size={15} />{errors.submit}</p>}
          <div className="fc-modal-footer">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving coupon…" : initialData ? "Update coupon" : "Create coupon"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
