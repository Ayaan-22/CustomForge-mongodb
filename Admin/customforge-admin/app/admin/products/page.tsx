"use client";
import { useUrlState } from "@/hooks/use-url-state";
import type { AdminProduct, AdminProductPayload } from "@/types/admin";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { useConfirmation } from "@/hooks/use-confirmation";

import { useAdminQuery } from '@/hooks/use-admin-query';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { QueryError } from '@/components/patterns/query-error';
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Package, Search, LayoutGrid, List, Eye, Edit2, Boxes, SlidersHorizontal } from "lucide-react";
import { SectionHeader } from "@/components/patterns/section-header";
import { PageShell } from "@/components/patterns/page-shell";
import { ActionBar } from "@/components/patterns/action-bar";
import { Pagination } from "@/components/patterns/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "../forge-commerce.css";
import { ProductModal } from "../components/product-modal";
import { ProductDetailsModal } from "../components/product-details-modal";
import { ProductCard } from "../components/product-card";
import { apiClient } from "@/lib/api-client";
import { isLowStock } from "@/lib/commerce-policy";
import { useToast } from "@/hooks/use-toast";

const PRODUCT_CATEGORIES = [
  "Prebuilt PCs",
  "CPU",
  "GPU",
  "Motherboard",
  "RAM",
  "Storage",
  "Power Supply",
  "Cooler",
  "Case",
  "OS",
  "Networking",
  "RGB",
  "CaptureCard",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Mousepad",
  "Headset",
  "Speakers",
  "Controller",
  "ExternalStorage",
  "VR",
  "StreamingGear",
  "Microphone",
  "Webcam",
  "GamingChair",
  "GamingDesk",
  "SoundCard",
  "Cables",
  "GamingLaptop",
  "Games",
  "PCGames",
  "ConsoleGames",
  "VRGames",
];

