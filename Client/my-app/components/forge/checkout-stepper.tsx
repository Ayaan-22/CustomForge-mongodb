export function CheckoutStepper({ step }: { step: number }) {
  return (
    <nav aria-label="Checkout progress" className="forge-stepper">
      {[
        "Your loadout",
        "Shipping & order",
        "Secure payment",
        "Order unlocked",
      ].map((label, index) => (
        <div
          key={label}
          className={index <= step ? "is-active" : ""}
          aria-current={index === step ? "step" : undefined}
        >
          <i>{String(index + 1).padStart(2, "0")}</i>
          <span>{label}</span>
        </div>
      ))}
    </nav>
  );
}
