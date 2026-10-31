"use client";
import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

export function DealCountdown() {
  const deadline = Date.parse(process.env.NEXT_PUBLIC_DEAL_ENDS_AT || "");
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    if (!Number.isFinite(deadline)) return;
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  if (remaining === null || remaining <= 0) return null;
  const seconds = Math.floor(remaining / 1000);
  return (
    <span className="forge-countdown">
      <Clock3 size={15} />
      <span>Campaign ends in</span>
      <strong className="font-mono">
        {Math.floor(seconds / 86400)}d{" "}
        {String(Math.floor(seconds / 3600) % 24).padStart(2, "0")}:
        {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
        {String(seconds % 60).padStart(2, "0")}
      </strong>
    </span>
  );
}
