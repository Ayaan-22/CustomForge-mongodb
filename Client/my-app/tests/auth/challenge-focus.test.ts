import { describe, expect, it, vi } from "vitest";
import {
  captureChallengeReturnFocus,
  restoreChallengeReturnFocus,
} from "@/lib/challenge-focus";

type FocusDocument = {
  activeElement: Element | null;
  body: HTMLElement;
  querySelector: ReturnType<typeof vi.fn>;
};

function target(
  document: FocusDocument,
  options: {
    disabled?: boolean;
    connected?: boolean;
    form?: HTMLElement;
    inert?: boolean;
    canFocus?: boolean;
  } = {},
) {
  const focus = vi.fn((_options?: FocusOptions) => {
    if (!options.disabled && options.canFocus !== false)
      document.activeElement = element;
  });
  const element = {
    ownerDocument: document as unknown as Document,
    isConnected: options.connected !== false,
    matches: () => Boolean(options.disabled),
    closest: (selector: string) =>
      selector === "form" ? (options.form ?? null) : options.inert ? {} : null,
    focus,
  } as unknown as HTMLElement;
  return { element, focus };
}

function fixture() {
  const document = {
    activeElement: null,
    querySelector: vi.fn(() => null),
  } as unknown as FocusDocument;
  document.body = target(document).element;
  document.activeElement = document.body;
  return { document, asDocument: document as unknown as Document };
}

describe("protected challenge focus restoration", () => {
  it("keeps the initiating form when a disabled password submitter loses focus", () => {
    const { document, asDocument } = fixture();
    const profile = target(document).element;
    const password = target(document).element;
    document.querySelector.mockReturnValue(profile);
    expect(captureChallengeReturnFocus(asDocument, password)).toEqual({
      invoker: null,
      fallback: password,
    });
    expect(document.querySelector).not.toHaveBeenCalled();
  });

  it("captures the invoker and its own form before the modal takes focus", () => {
    const { document, asDocument } = fixture();
    const form = target(document).element;
    const invoker = target(document, { form }).element;
    document.activeElement = invoker;
    expect(captureChallengeReturnFocus(asDocument)).toEqual({
      invoker,
      fallback: form,
    });
    expect(document.querySelector).not.toHaveBeenCalled();
  });

  it("captures a labeled fallback when disabling the submitter has moved focus to body", () => {
    const { document, asDocument } = fixture();
    const form = target(document).element;
    document.querySelector.mockReturnValue(form);
    expect(captureChallengeReturnFocus(asDocument)).toEqual({
      invoker: null,
      fallback: form,
    });
  });

  it("restores an available invoker on close without waiting or scrolling", () => {
    const { document } = fixture();
    const invoker = target(document);
    const form = target(document);
    expect(
      restoreChallengeReturnFocus(
        { invoker: invoker.element, fallback: form.element },
        null,
      ),
    ).toBe(true);
    expect(invoker.focus).toHaveBeenCalledExactlyOnceWith({
      preventScroll: true,
    });
    expect(form.focus).not.toHaveBeenCalled();
  });

  it("focuses the form while the protected operation still disables its submitter", () => {
    const { document } = fixture();
    const invoker = target(document, { disabled: true });
    const form = target(document);
    expect(
      restoreChallengeReturnFocus(
        { invoker: invoker.element, fallback: form.element },
        null,
      ),
    ).toBe(true);
    expect(invoker.focus).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(form.element);
  });

  it("uses the captured form if the original submitter has been removed", () => {
    const { document } = fixture();
    const invoker = target(document, { connected: false });
    const form = target(document);
    expect(
      restoreChallengeReturnFocus(
        { invoker: invoker.element, fallback: form.element },
        null,
      ),
    ).toBe(true);
    expect(invoker.focus).not.toHaveBeenCalled();
    expect(form.focus).toHaveBeenCalledOnce();
  });

  it("yields when a newer workflow already owns focus", () => {
    const { document } = fixture();
    const invoker = target(document);
    const form = target(document);
    document.activeElement = target(document).element;
    expect(
      restoreChallengeReturnFocus(
        { invoker: invoker.element, fallback: form.element },
        null,
      ),
    ).toBe(false);
    expect(invoker.focus).not.toHaveBeenCalled();
    expect(form.focus).not.toHaveBeenCalled();
  });

  it("restores while focus is still inside the closing dialog", () => {
    const { document } = fixture();
    const invoker = target(document);
    const codeInput = target(document).element;
    document.activeElement = codeInput;
    const closingDialog = {
      contains: (element: Element) => element === codeInput,
    } as unknown as HTMLElement;
    expect(
      restoreChallengeReturnFocus(
        { invoker: invoker.element, fallback: null },
        closingDialog,
      ),
    ).toBe(true);
    expect(document.activeElement).toBe(invoker.element);
  });

  it("does not focus a previous page or an inert return target", () => {
    const { document } = fixture();
    const invoker = target(document, { connected: false });
    const form = target(document, { inert: true });
    expect(
      restoreChallengeReturnFocus(
        { invoker: invoker.element, fallback: form.element },
        null,
      ),
    ).toBe(false);
    expect(invoker.focus).not.toHaveBeenCalled();
    expect(form.focus).not.toHaveBeenCalled();
  });

  it("falls back if a connected target cannot receive browser focus", () => {
    const { document } = fixture();
    const invoker = target(document, { canFocus: false });
    const form = target(document);
    expect(
      restoreChallengeReturnFocus(
        { invoker: invoker.element, fallback: form.element },
        null,
      ),
    ).toBe(true);
    expect(form.focus).toHaveBeenCalledOnce();
  });
});
