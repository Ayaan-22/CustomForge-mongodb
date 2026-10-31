"use client";
import "../forge-checkout.css";
import { requireSuccess } from "@/lib/query-result";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/hooks/use-cart";
import { CartService } from "@/services/cart-service";
import { UserService } from "@/services/user-service";
import { OrderService } from "@/services/order-service";
import { PaymentService } from "@/services/payment-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Plus,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Banknote,
  LockKeyhole,
  MapPin,
  Package,
  RefreshCw,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { missingShippingFields } from "@/lib/address-validation";
import {
  readCheckoutAttempt,
  saveCheckoutAttempt,
  clearCheckoutAttempt,
  type CheckoutAttempt,
} from "@/lib/checkout-attempt";
import { syncCheckoutCart } from "@/lib/checkout-cart";
import { CheckoutTotals } from "@/components/checkout-totals";
import {
  hasCheckoutTotals,
  checkoutSummaryChanged,
} from "@/lib/checkout-summary";
import { CheckoutStepper } from "@/components/forge/checkout-stepper";
import { ProductImage } from "@/components/forge/product-image";
import {
  CheckoutWaiting,
  CheckoutRecovery,
} from "@/components/forge/checkout-views";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isEmailVerified,
    isLoading: authLoading,
  } = useAuth();
  const {
    items,
    acceptCheckout,
    isPending,
    isLoading: cartLoading,
    isRefreshing,
    retry: reloadCart,
    totals,
    error: cartError,
  } = useCart();
  const summaryReady = hasCheckoutTotals(totals);
  const cartIssue = totals?.couponError || totals?.warnings?.[0]?.message;
  const [checkoutAttempt, setCheckoutAttempt] =
    useState<CheckoutAttempt | null>(null);
  const [recoveryLoaded, setRecoveryLoaded] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    try {
      setCheckoutAttempt(readCheckoutAttempt(sessionStorage, user.id));
      setRecoveryError(null);
    } catch {
      setRecoveryError(
        "Checkout recovery is unavailable. Check your orders before trying again. Browser storage must be enabled.",
      );
    } finally {
      setRecoveryLoaded(true);
    }
  }, [user?.id]);
  const submitting = useRef(false);

  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [selectedPaymentType, setSelectedPaymentType] = useState<
    "stripe" | "cod"
  >("cod");
  const {data: paymentCapabilities} = useQuery({
    queryKey: ["payment-capabilities"],
    queryFn: () => PaymentService.capabilities().then(requireSuccess),
  });
  const stripeAvailable = paymentCapabilities?.data?.stripe === true;
  const [couponCode, setCouponCode] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Fetch addresses
  const {
    data: addressesResponse,
    isLoading: loadingAddresses,
    error: addressError,
    refetch: reloadAddresses,
  } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: () => UserService.getAddresses().then(requireSuccess),
    enabled: isAuthenticated,
  });

  const addresses = addressesResponse?.data || [];

  const selectedAddress = addresses.find(
    (address) => address.id === selectedAddressId,
  );
  const missingFields = selectedAddress
    ? missingShippingFields(selectedAddress)
    : [];

  const qc = useQueryClient();
  const createOrder = useMutation({
    mutationKey: ["orders", "create"],
    scope: { id: "checkout" },
    mutationFn: OrderService.create,
    retry: false,
  });
  const coupon = useMutation({
    mutationFn: async () => {
      await syncCheckoutCart(items);
      return requireSuccess(
        await CartService.applyCoupon({ code: couponCode }),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Coupon applied");
    },
    onError: (error) => toast.error(error.message),
  });

  // Redirect if not authenticated or verified
  useEffect(() => {
    if (authLoading || cartLoading || !recoveryLoaded) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isEmailVerified) {
      router.push("/verify-email");
      return;
    }

    // Redirect if cart is empty
    if (
      items.length === 0 &&
      !isCreatingOrder &&
      !checkoutAttempt &&
      !recoveryError
    ) {
      router.push("/cart");
      return;
    }
  }, [
    checkoutAttempt,
    recoveryError,
    recoveryLoaded,
    authLoading,
    cartLoading,
    isAuthenticated,
    isEmailVerified,
    items.length,
    isCreatingOrder,
    router,
  ]);

  // Show loading/redirect state while checking
  if (
    !isAuthenticated ||
    !isEmailVerified ||
    !recoveryLoaded ||
    (items.length === 0 && !checkoutAttempt && !recoveryError)
  ) {
    return (
      <CheckoutWaiting
        message={
          authLoading || cartLoading || !recoveryLoaded
            ? "Checking your account and saved checkout…"
            : !isAuthenticated
              ? "Opening sign in to continue…"
              : !isEmailVerified
                ? "Opening email verification…"
                : "Returning to your loadout…"
        }
      />
    );
  }

  const handleCreateOrder = async () => {
    if (submitting.current || isPending() || coupon.isPending) return;
    if (!user?.id || recoveryError) return;
    if (!checkoutAttempt && cartError) {
      toast.error(cartError.message);
      return;
    }
    if (!checkoutAttempt && (!summaryReady || isRefreshing || cartIssue)) {
      toast.error(
        cartIssue || "Wait for your full order total before placing the order.",
      );
      return;
    }
    if (!checkoutAttempt && !selectedAddressId) {
      toast.error("Please select a shipping address", {
        duration: 5000,
      });
      return;
    }

    if (!checkoutAttempt && (!selectedAddress || missingFields.length > 0)) {
      toast.error(
        `Please edit your shipping address and add: ${missingFields.join(", ") || "a valid address"}.`,
      );
      return;
    }

    submitting.current = true;
    setIsCreatingOrder(true);
    setOrderError(null);

    try {
      let attempt = checkoutAttempt;
      if (!attempt) {
        // Read current server prices before committing. Do not overwrite another
        // tab's cart from this screen's stale snapshot.
        const fresh = requireSuccess(await CartService.get());
        const freshTotals = fresh.data?.totals;
        if (!hasCheckoutTotals(freshTotals) || !hasCheckoutTotals(totals)) {
          throw new Error(
            "Unable to confirm your full total. Refresh the cart and try again.",
          );
        }
        qc.setQueryData(["cart", user.id], fresh);
        if (freshTotals.couponError || freshTotals.warnings?.length) {
          throw new Error(
            freshTotals.couponError ||
              freshTotals.warnings?.[0]?.message ||
              "Please review your cart.",
          );
        }
        if (checkoutSummaryChanged(totals, freshTotals)) {
          throw new Error(
            "Your cart or prices changed. Review the updated total, then place your order again.",
          );
        }
        attempt = {
          shippingAddressId: selectedAddressId,
          paymentMethod: selectedPaymentType,
          idempotencyKey: crypto.randomUUID(),
        };
        saveCheckoutAttempt(sessionStorage, user.id, attempt);
        setCheckoutAttempt(attempt);
      }
      // A retry uses the original payload even if the committed checkout emptied the cart.
      const paymentMethod = attempt.paymentMethod;
      const response = await createOrder.mutateAsync(attempt);

      if (response.error) {
        if (
          !checkoutAttempt &&
          [400, 409, 422].includes(response.error.status)
        ) {
          clearCheckoutAttempt(sessionStorage, user.id);
          setCheckoutAttempt(null);
        }
        setOrderError(response.error.message || "Failed to create order");
        toast.error(response.error.message || "Failed to create order", {
          duration: 5000,
        });
        setIsCreatingOrder(false);
        return;
      }

      // Redirect based on payment method
      const orderId = response.data?.id;
      if (!orderId)
        throw new Error("Unable to confirm the order. Please try again.");
      clearCheckoutAttempt(sessionStorage, user.id);
      setCheckoutAttempt(null);
      acceptCheckout();
      if (orderId) {
        if (
          paymentMethod === "cod" ||
          response.data?.isPaid ||
          response.data?.status !== "pending"
        ) {
          toast.success("Order confirmed.", {
            duration: 5000,
          });
          router.push(`/orders/${orderId}?success=true`);
        } else {
          toast.success("Order created! Redirecting to payment...", {
            duration: 5000,
          });
          router.push(`/orders/${orderId}/payment`);
        }
      }
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "An error occurred. Please try again.",
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred. Please try again.",
        {
          duration: 5000,
        },
      );
      setIsCreatingOrder(false);
    } finally {
      submitting.current = false;
    }
  };

  if (checkoutAttempt || recoveryError)
    return (
      <CheckoutRecovery
        error={recoveryError}
        orderError={orderError}
        pending={isCreatingOrder}
        onRetry={handleCreateOrder}
      />
    );

  // Both purchase actions use the original checkout preflight conditions.
  // Pricing, creation, recovery and payment decisions remain in the flow above.
  const orderDisabled =
    isCreatingOrder ||
    isPending() ||
    !selectedAddressId ||
    missingFields.length > 0 ||
    !!cartError ||
    coupon.isPending ||
    !summaryReady ||
    isRefreshing ||
    !!cartIssue;
  const readinessMessage = isCreatingOrder
    ? "Confirming your order…"
    : coupon.isPending
      ? "Wait for your coupon and updated total."
      : isRefreshing
        ? "Updating your order total…"
        : !summaryReady
          ? "Waiting for shipping, tax and your full total."
          : cartError || cartIssue
            ? "Review the cart message before continuing."
            : !selectedAddressId
              ? "Choose a shipping address to continue."
              : missingFields.length
                ? "Complete the selected address to continue."
                : selectedPaymentType === "stripe"
                  ? "Next: secure payment in Stripe Checkout."
                  : "Payment is due on delivery.";
  const orderLabel = isCreatingOrder ? (
    <span className="forge-processing" role="status">
      <i />
      Securing your loadout…
    </span>
  ) : summaryReady ? (
    <>
      Place order <ArrowRight size={16} />
    </>
  ) : (
    "Place order"
  );

  return (
    <div className="forge-container forge-checkout">
      <header className="forge-checkout-heading">
        <div>
          <p className="forge-eyebrow">THE FINAL UPGRADE</p>
          <h1>Make it yours.</h1>
          <p>
            Choose where it goes and how you pay. Review your full total before
            placing the order.
          </p>
        </div>
        <Link href="/cart" className="forge-text-link">
          <ArrowLeft size={15} />
          Back to your loadout
        </Link>
      </header>
      <CheckoutStepper step={1} />

      <div className="forge-checkout-layout">
        <div className="forge-checkout-fields">
          {/* Shipping Address */}
          <Card className="forge-checkout-card">
            <CardHeader>
              <h2 className="forge-checkout-section-title">
                <span>
                  <i>01</i>Shipping address
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/addresses?redirect=/checkout")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add address
                </Button>
              </h2>
            </CardHeader>
            <CardContent>
              {missingFields.length > 0 && (
                <Alert className="forge-checkout-alert">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Complete your shipping address: {missingFields.join(", ")}.
                    <Link
                      className="ml-2 underline"
                      href="/addresses?redirect=/checkout"
                    >
                      Edit address
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              {addressError ? (
                <div role="alert" className="forge-checkout-empty">
                  <AlertCircle />
                  <h3>Addresses couldn’t load.</h3>
                  <p>{addressError.message}</p>
                  <Button variant="outline" onClick={() => reloadAddresses()}>
                    <RefreshCw size={15} />
                    Retry addresses
                  </Button>
                </div>
              ) : loadingAddresses ? (
                <div
                  className="space-y-3"
                  aria-busy="true"
                  aria-label="Loading shipping addresses"
                >
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="forge-checkout-empty">
                  <MapPin />
                  <h3>Where should your loadout go?</h3>
                  <p>
                    Add a shipping address to continue. You can review it before
                    placing your order.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/addresses?redirect=/checkout")}
                  >
                    <Plus size={15} />
                    Add shipping address
                  </Button>
                </div>
              ) : (
                <RadioGroup
                  value={selectedAddressId}
                  onValueChange={setSelectedAddressId}
                  aria-label="Shipping address"
                  className="forge-address-options"
                >
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`forge-checkout-choice forge-address-choice ${selectedAddressId === address.id ? "is-selected" : ""}`}
                    >
                      <RadioGroupItem
                        value={address.id}
                        id={`address-${address.id}`}
                      />
                      <Label
                        htmlFor={`address-${address.id}`}
                        className="forge-address-label"
                      >
                        <span className="forge-address-name">
                          {address.fullName}
                          {address.isDefault && (
                            <span className="forge-address-default">
                              Default
                            </span>
                          )}
                        </span>
                        <span className="forge-address-line">
                          {address.address}
                        </span>
                        <span className="forge-address-line">
                          {address.city}, {address.state} {address.postalCode}
                        </span>
                        <span className="forge-address-line">
                          {address.country}
                        </span>
                      </Label>
                      {selectedAddressId === address.id && (
                        <Check
                          size={16}
                          className="forge-choice-check"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  ))}
                </RadioGroup>
              )}
              {addresses.length > 0 && !loadingAddresses && (
                <Link
                  href="/addresses?redirect=/checkout"
                  className="forge-checkout-manage"
                >
                  Manage your saved addresses <ArrowRight size={14} />
                </Link>
              )}
            </CardContent>
          </Card>

          <Card className="forge-checkout-card">
            <CardHeader>
              <h2 className="forge-checkout-section-title">
                <span>
                  <i>02</i>Payment method
                </span>
                <LockKeyhole size={18} />
              </h2>
            </CardHeader>
            <CardContent>
              <RadioGroup
                aria-label="Payment method"
                value={selectedPaymentType}
                onValueChange={(value) =>
                  setSelectedPaymentType(value as "stripe" | "cod")
                }
              >
                <div
                  className={`forge-checkout-choice forge-payment-choice ${selectedPaymentType === "stripe" ? "is-selected" : ""}`}
                >
                  <RadioGroupItem value="stripe" id="stripe" disabled={!stripeAvailable} />
                  <Label htmlFor="stripe">
                    <CreditCard size={22} />
                    <span>
                      <strong>Pay by card</strong>
                      <small>
                        {stripeAvailable ? "Continue to secure Stripe Checkout after your order is created. Card details are entered there." : "Card payments are currently unavailable. Choose cash on delivery."}
                      </small>
                    </span>
                  </Label>
                  {selectedPaymentType === "stripe" && (
                    <Check
                      size={16}
                      className="forge-choice-check"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div
                  className={`forge-checkout-choice forge-payment-choice ${selectedPaymentType === "cod" ? "is-selected" : ""}`}
                >
                  <RadioGroupItem value="cod" id="cod" />
                  <Label htmlFor="cod">
                    <Banknote size={22} />
                    <span>
                      <strong>Cash on delivery</strong>
                      <small>
                        Place your order now and pay when it is delivered.
                      </small>
                    </span>
                  </Label>
                  {selectedPaymentType === "cod" && (
                    <Check
                      size={16}
                      className="forge-choice-check"
                      aria-hidden="true"
                    />
                  )}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Coupon Code */}
          <Card className="forge-checkout-card forge-checkout-coupon">
            <CardHeader>
              <h2 className="forge-checkout-section-title">
                <span>
                  <Ticket size={19} />
                  Have a coupon?
                </span>
                <small>Optional</small>
              </h2>
            </CardHeader>
            <CardContent>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!coupon.isPending && couponCode.trim()) coupon.mutate();
                }}
              >
                <Input
                  aria-label="Coupon code"
                  placeholder="Enter coupon code"
                  autoComplete="off"
                  aria-describedby="checkout-coupon-feedback"
                  aria-invalid={coupon.isError}
                  disabled={coupon.isPending}
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    coupon.reset();
                  }}
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={coupon.isPending || !couponCode.trim()}
                >
                  {coupon.isPending ? "Applying…" : "Apply"}
                </Button>
              </form>
              <div
                id="checkout-coupon-feedback"
                className={`forge-coupon-feedback ${coupon.isError ? "is-error" : ""}`}
                aria-live="polite"
              >
                {coupon.isPending ? (
                  <span className="forge-processing">
                    <i />
                    Checking your code and updating totals…
                  </span>
                ) : coupon.isError ? (
                  <>
                    <AlertCircle size={14} />
                    {coupon.error.message}
                  </>
                ) : totals?.coupon?.code ? (
                  <>
                    <CheckCircle2 size={14} />
                    Applied coupon: {totals.coupon.code}
                  </>
                ) : coupon.isSuccess ? (
                  <>
                    <CheckCircle2 size={14} />
                    Coupon request accepted. Check the updated summary for any
                    confirmed discount.
                  </>
                ) : (
                  "Discounts appear in your order summary after validation."
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="forge-checkout-summary-column">
          <Card
            id="checkout-order-summary"
            className="forge-checkout-card forge-checkout-summary"
          >
            <CardHeader>
              <p className="forge-eyebrow">REVIEW YOUR LOADOUT</p>
              <h2 className="forge-checkout-section-title">
                <span>Order summary</span>
                <Package size={20} />
              </h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="forge-checkout-items" aria-label="Order items">
                {totals?.items?.map(({ product, quantity, lineTotal }) => {
                  const photo = items.find((item) => item.id === product.id)
                    ?.product.images[0];
                  return (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.id}`}
                        className="forge-checkout-item-photo"
                        aria-label={`View ${product.name}`}
                      >
                        <ProductImage
                          src={photo || "/gaming-component.jpg"}
                          alt=""
                          fill
                          sizes="64px"
                        />
                      </Link>
                      <div>
                        <Link href={`/products/${product.id}`}>
                          {product.name}
                        </Link>
                        <span>Quantity {quantity}</span>
                      </div>
                      <strong>{formatPrice(lineTotal)}</strong>
                    </li>
                  );
                })}
              </ul>

              <div className="forge-checkout-total-lines border-t pt-4 space-y-2">
                {(cartError || cartIssue) && (
                  <div
                    role="alert"
                    className="forge-checkout-alert forge-checkout-summary-error"
                  >
                    <AlertCircle size={17} />
                    <p>{cartError?.message || cartIssue}</p>
                  </div>
                )}
                <CheckoutTotals totals={totals} />
                {isRefreshing && (
                  <p role="status" className="forge-checkout-updating">
                    <RefreshCw size={13} />
                    Updating total…
                  </p>
                )}
                {(!summaryReady || cartError || cartIssue) && (
                  <Button
                    variant="outline"
                    disabled={isRefreshing}
                    onClick={() => reloadCart()}
                  >
                    <RefreshCw size={14} />
                    Refresh cart totals
                  </Button>
                )}
              </div>

              {orderError && (
                <div
                  className="forge-checkout-alert forge-checkout-summary-error"
                  role="alert"
                >
                  <AlertCircle size={17} />
                  <p>{orderError}</p>
                </div>
              )}

              <Button
                className="w-full forge-checkout-submit"
                size="lg"
                onClick={handleCreateOrder}
                disabled={orderDisabled}
                aria-describedby="checkout-readiness"
              >
                {orderLabel}
              </Button>
              <p
                className="forge-checkout-readiness"
                id="checkout-readiness"
                role="status"
              >
                {readinessMessage}
              </p>
              <p className="forge-checkout-secure">
                <ShieldCheck size={14} />
                {selectedPaymentType === "stripe"
                  ? "Card details stay in Stripe Checkout."
                  : "Cash payment is due on delivery."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <div
        className="forge-checkout-mobile-action"
        aria-label="Mobile order action"
      >
        <div>
          <span>Order total</span>
          <strong>
            {summaryReady ? formatPrice(totals.total) : "Confirming…"}
          </strong>
        </div>
        <Button
          className="forge-checkout-submit"
          disabled={orderDisabled}
          onClick={handleCreateOrder}
          aria-describedby="checkout-readiness"
        >
          {orderLabel}
        </Button>
        <a
          href="#checkout-order-summary"
          aria-label={`Review order summary. ${readinessMessage}`}
        >
          {readinessMessage}
          <ArrowRight size={13} aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
