import { AlertCircle, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type OrderAction = "cancel" | "return";

export function OrderActionDialog({
  action,
  orderReference,
  eligible,
  pending,
  checking,
  statusUnavailable,
  error,
  reviewRequired,
  onClose,
  onConfirm,
  onRefresh,
  onRestoreFocus,
}: {
  action: OrderAction | null;
  orderReference: string;
  eligible: boolean;
  pending: boolean;
  checking: boolean;
  statusUnavailable: boolean;
  error: string | null;
  reviewRequired: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRefresh: () => void;
  onRestoreFocus: () => void;
}) {
  const cancel = action === "cancel";
  return (
    <AlertDialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <AlertDialogContent
        className="forge-order-action-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <AlertDialogHeader>
          <span
            className={`forge-order-dialog-icon ${cancel ? "is-cancel" : ""}`}
            aria-hidden="true"
          >
            {cancel ? <XCircle size={27} /> : <RotateCcw size={27} />}
          </span>
          <p className="forge-eyebrow">ORDER #{orderReference}</p>
          <AlertDialogTitle>
            {cancel ? "Cancel this order?" : "Request a return?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {cancel
              ? "This sends a cancellation request for your pending, unpaid cash-on-delivery order. Your order status changes only after the server confirms it."
              : "This sends a return request for your delivered order. Return eligibility and next steps are decided by the server; no refund is confirmed here."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="forge-order-action-error" role="alert">
            <AlertCircle size={17} />
            <div>
              <strong>The request could not be confirmed.</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
        {(reviewRequired || statusUnavailable) && (
          <div className="forge-order-action-review">
            <p>
              Refresh the order status before retrying. A connection failure can
              happen after a request reaches the server.
            </p>
            <Button
              variant="outline"
              disabled={checking || pending}
              onClick={onRefresh}
            >
              <RefreshCw size={15} />
              {checking ? "Checking order…" : "Refresh order status"}
            </Button>
          </div>
        )}
        {statusUnavailable && (
          <p className="forge-order-dialog-status" role="status">
            The current status could not be loaded. Confirm it before taking
            this action.
          </p>
        )}
        {!eligible && !checking && !statusUnavailable && (
          <p className="forge-order-dialog-status" role="status">
            The latest order status does not offer this action. Review your
            order details before continuing.
          </p>
        )}
        {pending && (
          <p className="forge-order-dialog-status" role="status">
            <span className="forge-processing">
              <i />
              {cancel
                ? "Requesting cancellation…"
                : "Submitting return request…"}
            </span>
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {!eligible ? "Back to order" : cancel ? "Keep my order" : "Go back"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cancel ? "forge-order-dialog-cancel" : ""}
            disabled={
              pending ||
              checking ||
              statusUnavailable ||
              reviewRequired ||
              !eligible
            }
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {cancel ? <XCircle size={15} /> : <RotateCcw size={15} />}
            {pending
              ? "Processing…"
              : cancel
                ? "Confirm cancellation"
                : "Submit return request"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