export default function ProductsPage() {
  const { toast } = useToast();
  const runMutation = useAdminMutation();
  const { confirm: requestConfirmation, confirmationDialog } = useConfirmation();
  const [searchTerm, setSearchTerm] = useUrlState("searchTerm", "");
  const [categoryFilter, setCategoryFilter] = useUrlState("categoryFilter", "all");
  const [statusFilter, setStatusFilter] = useUrlState("statusFilter", "all");
  const [page, setPage] = useUrlState("page", 1);
  const [limit, setLimit] = useUrlState("limit", 12);


  const [view, setView] = useState<"grid" | "list">("grid");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [detailsProduct, setDetailsProduct] = useState<AdminProduct | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const search = useDebouncedValue(searchTerm);
  const filters = { page, limit, search: search, category: categoryFilter === 'all' ? undefined : categoryFilter, isActive: statusFilter === 'all' ? undefined : String(statusFilter === 'active'), sortBy: 'created_at', sortOrder: 'desc' };
  const listQuery = useAdminQuery(['products', filters], () => apiClient.getProducts(filters));
  const statsQuery = useAdminQuery(['analytics', 'products'], () => apiClient.getProductStats());
  const products: AdminProduct[] = listQuery.data?.data ?? [];
  const totalPages = listQuery.data?.pages ?? 1;
  const totalProducts = listQuery.data?.count ?? 0;
  const productStats = statsQuery.data;
  const loading = listQuery.isLoading;
  const fetchProducts = () => { void listQuery.refetch(); void statsQuery.refetch(); };


  const handleAddProduct = async (newProduct: AdminProductPayload) => {
    try {
      if (editingProduct) {
        await runMutation(() => apiClient.updateProduct(editingProduct.id, newProduct));
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        await runMutation(() => apiClient.createProduct(newProduct));
        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: ((error instanceof Error && error.message) || "Failed to save product"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (await requestConfirmation({ title: "Delete this product?", description: "This permanently removes the product from your catalogue. This action cannot be undone.", confirmLabel: "Delete product" })) {
      try {
        await runMutation(() => apiClient.deleteProduct(id)); // Assuming ID is number based on api-client
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
        fetchProducts();
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: ((error instanceof Error && error.message) || "Failed to delete product"),
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleVisibility = async (id: string) => {
    try {
      await runMutation(() => apiClient.toggleProductActive(id));
      toast({ title: "Success", description: "Product status updated" });
      fetchProducts();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: ((error instanceof Error && error.message) || "Failed to update product status"),
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: AdminProduct) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleViewDetails = (product: AdminProduct) => {
    setDetailsProduct(product);
    setIsDetailsOpen(true);
  };

  return (
    <PageShell className="fc-page">
      <SectionHeader eyebrow="Commerce / Inventory" icon={<Boxes size={20} />} title="Product inventory" description="Curate the storefront. Keep every SKU, price and stock level in sync." actions={<Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
        <Plus size={16} />Add product</Button>} />
      <QueryError error={listQuery.error || statsQuery.error} retry={fetchProducts} />
      {productStats && (
        <div className="fa-stat-grid">
          <Card className="fa-stat">
            <span>Products</span>
            <strong>{productStats.totalProducts}</strong>
            <small>Complete inventory</small>
          </Card>
          <Card className="fa-stat">
            <span>Published</span>
            <strong className="fc-cyan">{productStats.activeProducts}</strong>
            <small>Visible on the storefront</small>
          </Card>
          <Card className="fa-stat">
            <span>Low stock</span>
            <strong className="fc-amber">{productStats.lowStock}</strong>
            <small>1–5 available units</small>
          </Card>
          <Card className="fa-stat">
            <span>Out of stock</span>
            <strong className="fc-red">{productStats.outOfStock}</strong>
            <small>Needs replenishment</small>
          </Card>
        </div>
      )}
      <ActionBar layout="filters" className="fc-filters">
        <div className="fa-field"><label htmlFor="products-search">Search products</label><div className="fc-search">
          <Search size={17} aria-hidden="true" />
          <Input id="products-search" aria-label="Search products" placeholder="Search name, SKU or brand…" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
        </div></div>
        <div className="fa-field"><label htmlFor="products-category">Category</label><Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(1); }}>
          <SelectTrigger id="products-category" aria-label="Filter product category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>{["all", ...PRODUCT_CATEGORIES].map((cat) => <SelectItem key={cat} value={cat}>{cat === "all" ? "All categories" : cat}</SelectItem>)}</SelectContent>
        </Select></div>
        <div className="fa-field"><label htmlFor="products-visibility">Visibility</label><Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger id="products-visibility" aria-label="Filter product visibility">
            <SlidersHorizontal size={15} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All visibility</SelectItem>
            <SelectItem value="active">Published</SelectItem>
            <SelectItem value="inactive">Hidden</SelectItem>
          </SelectContent>
        </Select></div>
      </ActionBar>
      <section className="fa-panel fc-catalog-panel" aria-label="Product catalogue">
        <div className="fa-panel-heading">
          <div>
            <h2>Catalogue</h2>
            <p>{totalProducts} matching products</p>
          </div>
          <div className="fa-segmented" role="group" aria-label="Product view">
            <Button variant="outline" size="icon" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}>
              <LayoutGrid size={17} />
            </Button>
            <Button variant="outline" size="icon" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <List size={17} />
            </Button>
          </div>
        </div>
        {loading ? <div className="fc-product-grid" aria-label="Loading products" aria-busy="true">{Array.from({ length: 6 }, (_, i) =>
          <div key={i} className="fc-product-skeleton">
            <div />
            <span />
            <span />
          </div>)}</div> : products.length === 0 ? (
            <div className="fc-empty">
              <Package size={34} />
              <h3>No products found</h3>
              <p>{searchTerm || categoryFilter !== "all" || statusFilter !== "all" ? "Try another search or clear your filters." : "Add your first product to bring the catalogue to life."}</p>{searchTerm || categoryFilter !== "all" || statusFilter !== "all" ? <Button variant="outline" onClick={() => { setSearchTerm(""); setCategoryFilter("all"); setStatusFilter("all"); setPage(1); }}>Clear filters</Button> : <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
                <Plus size={16} />Add product</Button>}</div>
          ) : view === "grid" ? (
            <div className="fc-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onView={handleViewDetails} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onToggleVisibility={handleToggleVisibility} />)}</div>
          ) : (
          <div className="fa-table-scroll" role="region" aria-label="Product catalogue" tabIndex={0}>
            <table className="fa-data-table fc-product-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Visibility</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>{products.map((product) => <tr key={product.id}>
                <td>
                  <div className="fc-table-product">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" /> : <span>
                    <Package size={20} />
                  </span>}<div>
                      <strong>{product.name}</strong>
                      <small>{product.sku} · {product.category}</small>
                    </div>
                  </div>
                </td>
                <td className="fc-numeric">${Number(product.finalPrice).toFixed(2)}</td>
                <td>
                  <span className={`fa-status ${product.stock === 0 ? "is-danger" : isLowStock(product.stock) ? "is-warning" : "is-success"}`}>{product.stock} units</span>
                </td>
                <td>
                  <span className={`fa-status ${product.isActive ? "is-success" : "is-neutral"}`}>{product.isActive ? "Published" : "Hidden"}</span>
                </td>
                <td>
                  <div className="fc-table-actions">
                    <Button variant="outline" size="icon" aria-label={`View ${product.name}`} onClick={() => handleViewDetails(product)}>
                      <Eye size={16} />
                    </Button>
                    <Button variant="outline" size="icon" aria-label={`Edit ${product.name}`} onClick={() => handleEditProduct(product)}>
                      <Edit2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {!loading && <Pagination page={page} pages={totalPages} pending={listQuery.isFetching} onPage={setPage} total={totalProducts} pageSize={limit} noun="products"
          pageSizeControl={<Select value={String(limit)} disabled={listQuery.isFetching} onValueChange={(value) => { setLimit(Number(value)); setPage(1); }}>
            <SelectTrigger aria-label="Products per page"><SelectValue /></SelectTrigger>
            <SelectContent>{[12, 24, 48].map((size) => <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>)}</SelectContent>
          </Select>} />}
      </section>
      <ProductModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProduct(null); }} onSubmit={handleAddProduct} initialData={editingProduct} isEditing={!!editingProduct} />
      <ProductDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} product={detailsProduct} />
      {confirmationDialog}
    </PageShell>
  );
}
