/** A verification link is one-use: do not retry its request automatically. */
export function createVerificationRequestCache<T>(
  verify: (token: string) => Promise<T>,
) {
  const requests = new Map<string, Promise<T>>();
  return (token: string) => {
    let request = requests.get(token);
    if (!request) {
      // Deferring also converts a synchronous transport exception to a rejection.
      request = Promise.resolve().then(() => verify(token));
      requests.set(token, request);
    }
    return request;
  };
}

export function verificationToken(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Stop a previous route subscriber without consuming its one-use link again. */
export function observeVerificationRequest<T>(
  request: Promise<T>,
  onResult: (result: T) => void,
  onError: (error: unknown) => void,
) {
  let active = true;
  request
    .then((result) => {
      if (active) onResult(result);
    })
    .catch((error: unknown) => {
      if (active) onError(error);
    });
  return () => {
    active = false;
  };
}

export function verificationRequestMessage(message?: string) {
  return (
    message ||
    "Verification requested. If the request is eligible, check your inbox and spam folder for a new link."
  );
}

export function requestEmailVerification<T>(
  input: { signedIn: boolean; email: string; password: string },
  services: {
    sendVerificationEmail: () => Promise<T>;
    resendVerification: (payload: {
      email: string;
      password: string;
    }) => Promise<T>;
  },
) {
  return input.signedIn
    ? services.sendVerificationEmail()
    : services.resendVerification({
        email: input.email.trim(),
        password: input.password,
      });
}

export function normalizeAuthenticationCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function validAuthenticationCode(value: string) {
  return /^\d{6}$/.test(value);
}
