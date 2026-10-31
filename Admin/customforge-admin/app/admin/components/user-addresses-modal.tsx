"use client";
import "../forge-operations.css";
import { useRef } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Check } from "lucide-react";
import { useAdminUserDetail } from "@/hooks/api/use-admin-user-detail";
import type { AdminUserAddress } from "@/types/admin";

interface UserAddressesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id?: string; name?: string } | null;
}

export function UserAddressesModal({ isOpen, onClose, user }: UserAddressesModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const userId = user?.id;
  const { data, isPending, isError, error } = useAdminUserDetail(userId, isOpen);

  const addresses: AdminUserAddress[] = data?.addresses ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fo-modal"
        onOpenAutoFocus={() => { returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Addresses — {user?.name ?? "User"}
          </DialogTitle>
          <DialogDescription>Shipping details saved by this account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full bg-muted" />
              <Skeleton className="h-24 w-full bg-muted" />
            </div>
          ) : isError ? (
            <p className="fo-error-note" role="alert">
              {error instanceof Error ? error.message : "Failed to load addresses"}
            </p>
          ) : addresses.length > 0 ? (
            addresses.map((address) => (
              <Card key={address.id} className="fo-record-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-foreground font-semibold">{address.label}</h4>
                      {address.isDefault && (
                        <span className="flex items-center gap-1 fa-status is-success">
                          <Check className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">{address.fullName}</p>
                    <p className="text-muted-foreground text-sm mb-1">{address.address}</p>
                    <p className="text-muted-foreground text-sm mb-1">
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    <p className="text-muted-foreground text-sm mb-1">{address.country}</p>
                    {address.phoneNumber ? (
                      <p className="text-muted-foreground text-sm">{address.phoneNumber}</p>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="fo-empty-record" role="status"><MapPin aria-hidden="true" /><p>No addresses on file for this user.</p></div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
