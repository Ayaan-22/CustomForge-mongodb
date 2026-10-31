"use client";
import "../forge-operations.css";
import { useRef } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Check } from "lucide-react";
import { useAdminUserDetail } from "@/hooks/api/use-admin-user-detail";
import type { AdminUserPaymentMethod } from "@/types/admin";

function maskCardNumber(raw: string) {
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `•••• •••• •••• ${digits.slice(-4)}`;
}

interface UserPaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id?: string; name?: string } | null;
}

export function UserPaymentMethodsModal({ isOpen, onClose, user }: UserPaymentMethodsModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const userId = user?.id;
  const { data, isPending, isError, error } = useAdminUserDetail(userId, isOpen);

  const paymentMethods: AdminUserPaymentMethod[] = data?.paymentMethods ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fo-modal"
        onOpenAutoFocus={() => { returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--fa-success)]" />
            Payment methods — {user?.name ?? "User"}
          </DialogTitle>
          <DialogDescription>Payment details are shown with masked card numbers.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full bg-muted" />
              <Skeleton className="h-28 w-full bg-muted" />
            </div>
          ) : isError ? (
            <p className="fo-error-note" role="alert">
              {error instanceof Error ? error.message : "Failed to load payment methods"}
            </p>
          ) : paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
              <Card key={method.id} className="fo-record-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-foreground font-semibold font-mono text-sm">
                        {maskCardNumber(method.cardNumber)}
                      </h4>
                      {method.isDefault && (
                        <span className="flex items-center gap-1 fa-status is-success">
                          <Check className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">Cardholder: {method.cardHolderName}</p>
                    <p className="text-muted-foreground text-sm mb-2">
                      Type:{" "}
                      <span className="capitalize">{String(method.type).replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-muted-foreground text-sm mb-2">
                      Expires: {String(method.expiryMonth).padStart(2, "0")}/{method.expiryYear}
                    </p>
                    <div className="pt-2 border-t border-border">
                      <p className="text-muted-foreground text-xs font-semibold mb-1">Billing address</p>
                      <p className="text-muted-foreground text-xs">{method.billingAddress?.address}</p>
                      <p className="text-muted-foreground text-xs">
                        {method.billingAddress?.city}, {method.billingAddress?.state}{" "}
                        {method.billingAddress?.postalCode}
                      </p>
                      <p className="text-muted-foreground text-xs">{method.billingAddress?.country}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="fo-empty-record" role="status"><CreditCard aria-hidden="true" /><p>No saved payment methods for this user.</p></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
