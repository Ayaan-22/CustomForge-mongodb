import type { ApiResponse } from './apiClient';

export class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Keep the service envelope at the transport boundary, but reject failures so
// TanStack Query can run its error, retry, and optimistic rollback lifecycle.
export function requireSuccess<T>(result: ApiResponse<T>): ApiResponse<T> {
  if (result.error) throw new RequestError(result.error.message, result.error.status);
  return result;
}

export function retryQuery(count: number, error: unknown) {
  return count < 1 && (!(error instanceof RequestError) || error.status === 0 || error.status >= 500);
}
