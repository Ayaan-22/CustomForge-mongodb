import {
  HomeCollectionsShelf,
  HomeRecommendationsShelf,
  HomeCommunityShelf,
} from "@/components/forge/home-shelves";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Truck,
  Headphones,
  Cpu,
  Crosshair,
  Wrench,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/forge/experience";
import { Newsletter } from "@/components/forge/newsletter";
import { DealCountdown } from "@/components/forge/countdown";
import { HeroScene, BuildStory } from "@/components/forge/hero-scene";

const categories = [
  {
    name: "Graphics cards",
    detail: "Every frame. Unleashed.",
    category: "GPU",
    image: "/graphics-card-gpu.jpg",
  },
  {
    name: "Processors",
    detail: "Power at the core.",
    category: "CPU",
    image: "/processor-cpu-chip.jpg",
  },
  {
    name: "Gaming gear",
    detail: "Make every move count.",
    category: "Keyboard",
    image: "/gaming-keyboard-mouse.jpg",
  },
  {
    name: "Prebuilt PCs",
    detail: "Your next level, ready.",
    category: "Prebuilt PCs",
    image: "/prebuilt-gaming-pc.jpg",
  },
  {
    name: "Monitors",
    detail: "See the whole game.",
    category: "Monitor",
    image: "/gaming-monitor.jpg",
  },
  {
    name: "Memory & storage",
    detail: "Load faster. Go further.",
    category: "Storage",
    image: "/ssd-nvme-storage.jpg",
  },
];

export default function HomePage() {
  return (
    <div className="forge-home">
      <section className="forge-hero">
        <div className="forge-hero-grid" aria-hidden="true" />
        <HeroScene />
        <div className="forge-container forge-hero-content">
          <div className="forge-hero-copy">
            <p className="forge-eyebrow">
              <span className="forge-status-dot" /> BUILT DIFFERENT. PLAY
              DIFFERENT.
            </p>
            <h1>
              YOUR GAME.
              <br />
              <span>YOUR RULES.</span>
            </h1>
            <p className="forge-hero-description">
              Next-level hardware. Zero compromises.
              <br />
              Forge the setup that puts you ahead of the game.
            </p>
            <div className="forge-hero-actions">
              <Button asChild className="forge-cta">
                <Link href="/products" prefetch={false}>
                  Find your upgrade <ArrowUpRight size={19} />
                </Link>
              </Button>
              <Button asChild variant="outline" className="forge-cta-secondary">
                <Link href="/pc-builder" prefetch={false}>
                  <Wrench size={17} /> Build your PC
                </Link>
              </Button>
            </div>
            <div className="forge-hero-bottom">
              <span>
                <Crosshair size={16} /> PERFORMANCE IS PERSONAL.
              </span>
              <span className="forge-hero-number">
                01 / FORGE YOUR ADVANTAGE
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/products?category=Prebuilt%20PCs"
          prefetch={false}
          className="forge-hero-hud"
        >
          <span className="forge-hud-cross">+</span>
          <span className="forge-eyebrow">THE FORGE STANDARD</span>
          <strong>Built to stand out.</strong>
          <span>
            Explore prebuilt PCs <ArrowRight size={15} />
          </span>
        </Link>
        <div className="forge-hero-coordinate" aria-hidden="true">
          CF / SYSTEM_READY <span>+</span>
        </div>
      </section>
      <div className="forge-service-strip">
        <div className="forge-container">
          {[
            {
              icon: ShieldCheck,
              title: "Secure checkout",
              sub: "Protected payments with Stripe",
            },
            {
              icon: Cpu,
              title: "Built for performance",
              sub: "Hardware for every playstyle",
            },
            {
              icon: Truck,
              title: "Track every upgrade",
              sub: "Order updates in your account",
            },
            {
              icon: Headphones,
              title: "Your whole setup",
              sub: "From the tower to the desktop",
            },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title}>
              <Icon size={24} />
              <span>
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
      <Reveal>
        <section className="forge-container forge-section forge-categories-section">
          <div className="forge-section-heading">
            <div>
              <p className="forge-eyebrow">CHOOSE YOUR LOADOUT</p>
              <h2>Every piece. More possibility.</h2>
            </div>
            <Link href="/products" prefetch={false} className="forge-text-link">
              Shop all categories <ArrowRight size={16} />
            </Link>
          </div>
          <div className="forge-category-grid">
            {categories.map((c, index) => (
              <Link
                href={`/products?category=${encodeURIComponent(c.category)}`}
                prefetch={false}
                className="forge-category"
                key={c.name}
              >
                <span className="forge-category-index">0{index + 1}</span>
                <div className="forge-category-image">
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 190px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3>
                    {c.name}
                    <ArrowUpRight size={16} />
                  </h3>
                  <p>{c.detail}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>
      <Reveal>
        <section className="forge-container forge-section forge-featured">
          <div className="forge-section-heading">
            <div>
              <p className="forge-eyebrow">HANDPICKED FOR YOUR NEXT LEVEL</p>
              <h2>
                Upgrade your advantage<span className="text-primary">.</span>
              </h2>
            </div>
            <Link href="/products" prefetch={false} className="forge-text-link">
              Explore the shop <ArrowRight size={16} />
            </Link>
          </div>
          <HomeCollectionsShelf />
        </section>
      </Reveal>
      <section className="forge-brands">
        <div className="forge-container">
          <span>
            THE NAMES BEHIND
            <br />
            <strong>YOUR NEXT LEVEL.</strong>
          </span>
          <div>
            {["NVIDIA", "AMD", "ASUS", "CORSAIR", "NZXT", "logitech"].map(
              (brand) => (
                <span key={brand}>{brand}</span>
              ),
            )}
          </div>
        </div>
      </section>
      <Reveal>
        <section className="forge-container forge-section">
          <BuildStory>
            <div className="forge-build-art">
              <Image
                src="/custom-gaming-pc-with-rgb-lighting.jpg"
                alt="Close-up of a liquid-cooled RGB gaming PC"
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <div className="forge-build-copy">
              <p className="forge-eyebrow">
                <Wrench size={15} /> THE CUSTOMFORGE PC BUILDER
              </p>
              <h2>
                Dream it.
                <br />
                Build it. <span>Own it.</span>
              </h2>
              <p>
                Pick your parts. Check the fit. Create a rig that&apos;s as
                individual as your playstyle.
              </p>
              <Button asChild>
                <Link href="/pc-builder" prefetch={false}>
                  Start your build <ArrowUpRight />
                </Link>
              </Button>
              <small>
                Eight component slots. One setup that&apos;s all yours.
              </small>
            </div>
            <span className="forge-build-outline" aria-hidden="true">
              BUILD
            </span>
          </BuildStory>
        </section>
      </Reveal>
      <Reveal>
        <section className="forge-container forge-section forge-bestsellers">
          <HomeRecommendationsShelf />
        </section>
      </Reveal>
      <Reveal>
        <section className="forge-container forge-deal-banner">
          <div>
            <p className="forge-eyebrow">
              <Zap size={14} /> MORE PERFORMANCE. LESS SPEND.
            </p>
            <h2>Big upgrades. Better prices.</h2>
            <p>Discover the current deals across the CustomForge catalog.</p>
            <DealCountdown />
          </div>
          <Button variant="outline" asChild>
            <Link href="/deals" prefetch={false}>
              Explore deals <ArrowUpRight />
            </Link>
          </Button>
        </section>
      </Reveal>
      <Reveal>
        <HomeCommunityShelf />
      </Reveal>
      <Newsletter />
    </div>
  );
}
