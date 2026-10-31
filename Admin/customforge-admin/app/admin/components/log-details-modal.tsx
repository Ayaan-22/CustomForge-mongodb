"use client"
import "../forge-operations.css";
import { useRef } from "react";

import type React from "react"
import type { LogEntry } from "@/types/logs"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertCircle, AlertTriangle, Info } from "lucide-react"

interface LogDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  log: { level?: string; action: string; admin: string; date?: string; details: LogEntry } | null
}

const levelIcons: Record<string, React.ReactNode> = {
  info: <Info className="w-5 h-5 text-primary" />,
  warn: <AlertTriangle className="w-5 h-5 text-[var(--fa-warning)]" />,
  error: <AlertCircle className="w-5 h-5 text-[var(--fa-danger)]" />,
}

const levelColors: Record<string, string> = {
  info: "is-neutral",
  warn: "is-warning",
  error: "is-danger",
}

export function LogDetailsModal({ isOpen, onClose, log }: LogDetailsModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  if (!log) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fo-modal"
        onOpenAutoFocus={() => { returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
        onCloseAutoFocus={(event) => { event.preventDefault(); returnFocusRef.current?.focus(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">Event details</DialogTitle>
          <DialogDescription>Inspect the event context and original system record.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Level Badge */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Log Level</h3>
            <div
              className={`fa-status w-fit ${levelColors[log.level ?? "info"] || levelColors.info}`}
            >
              {levelIcons[log.level ?? "info"] || levelIcons.info}
              {String(log.level || "info").toUpperCase()}
            </div>
          </div>

          {/* Action & Admin */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Action Details</h3>
            <div className="fo-detail-grid">
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Action</p>
                <p className="text-foreground font-medium">{log.action}</p>
              </div>
              <div className="fo-detail-cell">
                <p className="text-xs text-muted-foreground mb-1">Performed By</p>
                <p className="text-foreground font-medium">{log.admin}</p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timestamp</h3>
            <div className="fo-detail-cell">
              <p className="text-foreground font-mono text-sm">{log.date}</p>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="fo-modal-section">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Detailed Information</h3>
            <div className="fo-code-block">
              <pre className="text-muted-foreground text-xs overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
