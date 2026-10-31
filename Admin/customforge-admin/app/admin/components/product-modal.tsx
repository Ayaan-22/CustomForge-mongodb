"use client";

import type React from "react";
import type { AdminProduct, AdminProductPayload } from "@/types/admin";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Trash2, Package, ImagePlus, ListChecks, DollarSign, Ruler } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "../forge-commerce.css";

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

type ProductFormData = Omit<AdminProductPayload,
  'originalPrice' | 'discountPercentage' | 'stock' | 'weight' | 'dimensions' | 'imageFiles'
> & {
  originalPrice: string | number;
  discountPercentage: string | number;
  stock: string | number;
  weight: string | number;
  dimensions: { length: string | number; width: string | number; height: string | number };
  imageFiles: File[];
};

type ProductInitialData = Omit<Partial<AdminProduct>, 'specifications' | 'features' | 'dimensions'> & {
  specifications?: AdminProduct['specifications'] | string;
  features?: AdminProduct['features'] | string;
  dimensions?: AdminProduct['dimensions'] | string;
};

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: AdminProductPayload) => Promise<void>;
  initialData?: ProductInitialData | null;
  isEditing?: boolean;
}

export function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing,
}: ProductModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    category: "CPU",
    brand: "",
    description: "",
    originalPrice: "",
    discountPercentage: 0,
    stock: "",
    images: [],
    imageFiles: [],
    specifications: [],
    features: [],
    warranty: "1 year limited warranty",
    weight: "",
    dimensions: { length: "", width: "", height: "" },
    isActive: true,
    isFeatured: false,
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newSpec, setNewSpec] = useState({ key: "", value: "" });
  const [newFeature, setNewFeature] = useState("");

  // Update formData when initialData changes (for editing)
  useEffect(() => {
    setFormError("");
    setUploadError("");
    if (initialData && isEditing) {
      setFormData({
        name: initialData.name || "",
        sku: initialData.sku || "",
        category: initialData.category || "CPU",
        brand: initialData.brand || "",
        description: initialData.description || "",
        originalPrice: initialData.originalPrice ?? "",
        discountPercentage: initialData.discountPercentage || 0,
        stock: initialData.stock ?? "",
        images: initialData.images || [],
        imageFiles: [],
        specifications:
          typeof initialData.specifications === "string"
            ? JSON.parse(initialData.specifications)
            : initialData.specifications || [],
        features:
          typeof initialData.features === "string"
            ? JSON.parse(initialData.features)
            : initialData.features || [],
        warranty: initialData.warranty || "1 year limited warranty",
        weight: initialData.weight || "",
        dimensions: {
          length: "",
          width: "",
          height: "",
          ...(typeof initialData.dimensions === "string"
            ? JSON.parse(initialData.dimensions)
            : initialData.dimensions || {}),
        },
        isActive:
          initialData.isActive !== undefined ? initialData.isActive : true,
        isFeatured: initialData.isFeatured || false,
      });
    } else if (!isEditing) {
      // Reset form when adding new product
      setFormData({
        name: "",
        sku: "",
        category: "CPU",
        brand: "",
        description: "",
        originalPrice: "",
        discountPercentage: 0,
        stock: "",
        images: [],
        imageFiles: [],
        specifications: [],
        features: [],
        warranty: "1 year limited warranty",
        weight: "",
        dimensions: { length: "", width: "", height: "" },
        isActive: true,
        isFeatured: false,
      });
    }
  }, [initialData, isEditing, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleDimensionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      dimensions: {
        ...prev.dimensions,
        [name]: value,
      },
    }));
  };

  const addImage = () => {
    if (newImage.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, newImage],
      }));
      setNewImage("");
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const addSpecification = () => {
    if (newSpec.key.trim() && newSpec.value.trim()) {
      setFormData((prev) => ({
        ...prev,
        specifications: [...prev.specifications, newSpec],
      }));
      setNewSpec({ key: "", value: "" });
    }
  };

  const removeSpecification = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, newFeature],
      }));
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Product name is required");
      return;
    }
    if (!formData.sku.trim()) {
      setFormError("SKU is required");
      return;
    }
    if (!formData.brand.trim()) {
      setFormError("Brand is required");
      return;
    }
    if (!formData.description.trim()) {
      setFormError("Description is required");
      return;
    }
    if (formData.images.length === 0) {
      setFormError("At least one image is required");
      return;
    }
    if (!formData.originalPrice) {
      setFormError("Original price is required");
      return;
    }
    if (formData.stock === "") {
      setFormError("Stock quantity is required");
      return;
    }

    const submitData = {
      ...formData,
      originalPrice: Number.parseFloat(String(formData.originalPrice)),
      discountPercentage: Number(formData.discountPercentage),
      stock: Number.parseInt(String(formData.stock)),
      weight: formData.weight ? Number.parseFloat(String(formData.weight)) : undefined,
      dimensions: {
        length: formData.dimensions.length
          ? Number.parseFloat(String(formData.dimensions.length))
          : undefined,
        width: formData.dimensions.width
          ? Number.parseFloat(String(formData.dimensions.width))
          : undefined,
        height: formData.dimensions.height
          ? Number.parseFloat(String(formData.dimensions.height))
          : undefined,
      },
    };

    setSaving(true);
    try { await onSubmit(submitData); } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="fc-modal fc-editor">
        <div className="fc-modal-header">
          <span className="fa-kicker">Catalogue editor</span>
          <DialogTitle>{isEditing ? "Edit product" : "Add a new product"}</DialogTitle>
          <DialogDescription>Product information, pricing and media for your storefront. Fields marked * are required.</DialogDescription>
        </div>
        <form onSubmit={handleSubmit} className="fc-editor-form">
          <section>
            <h3 className="fc-editor-section-title">
              <Package size={16} />Product essentials</h3>
            <div className="fa-form-grid">
              <div className="fa-field">
                <label htmlFor="product-name">Product name *</label>
                <Input id="product-name" name="name" value={formData.name} onChange={handleChange} placeholder="Enter product name" maxLength={100} required />
              </div>
              <div className="fa-field">
                <label htmlFor="product-sku">SKU *</label>
                <Input id="product-sku" name="sku" value={formData.sku} onChange={handleChange} placeholder="e.g. CF-GPU-001" disabled={isEditing} required />
              </div>
              <div className="fa-field">
                <label htmlFor="product-category">Category *</label>
                <Select value={formData.category} onValueChange={(category) => setFormData((prev) => ({ ...prev, category }))} required>
                  <SelectTrigger id="product-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>{PRODUCT_CATEGORIES.map((cat) =>
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="fa-field">
                <label htmlFor="product-brand">Brand *</label>
                <Input id="product-brand" name="brand" value={formData.brand} onChange={handleChange} placeholder="Enter brand" required />
              </div>
            </div>
            <div className="fa-field fc-field-after">
              <label htmlFor="product-description">Description *</label>
              <textarea id="product-description" name="description" value={formData.description} onChange={handleChange} placeholder="Tell customers what makes this product stand out…" className="w-full rounded-lg resize-y" rows={4} maxLength={2000} required />
              <span className="fc-muted">{formData.description.length}/2000 characters</span>
            </div>
          </section>
          <section>
            <h3 className="fc-editor-section-title">
              <DollarSign size={16} />Pricing & inventory</h3>
            <div className="fc-three-columns">
              <div className="fa-field">
                <label htmlFor="product-price">Original price ($) *</label>
                <Input id="product-price" type="number" name="originalPrice" value={formData.originalPrice} onChange={handleChange} placeholder="0.00" step="0.01" min="0" required />
              </div>
              <div className="fa-field">
                <label htmlFor="product-discount">Discount (%)</label>
                <Input id="product-discount" type="number" name="discountPercentage" value={formData.discountPercentage} onChange={handleChange} min="0" max="100" />
              </div>
              <div className="fa-field">
                <label htmlFor="product-stock">Stock quantity *</label>
                <Input id="product-stock" type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="0" min="0" required />
              </div>
            </div>
            <div className="fc-price-preview">
              <span>Storefront price after discount</span>
              <strong>${(Number(formData.originalPrice || 0) * (1 - Number(formData.discountPercentage || 0) / 100)).toFixed(2)}</strong>
            </div>
          </section>
          <section>
            <h3 className="fc-editor-section-title">
              <ImagePlus size={16} />Product media *</h3>
            <label className="fc-upload" htmlFor="product-image-upload">
              <div>
                <ImagePlus size={26} className="mx-auto mb-2" />
                <p>Choose product images</p>
                <p>PNG, JPG or WEBP · Up to 5 MB each</p>
              </div>
              <input id="product-image-upload" type="file" accept="image/*" multiple onChange={(e) => {
                setUploadError("");
                  const files = Array.from(e.target.files || []);
                files.forEach((file) => {
                  if (file.size > 5 * 1024 * 1024) { setUploadError(`${file.name} is too large. Maximum file size is 5 MB.`); return; }
                  const reader = new FileReader();
                  reader.onloadend = () => { setFormData((prev) => ({ ...prev, images: [...prev.images, reader.result as string], imageFiles: [...(prev.imageFiles || []), file] })); };
                  reader.readAsDataURL(file);
                });
                e.target.value = "";
              }} />
            </label>
            {uploadError && <p className="fc-form-error" role="alert">{uploadError}</p>}
            <div className="fc-input-action fc-field-after">
              <Input aria-label="Product image URL" value={newImage} onChange={(e) => setNewImage(e.target.value)} placeholder="Or paste an image URL…" />
              <Button type="button" variant="outline" onClick={addImage} aria-label="Add image URL">
                <Plus size={16} />Add</Button>
            </div>
            {formData.images.length > 0 ? <div className="fc-image-grid fc-field-after">{formData.images.map((img: string, idx: number) =>
              <div className="fc-image-preview" key={idx}>
                <img src={img} alt={`Product image ${idx + 1}`} />
                <button type="button" className="fc-image-remove" onClick={() => removeImage(idx)} aria-label={`Remove product image ${idx + 1}`}>
                  <Trash2 size={14} />
                </button>
              </div>)}</div> : <p className="fc-muted fc-field-after">Add at least one image. The first image becomes the catalogue cover.</p>}
          </section>
          <section>
            <h3 className="fc-editor-section-title">
              <ListChecks size={16} />Specifications & features</h3>
            <div className="fa-field">
              <label>Specifications</label>
              <div className="fc-input-action fc-spec-entry">
                <Input aria-label="Specification name" value={newSpec.key} onChange={(e) => setNewSpec({ ...newSpec, key: e.target.value })} placeholder="Name (e.g. Processor)" />
                <Input aria-label="Specification value" value={newSpec.value} onChange={(e) => setNewSpec({ ...newSpec, value: e.target.value })} placeholder="Value (e.g. Intel i9)" />
                <Button type="button" variant="outline" onClick={addSpecification} aria-label="Add specification">
                  <Plus size={16} />
                </Button>
              </div>
            </div>
            <div className="fc-editor-list">{formData.specifications.map((spec, idx) =>
              <div className="fc-editor-list-row" key={idx}>
                <span>
                  <strong>{spec.key}</strong> · {spec.value}</span>
                <button type="button" onClick={() => removeSpecification(idx)} aria-label={`Remove specification ${spec.key}`}>
                  <Trash2 size={14} />
                </button>
              </div>)}</div>
            <div className="fa-field fc-field-after">
              <label htmlFor="product-new-feature">Features</label>
              <div className="fc-input-action">
                <Input id="product-new-feature" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add a product highlight…" />
                <Button type="button" variant="outline" onClick={addFeature} aria-label="Add feature">
                  <Plus size={16} />
                </Button>
              </div>
            </div>
            <div className="fc-editor-list">{formData.features.map((feature: string, idx: number) =>
              <div className="fc-editor-list-row" key={idx}>
                <span>{feature}</span>
                <button type="button" onClick={() => removeFeature(idx)} aria-label={`Remove feature ${idx + 1}`}>
                  <Trash2 size={14} />
                </button>
              </div>)}</div>
          </section>
          <section>
            <h3 className="fc-editor-section-title">
              <Ruler size={16} />Shipping & warranty</h3>
            <div className="fa-form-grid">
              <div className="fa-field">
                <label htmlFor="product-warranty">Warranty</label>
                <Input id="product-warranty" name="warranty" value={formData.warranty} onChange={handleChange} placeholder="e.g. 1 year limited warranty" />
              </div>
              <div className="fa-field">
                <label htmlFor="product-weight">Weight (kg)</label>
                <Input id="product-weight" type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0.00" step="0.01" min="0" />
              </div>
            </div>
            <div className="fc-three-columns fc-field-after">{(["length", "width", "height"] as const).map((dimension) =>
              <div className="fa-field" key={dimension}>
                <label htmlFor={`product-${dimension}`} className="capitalize">{dimension} (cm)</label>
                <Input id={`product-${dimension}`} type="number" name={dimension} value={formData.dimensions[dimension]} onChange={handleDimensionChange} placeholder="0.00" step="0.01" min="0" />
              </div>)}</div>
          </section>
          <div className="fc-publish-controls">
            <label>
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />Publish to storefront</label>
            <label>
              <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} />Feature this product</label>
          </div>
          {formError && <p className="fc-form-error" role="alert">{formError}</p>}
          <div className="fc-modal-footer">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving product…" : isEditing ? "Update product" : "Add product"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
