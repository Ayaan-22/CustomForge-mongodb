import Link from "next/link";
import { Crosshair, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="forge-container forge-empty min-h-[65vh]">
      <Crosshair size={48} />
      <p className="forge-eyebrow">ERROR 404 / OFF THE GRID</p>
      <h1 className="text-5xl font-bold tracking-tighter">Lost in the game?</h1>
      <p>This page has left the lobby. Your next upgrade is still out there.</p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/products">
            Explore the shop <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to base</Link>
        </Button>
      </div>
    </div>
  );
}
