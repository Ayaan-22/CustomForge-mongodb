"use client"
import "../forge-operations.css";
import { useRef } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Shield, Lock, Mail, CheckCircle, User } from "lucide-react"
import { format } from "date-fns"
import type { AdminUserPaymentMethod } from "@/types/admin"

interface UserDetails {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  phone?: string
  address?: string
  is_email_verified: boolean
  two_factor_enabled: boolean
  active: boolean
  stripe_customer_id?: string
  payment_methods?: AdminUserPaymentMethod[]
  created_at: string
  updated_at?: string
}

interface UserDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserDetails | null
}

export function UserDetailsModal({ isOpen, onClose, user }: UserDetailsModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  if (!user) return null

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4 text-[var(--fa-violet)]" />
      case "publisher":
        return <User className="w-4 h-4 text-primary" />
      default:
        return <User className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fo-modal"
        onOpenAutoFocus={() => { returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">User details</DialogTitle>
          <DialogDescription>Account identity, verification and billing information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
            <div className="fo-detail-grid">
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                <p className="text-foreground font-medium">{user.name}</p>
              </div>
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Email</p>
                <p className="text-foreground font-medium">{user.email}</p>
              </div>
              {user.phone && (
                <div className="fo-detail-cell">
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <p className="text-foreground font-medium">{user.phone}</p>
                </div>
              )}
              {user.address && (
                <div className="fo-detail-cell">
                  <p className="text-xs text-muted-foreground mb-1">Address</p>
                  <p className="text-foreground font-medium text-sm">{user.address}</p>
                </div>
              )}
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Role</p>
                <div className="flex items-center gap-2 text-foreground font-medium">
                  {getRoleIcon(user.role)}
                  {getRoleLabel(user.role)}
                </div>
              </div>
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">User ID</p>
                <p className="text-foreground font-mono text-sm">{user.id}</p>
              </div>
            </div>
          </div>

          {/* Security & Verification */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Security & Verification</h3>
            <div className="fo-detail-grid">
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-2">Email Verification</p>
                <div className="flex items-center gap-2">
                  {user.is_email_verified ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-[var(--fa-success)]" />
                      <span className="text-[var(--fa-success)] font-medium">Verified</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-[var(--fa-warning)]" />
                      <span className="text-[var(--fa-warning)] font-medium">Pending</span>
                    </>
                  )}
                </div>
              </div>
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-2">Two-Factor Authentication</p>
                <div className="flex items-center gap-2">
                  {user.two_factor_enabled ? (
                    <>
                      <Lock className="w-4 h-4 text-[var(--fa-success)]" />
                      <span className="text-[var(--fa-success)] font-medium">Enabled</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground font-medium">Disabled</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account Status</h3>
            <div className="fo-detail-cell">
              <p className="text-xs text-muted-foreground mb-2">Status</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user.active ? "bg-[var(--fa-success)]" : "bg-[var(--fa-danger)]"}`} />
                <span className={`font-medium ${user.active ? "text-[var(--fa-success)]" : "text-[var(--fa-danger)]"}`}>
                  {user.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          {user.stripe_customer_id && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Billing Information</h3>
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Stripe Customer ID</p>
                <p className="text-foreground font-mono text-sm">{user.stripe_customer_id}</p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timestamps</h3>
            <div className="fo-detail-grid">
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Created At</p>
                <p className="text-foreground font-medium text-sm">
                  {user.created_at && !isNaN(new Date(user.created_at).getTime())
                    ? format(new Date(user.created_at), "MMM dd, yyyy HH:mm")
                    : "N/A"}
                </p>
              </div>
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                <p className="text-foreground font-medium text-sm">
                  {user.updated_at && !isNaN(new Date(user.updated_at).getTime())
                    ? format(new Date(user.updated_at), "MMM dd, yyyy HH:mm")
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
