"use client";

import { lookupBarcode, saveProduct } from "@/app/actions/product";
import { ImagePicker } from "@/components/products/ImagePicker";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function ProductReviewForm({
  params,
}: {
  params: Promise<{ barcode: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const barcode = resolvedParams.barcode;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<string>("pending");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageIsAutoRetrieved, setImageIsAutoRetrieved] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setName("");
      setBrand("");
      setCategory("");
      setDescription("");
      setPrice("");
      setStock("");
      setImageUrl("");
      setImageIsAutoRetrieved(false);
      const result = await lookupBarcode(barcode);
      setLookupStatus(result.status || "pending");

      if (result.data?.name) setName(result.data.name);
      if (result.data?.brand) setBrand(result.data.brand);
      if (result.data?.category) setCategory(result.data.category);
      if (result.data?.description) setDescription(result.data.description);
      if (result.data?.selling_price) setPrice(String(result.data.selling_price));
      if (result.data?.stock_quantity) setStock(String(result.data.stock_quantity));
      if (result.data?.image_url) {
        setImageUrl(result.data.image_url);
        setImageIsAutoRetrieved(true);
      }

      setIsLoading(false);
    }
    fetchData();
  }, [barcode]);

  async function handleSave() {
    if (!name.trim() || !price || !stock) {
      setSaveError("Enter a product name, selling price, and stock quantity before saving.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

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

    setSaveError(result.error || "Failed to save product data.");
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center pt-20">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900">
            Identifying Product...
          </h2>
          <p className="text-gray-500 mt-2">
            Fetching details for barcode {barcode}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col items-center pb-24">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 p-6 bg-white flex justify-between items-center sticky top-0 z-10">
          <Link
            href="/products/new"
            className="text-gray-500 hover:text-gray-900 font-medium text-sm"
          >
            ✕ Cancel
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || lookupStatus === "duplicate_warning"}
            className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Product"}
          </button>
        </div>

        <div className="p-6 space-y-8">
          {lookupStatus === "success" ? (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-3">
              <svg
                className="w-5 h-5 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium text-sm">
                Product information retrieved successfully
              </span>
            </div>
          ) : lookupStatus === "partial" ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
              Some product details were found. Please complete the empty fields before saving.
            </div>
          ) : lookupStatus === "duplicate_warning" ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg">
              This barcode is already in your inventory and cannot be added again.
            </div>
          ) : lookupStatus === "error" ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              We could not look up this barcode right now. You can still enter the product details manually.
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg flex flex-col gap-2">
              <div className="flex items-center gap-3 font-bold">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Product not found</span>
              </div>
              <p className="text-sm">
                We couldn't find information for this barcode. You can continue
                by entering the product information manually.
              </p>
            </div>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
              {saveError}
            </div>
          )}

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Product Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barcode
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={barcode}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500 outline-none"
                  />
                  <span className="absolute right-3 top-3 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                    ✓ Scanned
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {lookupStatus === "success" && (
                    <span className="absolute right-3 top-3 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">
                      ✨ Auto-filled
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Product description"
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Media
            </h3>
            <ImagePicker
              value={imageUrl}
              onChange={url => {
                setImageUrl(url);
                setImageIsAutoRetrieved(false);
              }}
              isAutoRetrieved={imageIsAutoRetrieved && imageUrl !== ""}
            />
          </section>

          <hr className="border-gray-100" />

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Store Details
              </h3>
              <span className="text-xs text-red-500 font-medium">
                * Required
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selling Price *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">
                    KSh
                  </span>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg py-3 pl-12 pr-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
