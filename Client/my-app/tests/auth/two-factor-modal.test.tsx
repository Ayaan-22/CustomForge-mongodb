import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement, ReactNode } from "react";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: ReactNode }) => (
    <footer>{children}</footer>
  ),
}));
import { TwoFactorModal, useTwoFactorModal } from "@/components/two-factor-modal";

describe("protected-operation code challenge", () => {
  it("offers OTP autocomplete and an honest Continue action rather than enrollment verification", () => {
    const html = renderToStaticMarkup(
      <TwoFactorModal open onClose={vi.fn()} onSuccess={vi.fn()} />,
    );
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('autoComplete="one-time-code"');
    expect(html).toContain('maxLength="6"');
    expect(html).toContain("aria-describedby=");
    expect(html).toContain(
      "The protected action confirms it when you continue.",
    );
    expect(html).toContain("Continue");
    expect(html).not.toContain("Verifying");
  });
  it("passes the collected code unchanged to the waiting protected operation", async () => {
    let controller!: ReturnType<typeof useTwoFactorModal>;
    function Harness() {
      controller = useTwoFactorModal();
      return null;
    }
    renderToStaticMarkup(<Harness />);
    const result = controller.requestTwoFactor();
    const modal = controller.TwoFactorModal() as ReactElement<{
      onSuccess: (code: string) => void;
    }>;
    modal.props.onSuccess("012345");
    await expect(result).resolves.toBe("012345");
  });
  it("resolves cancellation instead of leaving a protected operation pending", async () => {
    let controller!: ReturnType<typeof useTwoFactorModal>;
    function Harness() {
      controller = useTwoFactorModal();
      return null;
    }
    renderToStaticMarkup(<Harness />);
    const result = controller.requestTwoFactor();
    const modal = controller.TwoFactorModal() as ReactElement<{
      onClose: () => void;
    }>;
    modal.props.onClose();
    await expect(result).resolves.toBeNull();
  });
  it("does not share one code with another concurrent protected operation", async () => {
    let controller!: ReturnType<typeof useTwoFactorModal>;
    function Harness() {
      controller = useTwoFactorModal();
      return null;
    }
    renderToStaticMarkup(<Harness />);
    const first = controller.requestTwoFactor();
    await expect(controller.requestTwoFactor()).resolves.toBeNull();
    const modal = controller.TwoFactorModal() as ReactElement<{
      onSuccess: (code: string) => void;
    }>;
    modal.props.onSuccess("123456");
    await expect(first).resolves.toBe("123456");
  });
  it("keeps a newer challenge's return target when an older dialog finishes closing", async () => {
    const document = {
      body: {} as HTMLElement,
      activeElement: null as Element | null,
      querySelector: () => null,
    };
    function invoker() {
      const focus = vi.fn(() => {
        document.activeElement = element;
      });
      const element = {
        isConnected: true,
        ownerDocument: document,
        closest: () => null,
        matches: () => false,
        focus,
      } as unknown as HTMLElement;
      return { element, focus };
    }
    const firstInvoker = invoker();
    const nextInvoker = invoker();
    vi.stubGlobal("document", document);
    try {
      let controller!: ReturnType<typeof useTwoFactorModal>;
      function Harness() {
        controller = useTwoFactorModal();
        return null;
      }
      renderToStaticMarkup(<Harness />);
      type ModalActions = {
        onClose: () => void;
        onRestoreFocus: (dialog: HTMLElement | null) => void;
      };
      document.activeElement = firstInvoker.element;
      const first = controller.requestTwoFactor();
      const firstModal =
        controller.TwoFactorModal() as ReactElement<ModalActions>;
      firstModal.props.onClose();
      await expect(first).resolves.toBeNull();
      document.activeElement = nextInvoker.element;
      const next = controller.requestTwoFactor();
      const nextModal =
        controller.TwoFactorModal() as ReactElement<ModalActions>;
      firstModal.props.onRestoreFocus(null);
      expect(firstInvoker.focus).not.toHaveBeenCalled();
      nextModal.props.onClose();
      await expect(next).resolves.toBeNull();
      document.activeElement = document.body;
      nextModal.props.onRestoreFocus(null);
      expect(nextInvoker.focus).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(nextInvoker.element);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
