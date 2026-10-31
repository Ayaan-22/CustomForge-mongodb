/** Date inputs use calendar days; absent bounds stay absent when an existing offer is edited. */
export function couponFormDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function couponDateForSubmit(value: string | null, original?: string | null): string | null {
  if (!value) return null;
  // Preserve an existing exact timestamp when its displayed calendar day is unchanged.
  if (original && couponFormDate(original) === value) return original;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Choose a valid campaign date.");
  return date.toISOString();
}
