"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, CircleCheck, Info, Package, PackageX, RefreshCw, Warehouse } from "lucide-react";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { QueryError } from "@/components/patterns/query-error";
import { LoadingSkeleton } from "@/components/patterns/loading-skeleton";
import { PageShell } from "@/components/patterns/page-shell";
import { SectionHeader } from "@/components/patterns/section-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "@/lib/api-client";
import type { InventoryAnalytics } from "@/types/analytics";
import { INSIGHTS_COLORS, InsightsDataTable, InsightsEmpty, InsightsTooltip } from "../../components/dashboard-charts";
import "../../forge-insights.css";

type InventoryProduct = InventoryAnalytics["lowStockProducts"][number];
function stockTone(stock: number) { return stock <= 0 ? "is-danger" : stock <= 5 ? "is-warning" : "is-success"; }

function InventoryProductTable({ products, selling = false, empty }: { products: InventoryProduct[]; selling?: boolean; empty: string }) {
  if (!products.length) return <InsightsEmpty title={empty} description={selling ? "Sales activity appears here as products are purchased." : "Your current catalog has no products in this stock group."} />;
  return <div className="fa-table-scroll fi-table-scroll" tabIndex={0} role="region" aria-label="Product inventory, scroll horizontally to view all columns"><table className="fa-data-table fi-table"><thead><tr><th scope="col">Product</th><th scope="col">Category</th><th scope="col">{selling ? "Lifetime units sold" : "SKU"}</th><th scope="col">Stock</th><th scope="col">Visibility</th></tr></thead><tbody>{products.map((product) => <tr key={product.id}><td className="fi-cell-strong">{product.name}</td><td>{product.category || "Uncategorized"}</td><td className={selling ? "fi-numeric" : ""}>{selling ? product.sales_count.toLocaleString() : product.sku || "Not assigned"}</td><td><span className={`fa-status ${stockTone(product.stock)}`}>{product.stock.toLocaleString()} units</span></td><td><span className={`fa-status ${product.is_active ? "is-success" : "is-neutral"}`}>{product.is_active ? "Active" : "Inactive"}</span></td></tr>)}</tbody></table></div>;
}

