"use client";

import dynamic from "next/dynamic";
import { DeferredSection } from "./deferred-section";
import { ShelfSkeleton } from "./shelf-skeleton";

const Collections = dynamic(
  () => import("./home-widgets").then((m) => m.HomeCollections),
  { ssr: false, loading: () => <ShelfSkeleton /> },
);
const Recommendations = dynamic(
  () => import("./home-widgets").then((m) => m.HomeRecommendations),
  { ssr: false, loading: () => <ShelfSkeleton /> },
);
const Community = dynamic(
  () => import("./home-widgets").then((m) => m.HomeCommunity),
  { ssr: false },
);

export function HomeCollectionsShelf() {
  return (
    <DeferredSection
      className="forge-deferred-collections"
      fallback={
        <>
          <div className="h-16" aria-hidden="true" />
          <ShelfSkeleton />
        </>
      }
    >
      <Collections />
    </DeferredSection>
  );
}
export function HomeRecommendationsShelf() {
  return (
    <DeferredSection
      className="forge-deferred-recommendations"
      fallback={
        <>
          <div className="h-24" aria-hidden="true" />
          <ShelfSkeleton />
        </>
      }
    >
      <Recommendations />
    </DeferredSection>
  );
}
export function HomeCommunityShelf() {
  return (
    <DeferredSection
      fallback={
        <div
          className="forge-container min-h-[240px]"
          role="status"
          aria-label="Community feedback loading"
        />
      }
    >
      <Community />
    </DeferredSection>
  );
}
