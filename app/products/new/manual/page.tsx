"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveProduct } from "@/app/actions/product";
import { ImagePicker } from "@/components/products/ImagePicker";

export default function ManualProductPage() {
  const router = useRouter();

  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!barcode.trim() || !name.trim() || !price || !stock) {
      setError("Enter a barcode, product name, selling price, and stock quantity before saving.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const result = await saveProduct({
      barcode,
      name,
      brand,
      category,
      description,
      price,
      stock,
      imageUrl,
    });

    if (result.success) {
      router.push("/products");
      return;
    }

    setError(result.error || "Failed to save product data.");
    setIsSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center pt-10">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-6">
          <Link
            href="/products/new"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Add Product Manually
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Fill in the product details below.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Product Name *
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Premium Coffee Beans"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Barcode *
              <input
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. 1234567890"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Brand
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="Brand name"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Category
              <input
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="Groceries, Home, etc."
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
              rows={4}
              placeholder="Describe the product..."
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Selling Price *
              <input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                required
                min="0"
                step="0.01"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="0.00"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Stock Quantity *
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                required
                min="0"
                step="1"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </label>
          </div>

          <ImagePicker value={imageUrl} onChange={setImageUrl} />

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 font-medium text-white hover:bg-black transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
