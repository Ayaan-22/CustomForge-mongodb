import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Gamepad2 } from "lucide-react";
import { Brand } from "@/components/forge/brand";

export function Footer() {
  return (
    <footer className="forge-footer">
      <div className="forge-container">
        <div className="forge-footer-top">
          <div className="forge-footer-brand">
            <Link href="/" prefetch={false}>
              <Brand />
            </Link>
            <p>
              For the frame chasers. The world builders.
              <br />
              The one-more-game crowd.
              <br />
              <strong>Forge your advantage.</strong>
            </p>
            <span>
              <Gamepad2 size={16} /> BUILT BY GAMERS. FOR GAMERS.
            </span>
          </div>
          {[
            {
              title: "Find your gear",
              links: [
                ["PC components", "/products?category=GPU"],
                ["Gaming peripherals", "/products?category=Keyboard"],
                ["Prebuilt PCs", "/products?category=Prebuilt%20PCs"],
                ["Deals", "/deals"],
              ],
            },
            {
              title: "Make it yours",
              links: [
                ["PC builder", "/pc-builder"],
                ["Compare products", "/compare"],
                ["Wishlist", "/wishlist"],
                ["Explore all products", "/products"],
              ],
            },
            {
              title: "Your command center",
              links: [
                ["My account", "/profile"],
                ["Order history", "/orders"],
                ["Shipping addresses", "/addresses"],
                ["Security & 2FA", "/profile/security"],
              ],
            },
          ].map((group) => (
            <div key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} prefetch={false}>
                      {label}
                      <ArrowUpRight size={13} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="forge-footer-bottom">
          <p>© {new Date().getFullYear()} CustomForge. All rights reserved.</p>
          <span>
            <ShieldCheck size={15} /> Secure payments with Stripe
          </span>
          <span className="forge-footer-signature">
            GOOD GEAR. GREAT GAMES.
          </span>
        </div>
      </div>
    </footer>
  );
}
