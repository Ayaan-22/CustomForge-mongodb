import { apiFetch } from "./apiClient";

export async function fetcher<T = unknown>(url: string): Promise<T> {
  // Extract path from full URL or use as-is
  const path = url.startsWith("/api/v1")
    ? url.replace("/api/v1", "")
    : url.replace("/api/", "/");
  const res = await apiFetch<T>(path);
  if (res.error) {
    throw new Error(res.error.message);
  }
  return res.data as T;
}
