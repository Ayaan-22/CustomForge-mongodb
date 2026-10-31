"use client";

import "@/app/forge-payment.css";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  LockKeyhole,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { PaymentService } from "@/services/payment-service";
import { requireSuccess } from "@/lib/query-result";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentMethodsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const query = useQuery({
    queryKey: ["stripe-payment-methods", user?.id],
    queryFn: () => PaymentService.getPaymentMethods().then(requireSuccess),
    enabled: isAuthenticated,
  });
  return (
    <div className="forge-payment-methods">
      <header className="forge-account-page-heading">
        <p className="forge-eyebrow">ACCOUNT / PAYMENT</p>
        <h1>Payment methods.</h1>
        <p>
          Review the cards saved with your Stripe customer account. New card
          details are entered securely during checkout.
        </p>
      </header>
      {!isLoading && !isAuthenticated ? (
        <Button asChild>
          <Link href="/login?redirect=/payment-methods" prefetch={false}>
            Sign in
          </Link>
        </Button>
      ) : query.isLoading || isLoading ? (
        <div aria-busy="true" aria-label="Loading saved payment methods">
          <Skeleton className="h-52 w-full" />
          <span className="sr-only" role="status">
            Loading saved cards
          </span>
        </div>
      ) : query.error ? (
        <section className="forge-payment-recovery" role="alert">
          <CreditCard size={28} aria-hidden="true" />
          <h2>Your saved cards could not load.</h2>
          <p>{query.error.message}</p>
          <Button onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw size={16} aria-hidden="true" />
            {query.isFetching ? "Loading cards…" : "Retry loading cards"}
          </Button>
        </section>
      ) : query.data?.data?.length ? (
        <div className="forge-payment-methods-list">
          {query.data.data.map((method) => (
            <section
              className="forge-payment-method-card"
              key={method.id}
              aria-label={`${method.card.brand} card ending ${method.card.last4}`}
            >
              <div>
                <h2>{method.card.brand}</h2>
                <CreditCard size={23} aria-hidden="true" />
              </div>
              <p aria-label={`Card ending ${method.card.last4}`}>
                •••• •••• •••• {method.card.last4}
              </p>
              <dl>
                <div>
                  <dt>Expires</dt>
                  <dd>
                    {String(method.card.exp_month).padStart(2, "0")}/
                    {method.card.exp_year}
                  </dd>
                </div>
                <div>
                  <dt>Provider</dt>
                  <dd>Stripe</dd>
                </div>
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <section className="forge-payment-methods-empty">
          <CreditCard size={38} aria-hidden="true" />
          <h2>No saved cards yet.</h2>
          <p>
            You can still pay for an order with a card through Stripe Checkout.
          </p>
          <Button asChild>
            <Link href="/cart" prefetch={false}>
              Review your cart <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </section>
      )}
      <aside className="forge-payment-methods-note">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <strong>Secure payment, at checkout.</strong>
          <p>
            Saving or removing cards from this page is currently unavailable.
            Stripe Checkout handles card entry for each order. Cash on delivery
            is available when placing your order.
          </p>
        </div>
      </aside>
      <Button variant="outline" asChild>
        <Link href="/cart" prefetch={false}>
          <LockKeyhole size={15} aria-hidden="true" />
          Return to cart
        </Link>
      </Button>
    </div>
  );
}
