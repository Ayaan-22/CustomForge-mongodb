import type { ReactNode } from "react";
import { RequireSession } from "@/components/require-session";
import { AccountShell } from "@/components/forge/account-shell";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <AccountShell>{children}</AccountShell>
    </RequireSession>
  );
}
