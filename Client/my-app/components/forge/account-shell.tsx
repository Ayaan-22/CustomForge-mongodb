"use client";

import "@/app/forge-account.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserRound,
  Package,
  MapPin,
  CreditCard,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const routes: {
  href: string;
  label: string;
  detail: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/profile",
    label: "Profile",
    detail: "Your details & password",
    icon: UserRound,
  },
  {
    href: "/orders",
    label: "Orders",
    detail: "Track & review purchases",
    icon: Package,
  },
  {
    href: "/addresses",
    label: "Addresses",
    detail: "Your delivery details",
    icon: MapPin,
  },
  {
    href: "/payment-methods",
    label: "Payment methods",
    detail: "Saved payment information",
    icon: CreditCard,
  },
  {
    href: "/profile/security",
    label: "Security",
    detail: "Two-factor authentication",
    icon: ShieldCheck,
  },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isEmailVerified } = useAuth();
  const active = pathname.startsWith("/profile/security")
    ? "/profile/security"
    : pathname.startsWith("/profile")
      ? "/profile"
      : routes.find((route) => pathname.startsWith(route.href))?.href;
  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((name) => name[0])
      .join("")
      .toUpperCase() || "CF";
  return (
    <div className="forge-account forge-container">
      <aside className="forge-account-sidebar" aria-label="Account navigation">
        <div className="forge-account-identity">
          <span className="forge-account-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <p className="forge-eyebrow">YOUR COMMAND CENTER</p>
            <strong>{user?.name || "Your account"}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
        <nav aria-label="Account sections">
          {routes.map(({ href, label, detail, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              prefetch={false}
              aria-current={active === href ? "page" : undefined}
            >
              <Icon size={19} />
              <span>
                <strong>{label}</strong>
                <small>{detail}</small>
              </span>
              <ArrowUpRight size={14} className="forge-account-nav-arrow" />
            </Link>
          ))}
        </nav>
        <div
          className="forge-account-status"
          aria-label="Account protection status"
        >
          <span>
            {isEmailVerified ? <CheckCircle2 size={14} /> : <Mail size={14} />}
            {isEmailVerified ? "Email verified" : "Email verification pending"}
          </span>
          <span>
            <Shield size={14} />
            {user?.twoFactorEnabled ? "2FA enabled" : "2FA not enabled"}
          </span>
        </div>
      </aside>
      <div className="forge-account-content">{children}</div>
    </div>
  );
}
