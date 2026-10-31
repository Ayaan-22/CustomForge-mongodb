"use client";

import "@/app/forge-auth.css";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Info,
  Cpu,
  Heart,
  Package,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "./brand";

export type AuthVariant = "login" | "register" | "recovery" | "verify";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  variant = "login",
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  variant?: AuthVariant;
}) {
  return (
    <div
      className="forge-auth-shell forge-container"
      data-auth-variant={variant}
    >
      <Link href="/products" prefetch={false} className="forge-auth-back">
        <ArrowLeft size={15} aria-hidden="true" /> Back to the store
      </Link>
      <div className="forge-auth-layout">
        <aside
          className="forge-auth-showcase"
          aria-label="Your CustomForge account"
        >
          <div className="forge-auth-showcase-top">
            <Brand />
            <span>PLAYER ACCESS / 01</span>
          </div>
          <div className="forge-auth-showcase-copy">
            <p className="forge-eyebrow">BUILD. PLAY. REPEAT.</p>
            <h2>
              Your next level <br />
              starts <span>here.</span>
            </h2>
            <p>
              Save the gear you love. Plan your next build. <br />
              Keep every upgrade in one place.
            </p>
          </div>
          <div className="forge-auth-scene" aria-hidden="true">
            <span className="forge-auth-orbit forge-auth-orbit-one" />
            <span className="forge-auth-orbit forge-auth-orbit-two" />
            <svg
              className="forge-auth-circuit"
              viewBox="0 0 480 265"
              fill="none"
            >
              <path
                d="m45 180 195-112 195 112-195 112-195-112Z"
                stroke="#62f0dd"
                strokeOpacity=".18"
              />
              <path
                d="m70 168 170-98 170 98M97 198l143-82 143 82M123 214l117-68 117 68M70 168l170 98 170-98"
                stroke="#a696ff"
                strokeOpacity=".16"
              />
              <path
                d="m240 32 127 73v76l-127 74-127-74v-76l127-73Z"
                fill="#62f0dd"
                fillOpacity=".04"
                stroke="#62f0dd"
                strokeOpacity=".28"
              />
              <path
                d="m240 49 112 65-112 64-112-64 112-65Z"
                fill="#172c38"
                stroke="#62f0dd"
                strokeOpacity=".65"
              />
              <path
                d="m128 114 112 64v57l-112-65v-56Z"
                fill="#0b171f"
                stroke="#62f0dd"
                strokeOpacity=".28"
              />
              <path
                d="m352 114-112 64v57l112-65v-56Z"
                fill="#161b32"
                stroke="#a696ff"
                strokeOpacity=".6"
              />
              <path
                d="m156 110 84-48 84 48-84 49-84-49Z"
                fill="#090f19"
                stroke="#a696ff"
                strokeOpacity=".7"
              />
              <path
                d="m218 100 55-1-10 10-28 1-11 7 26 1-12 10-42-2 22-26Z"
                fill="#62f0dd"
              />
              <path
                d="m269 113 14-13 11 1-40 34-27-1 12-9 12 1 18-13Z"
                fill="#a696ff"
              />
              <path
                d="M151 157v15m24-3v15m24-2v15m66-13v14m24-29v15m25-29v15M151 75l-18-11m43-5-18-11m43-3-18-11m84 11 17-10m8 24 17-10m8 24 17-10"
                stroke="#62f0dd"
                strokeOpacity=".5"
                strokeWidth="2"
              />
              <path
                d="m70 178-24 14H12m398-14 24 14h34M240 38V14"
                stroke="#a696ff"
                strokeOpacity=".5"
              />
              <circle cx="12" cy="192" r="3" fill="#62f0dd" />
              <circle cx="468" cy="192" r="3" fill="#a696ff" />
              <circle cx="240" cy="14" r="3" fill="#62f0dd" />
            </svg>
            <span className="forge-auth-scene-caption">
              CUSTOMFORGE / YOUR COMMAND CENTER
            </span>
          </div>
          <ul className="forge-auth-benefits">
            <li>
              <Heart size={15} aria-hidden="true" />
              <span>Saved gear</span>
            </li>
            <li>
              <Cpu size={15} aria-hidden="true" />
              <span>Build planning</span>
            </li>
            <li>
              <Package size={15} aria-hidden="true" />
              <span>Order history</span>
            </li>
          </ul>
        </aside>
        <section className="forge-auth-card" aria-labelledby="forge-auth-title">
          <header className="forge-auth-heading">
            <p className="forge-eyebrow">{eyebrow}</p>
            <h1 id="forge-auth-title">{title}</h1>
            <div className="forge-auth-description">{description}</div>
          </header>
          {children}
          <div className="forge-auth-assurance">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Your account. Your loadout. Your next move.</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AuthFeedback({
  tone,
  title,
  children,
}: {
  tone: "error" | "success" | "info";
  title?: string;
  children: ReactNode;
}) {
  const Icon =
    tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div
      className={`forge-auth-feedback is-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function AuthLoading({ message }: { message: string }) {
  return (
    <span className="forge-auth-processing" role="status">
      <i aria-hidden="true" />
      {message}
    </span>
  );
}
