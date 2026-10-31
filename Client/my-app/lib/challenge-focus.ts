export type ChallengeReturnFocus = {
  invoker: HTMLElement | null;
  fallback: HTMLElement | null;
};

/** Capture before the challenge takes focus, including a pending form fallback. */
export function captureChallengeReturnFocus(
  document: Document,
  fallback?: HTMLElement | null,
): ChallengeReturnFocus {
  const active = document.activeElement;
  const invoker =
    active &&
    active.isConnected &&
    active !== document.body &&
    "focus" in active
      ? (active as HTMLElement)
      : null;
  return {
    invoker,
    fallback:
      fallback ??
      invoker?.closest<HTMLElement>("form") ??
      document.querySelector<HTMLElement>("[data-auth-challenge-return]"),
  };
}

/** Restore once on close; never wait for a disabled control or steal newer focus. */
export function restoreChallengeReturnFocus(
  snapshot: ChallengeReturnFocus,
  closingDialog: HTMLElement | null,
): boolean {
  const document =
    snapshot.invoker?.ownerDocument ?? snapshot.fallback?.ownerDocument;
  if (!document) return false;
  const active = document.activeElement;
  if (active === snapshot.invoker && snapshot.invoker?.isConnected) return true;
  if (active && active !== document.body && !closingDialog?.contains(active)) {
    return false;
  }
  for (const target of [snapshot.invoker, snapshot.fallback]) {
    if (
      !target?.isConnected ||
      target.matches(":disabled, [aria-disabled='true']") ||
      target.closest("[inert], [hidden]")
    )
      continue;
    target.focus({ preventScroll: true });
    if (document.activeElement === target) return true;
  }
  return false;
}
