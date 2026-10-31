"use client"
import "../forge-operations.css";

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"

interface User {
  id: string
  name: string
  email: string
  password?: string
  role: string
  avatar: string
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (user: Partial<User>) => Promise<void>
  initialData?: Partial<User> | null
}

export function UserModal({ isOpen, onClose, onSubmit, initialData }: UserModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: "",
    email: "",
    password: "",
    role: "user",
    avatar: "default.jpg",
    isEmailVerified: false,
    twoFactorEnabled: false,
    active: true,
  })

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isEditing = !!initialData

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        role: initialData.role,
        avatar: initialData.avatar,
        isEmailVerified: initialData.isEmailVerified,
        twoFactorEnabled: initialData.twoFactorEnabled,
        active: initialData.active,
      })
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "user",
        avatar: "default.jpg",
        isEmailVerified: false,
        twoFactorEnabled: false,
        active: true,
      })
    }
    setErrors({})
  }, [initialData, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = "Name is required"
    } else if (formData.name.length > 50) {
      newErrors.name = "Name cannot exceed 50 characters"
    }

    if (!formData.email || formData.email.trim().length === 0) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format"
    }

    if (!isEditing) {
      if (!formData.password || formData.password.length === 0) {
        newErrors.password = "Password is required"
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saving && validateForm()) {
      setSaving(true)
      const {name, email, password, role, active} = formData
      try { await onSubmit({name, email, role, ...(isEditing ? {active} : {password})}) } finally { setSaving(false) }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fo-modal fo-user-editor"
        onOpenAutoFocus={() => { returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update identity, access and account status." : "Create an account and choose its access level."}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="user-editor-name" className="block text-sm font-medium text-muted-foreground mb-2">
              Name <span className="text-[var(--fa-danger)]">*</span>
            </label>
            <Input
              id="user-editor-name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "user-editor-name-error" : undefined}
              aria-label="Name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter user name"
              className="bg-muted border-input text-foreground placeholder:text-muted-foreground"
            />
            {errors.name && <p id="user-editor-name-error" role="alert" className="text-[var(--fa-danger)] text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="user-editor-email" className="block text-sm font-medium text-muted-foreground mb-2">
              Email <span className="text-[var(--fa-danger)]">*</span>
            </label>
            <Input
              type="email"
              id="user-editor-email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "user-editor-email-error" : undefined}
              aria-label="Email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              className="bg-muted border-input text-foreground placeholder:text-muted-foreground"
            />
            {errors.email && <p id="user-editor-email-error" role="alert" className="text-[var(--fa-danger)] text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Password - Only for new users */}
          {!isEditing && (
            <div>
              <label htmlFor="user-editor-password" className="block text-sm font-medium text-muted-foreground mb-2">
                Password <span className="text-[var(--fa-danger)]">*</span>
              </label>
              <Input
                type="password"
                id="user-editor-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "user-editor-password-error" : undefined}
                autoComplete="new-password"
                aria-label="Password"
                value={formData.password || ""}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password (min 8 characters)"
                className="bg-muted border-input text-foreground placeholder:text-muted-foreground"
              />
              {errors.password && <p id="user-editor-password-error" role="alert" className="text-[var(--fa-danger)] text-xs mt-1">{errors.password}</p>}
            </div>
          )}

          {/* Role */}
          <div>
            <label htmlFor="user-editor-role" className="block text-sm font-medium text-muted-foreground mb-2">Role</label>
            <Select value={formData.role || "user"} onValueChange={(role) => setFormData({ ...formData, role: role as User["role"] })}>
              <SelectTrigger id="user-editor-role" aria-label="Role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
            </Select>
          </div>

          {/* Verification and 2FA are managed by the account owner. */}
          {/* Active Status */}
          <div className="fo-check-row">
            <input
              type="checkbox"
              id="user-editor-active"
              checked={formData.active ?? true}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 rounded bg-muted border-input"
            />
            <label htmlFor="user-editor-active" className="text-sm text-muted-foreground">
              Active Account
            </label>
          </div>

          {/* Buttons */}
          <div className="fo-modal-footer">
            <Button type="button" onClick={onClose} variant="outline">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1"
            >
              {saving ? "Saving account…" : isEditing ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
