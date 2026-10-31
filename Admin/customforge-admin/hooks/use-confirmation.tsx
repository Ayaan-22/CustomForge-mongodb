"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Confirmation = { title: string; description: string; confirmLabel?: string; variant?: "default" | "destructive" };

/** A keyboard accessible replacement for native confirm dialogs. No action runs until approval. */
export function useConfirmation() {
  const [request, setRequest] = useState<Confirmation | null>(null);
  const resolve = useRef<((confirmed: boolean) => void) | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => () => { resolve.current?.(false); resolve.current = null; }, []);

  function confirm(next: Confirmation): Promise<boolean> {
    if (resolve.current) return Promise.resolve(false);
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRequest(next);
    return new Promise<boolean>(done => { resolve.current = done; });
  }
  function settle(confirmed: boolean) {
    resolve.current?.(confirmed);
    resolve.current = null;
    setRequest(null);
  }

  const confirmationDialog = (
    <AlertDialog open={Boolean(request)} onOpenChange={open => { if (!open) settle(false); }}>
      <AlertDialogContent className="fa-confirmation" onCloseAutoFocus={event => {
        if (opener.current?.isConnected) { event.preventDefault(); opener.current.focus(); }
      }}>
        <div className="fa-confirmation-icon" aria-hidden><ShieldAlert size={24} /></div>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title ?? "Confirm action"}</AlertDialogTitle>
          <AlertDialogDescription>{request?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild><Button variant="outline" type="button" onClick={() => settle(false)}>Cancel</Button></AlertDialogCancel>
          <AlertDialogAction asChild><Button variant={request?.variant ?? "destructive"} type="button" onClick={() => settle(true)}>{request?.confirmLabel ?? "Delete"}</Button></AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { confirm, confirmationDialog };
}
