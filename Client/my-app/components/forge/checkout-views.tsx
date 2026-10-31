import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutStepper } from "./checkout-stepper";

export function CheckoutWaiting({ message }: { message: string }) {
  return (
    <div
      className="forge-container forge-checkout forge-checkout-waiting"
      aria-busy="true"
    >
      <header className="forge-checkout-heading">
        <div>
          <p className="forge-eyebrow">THE FINAL UPGRADE</p>
          <h1>Preparing your checkout.</h1>
          <p role="status">{message}</p>
        </div>
        <LockKeyhole size={25} />
      </header>
      <CheckoutStepper step={1} />
      <div className="forge-checkout-layout">
        <div className="forge-checkout-fields">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <Skeleton className="h-[450px] rounded-xl" />
      </div>
    </div>
  );
}

export function CheckoutRecovery({
  error,
  orderError,
  pending,
  onRetry,
}: {
  error: string | null;
  orderError: string | null;
  pending: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="forge-container forge-checkout forge-checkout-recovery">
      <p className="forge-eyebrow">CHECKOUT STATUS</p>
      <div
        className={`forge-checkout-recovery-panel ${error ? "has-error" : ""}`}
      >
        <div className="forge-checkout-recovery-icon">
          {error ? <AlertCircle size={30} /> : <ShieldCheck size={30} />}
        </div>
        <p className="forge-eyebrow">
          {error ? "REVIEW REQUIRED" : "YOUR REQUEST IS SAVED"}
        </p>
        <h1>Confirm your checkout.</h1>
        <p role="status">
          {error ||
            "A checkout request is awaiting confirmation. Retry it to recover the same order, including after a connection failure."}
        </p>
        {!error && (
          <p className="forge-checkout-recovery-note">
            The retry uses the original address, payment choice and request
            identifier. Check your order history if you are unsure whether it
            completed.
          </p>
        )}
        {orderError && (
          <div
            className="forge-checkout-alert forge-checkout-summary-error"
            role="alert"
          >
            <AlertCircle size={17} />
            <p>{orderError}</p>
          </div>
        )}
        <div className="forge-checkout-recovery-actions">
          <Button disabled={pending || !!error} onClick={onRetry}>
            {pending ? (
              <span className="forge-processing">
                <i />
                Checking order…
              </span>
            ) : (
              <>
                <RefreshCw size={16} />
                Retry original checkout
              </>
            )}
          </Button>
          <Button asChild variant="outline">
            <Link href="/orders">
              View my orders <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