export default function InventoryAnalyticsPage() {
  const query = useAdminQuery(["analytics", "inventory"], () => apiClient.getInventoryAnalytics());
  const data = query.data;
  const stockDistribution = [
    { name: "In stock", value: data?.stockLevels?.inStock || 0, color: INSIGHTS_COLORS.cyan },
    { name: "Low stock", value: data?.stockLevels?.lowStock || 0, color: INSIGHTS_COLORS.warning },
    { name: "Out of stock", value: data?.stockLevels?.outOfStock || 0, color: INSIGHTS_COLORS.danger },
  ];
  const productCount = stockDistribution.reduce((total, group) => total + group.value, 0);

  return <PageShell className="fi-page">
    <SectionHeader eyebrow="Catalog intelligence" title="Inventory health" description="Stay ahead of stock pressure and keep the next upgrade ready to ship." icon={<Warehouse />} actions={<><Button type="button" variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}><RefreshCw aria-hidden className={query.isFetching ? "fi-refreshing" : ""} /> Refresh report</Button><Button asChild variant="outline"><Link href="/admin/products">Manage catalog <ArrowUpRight aria-hidden /></Link></Button></>} />
    {query.error ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {query.isLoading ? <LoadingSkeleton variant="dashboard" /> : null}
    {!query.isLoading && !query.error && data ? <>
      <div className="fa-stat-grid fi-stock-grid">
        {[
          { label: "Total stock", value: data.stockLevels?.totalStock || 0, detail: "Units across the catalog", Icon: Boxes },
          { label: "Average stock", value: data.stockLevels?.avgStock || 0, detail: "Units per product", Icon: Package },
          { label: "In stock", value: data.stockLevels?.inStock || 0, detail: "Products with more than 5 units", Icon: CircleCheck },
          { label: "Low stock", value: data.stockLevels?.lowStock || 0, detail: "Products with 1–5 units", Icon: AlertTriangle },
          { label: "Out of stock", value: data.stockLevels?.outOfStock || 0, detail: "Products with 0 or fewer units", Icon: PackageX },
        ].map(({ label, value, detail, Icon }) => <Card key={label} className="fa-stat fi-metric"><div className="fi-metric-top"><span>{label}</span><span className="fi-metric-icon"><Icon aria-hidden /></span></div><strong className="fi-metric-value">{value.toLocaleString()}</strong><div className="fi-metric-bottom"><span>{detail}</span></div></Card>)}
      </div>
      <p className="fi-scope-note"><Info aria-hidden /> Current inventory includes active and inactive products. Stock totals are units; stock status counts are products. Lifetime sales counts are not limited to a reporting period.</p>

      <div className="fi-chart-grid is-equal">
        <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Availability snapshot</p><h2>Stock distribution</h2><p>Product count by current stock threshold.</p></div></div>
          {productCount > 0 ? <><div className="fi-donut-wrap"><div className="fi-chart" role="img" aria-label={`${productCount.toLocaleString()} products: ${stockDistribution.map((group) => `${group.value.toLocaleString()} ${group.name.toLowerCase()}`).join(", ")}.`}><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={stockDistribution} cx="50%" cy="50%" innerRadius={72} outerRadius={96} paddingAngle={3} stroke="none" dataKey="value" nameKey="name" isAnimationActive={false}>{stockDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip content={<InsightsTooltip />} /></PieChart></ResponsiveContainer></div><div className="fi-donut-center" aria-hidden><strong>{productCount.toLocaleString()}</strong><span>total products</span></div></div><div className="fi-stock-legend">{stockDistribution.map((group) => <div key={group.name}><strong>{group.value.toLocaleString()}</strong><span><i style={{ background: group.color }} />{group.name}</span></div>)}</div></> : <InsightsEmpty title="Your catalog is empty" description="Stock distribution appears when products are added to your catalog." />}
        </Card>
        <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Stock allocation</p><h2>Stock by category</h2><p>Total and average units held by each category.</p></div></div>
          {data.categoryStock?.length ? <><div className="fi-chart" style={{ height: Math.max(250, Math.min(460, data.categoryStock.length * 48)) }} role="img" aria-label={`Stock allocation across ${data.categoryStock.length} categories. Exact total, average, and product counts are available in the chart data table.`}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.categoryStock} layout="vertical" margin={{ left: -10, right: 16, top: 0, bottom: 4 }} barGap={3} accessibilityLayer><CartesianGrid horizontal={false} strokeDasharray="3 5" stroke={INSIGHTS_COLORS.grid} /><XAxis type="number" axisLine={false} tickLine={false} tickMargin={9} /><YAxis dataKey="category" type="category" axisLine={false} tickLine={false} width={132} tickMargin={10} /><Tooltip content={<InsightsTooltip />} cursor={{ fill: INSIGHTS_COLORS.cursorFill }} /><Bar dataKey="totalStock" name="Total units" fill={INSIGHTS_COLORS.cyan} radius={[0, 3, 3, 0]} maxBarSize={15} isAnimationActive={false} /><Bar dataKey="avgStock" name="Average units per product" fill={INSIGHTS_COLORS.violet} radius={[0, 3, 3, 0]} maxBarSize={15} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><div className="fi-legend"><span><i />Total units</span><span><i className="is-violet" />Avg. units / product</span></div><InsightsDataTable title="Current category inventory" rows={data.categoryStock} columns={[{ key: "category", label: "Category" }, { key: "totalStock", label: "Total units" }, { key: "avgStock", label: "Avg. units / product" }, { key: "productCount", label: "Products" }, { key: "lowStockCount", label: "Products at 5 units or fewer" }]} /></> : <InsightsEmpty title="No category stock to report" description="Category inventory appears when your catalog contains products." />}
        </Card>
      </div>

      <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Replenishment queue</p><h2><AlertTriangle aria-hidden /> Low stock products</h2><p>Up to 10 products with 1–5 units, ordered by remaining stock.</p></div><span className="fa-status is-warning">{(data.stockLevels?.lowStock || 0).toLocaleString()} total</span></div><InventoryProductTable products={data.lowStockProducts || []} empty="No low stock products" /></Card>
      <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Availability queue</p><h2><PackageX aria-hidden /> Out of stock products</h2><p>Up to 10 products with zero or negative stock.</p></div><span className="fa-status is-danger">{(data.stockLevels?.outOfStock || 0).toLocaleString()} total</span></div><InventoryProductTable products={data.outOfStockProducts || []} empty="No out of stock products" /></Card>
      <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Demand watch</p><h2>Top selling products</h2><p>Up to 10 products ranked by lifetime units sold, with current availability.</p></div><Button asChild variant="outline"><Link href="/admin/products">View products <ArrowUpRight aria-hidden /></Link></Button></div><InventoryProductTable products={data.topSellingProducts || []} selling empty="No product sales to report" /></Card>
    </> : null}
  </PageShell>;
}
