import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RequestError } from "@/lib/query-result";
import type { Product } from "@/lib/types";

const fixture = vi.hoisted(() => ({
  comparison: [] as Product[],
  toggleCompare: vi.fn(),
  clearComparison: vi.fn(),
}));
vi.mock("@/lib/forge-store", () => ({
  useForgeStore: (selector: (state: typeof fixture) => unknown) =>
    selector(fixture),
}));
import ComparePage from "@/app/compare/page";

const product = (id: string, name: string): Product => ({
  id,
  name,
  category: "GPU",
  brand: "Published Brand",
  sku: `TEST-${id}`,
  originalPrice: 100,
  finalPrice: 90,
  availability: "In Stock",
  images: [],
  description: "",
  ratings: { average: 0, totalReviews: 0 },
  specifications: [{ key: "VRAM", value: "12 GB" }],
});
afterEach(() => {
  fixture.comparison = [];
  vi.clearAllMocks();
});

describe("comparison column recovery", () => {
  it("renders a healthy product and a per-product retry/remove state when one query fails", () => {
    const healthy = product("healthy", "Healthy contender");
    const unavailable = product("gone", "Unavailable contender");
    fixture.comparison = [healthy, unavailable];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });
    client.setQueryData(["products", healthy.id], {
      data: healthy,
      error: null,
      status: 200,
    });
    const failed = client
      .getQueryCache()
      .build(client, { queryKey: ["products", unavailable.id] });
    failed.setState({
      status: "error",
      error: new RequestError("Not found", 404),
      data: undefined,
      fetchStatus: "idle",
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ComparePage />
      </QueryClientProvider>,
    );
    expect(html).toContain("Healthy contender");
    expect(html).toContain("Listing unavailable");
    expect(html).toContain("Try again");
    expect(html).toContain("Remove Unavailable contender from comparison");
    expect(html).toContain("$90.00");
    expect(html).toContain("12 GB");
    expect(html.match(/class="forge-comparison-product"/g)).toHaveLength(2);
    expect(html).toContain('type="checkbox" disabled=""');
    client.clear();
  });
  it("keeps a selected loading column beside completed records instead of blanking the table", () => {
    const healthy = product("healthy", "Healthy contender");
    fixture.comparison = [healthy, product("loading", "Loading contender")];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });
    client.setQueryData(["products", healthy.id], {
      data: healthy,
      error: null,
      status: 200,
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <ComparePage />
      </QueryClientProvider>,
    );
    expect(html).toContain("$90.00");
    expect(html).toContain("Loading current details");
    expect(html).toContain("Loading contender");
    expect(html.match(/class="forge-comparison-product"/g)).toHaveLength(2);
    client.clear();
  });
});
