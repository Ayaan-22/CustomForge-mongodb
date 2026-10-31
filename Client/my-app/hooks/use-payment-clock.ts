"use client";
import { useEffect, useState } from 'react';

export function usePaymentClock(deadline?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 15_000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, [deadline]);
  return now;
}
