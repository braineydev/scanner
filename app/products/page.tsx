import Link from "next/link";
import { listProducts } from "@/app/actions/product";
import { signOut } from "@/app/actions/auth";

function formatPrice(value: number) {
  return `KSh ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        Out of stock
      </span>
    );
  }
  if (quantity <= 5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
        Low stock · {quantity}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
      {quantity} in stock
    </span>
  );
}

export default async function ProductsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const category = params.category ?? "";

  const { products, categories, error } = await listProducts({ search, category });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="mt-1 text-sm text-gray-500">
              {products.length} item{products.length === 1 ? "" : "s"}
              {search || category ? " matching your filters" : " in your catalog"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/products/new"
              className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              + Add Product
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <form className="mb-6 flex flex-col gap-3 sm:flex-row" action="/products">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name, barcode, or SKU"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:flex-1"
          />
          <select
            name="category"
            defaultValue={category}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:w-56"
          >
            <option value="">All categories</option>
            {categories.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:w-auto"
          >
            Filter
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && products.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {search || category ? "No products match your filters" : "No products yet"}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {search || category
                ? "Try a different search term or clear the category filter."
                : "Scan a barcode or enter a product manually to get started."}
            </p>
            {!search && !category && (
              <Link
                href="/products/new"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Add your first product
              </Link>
            )}
          </div>
        )}

        {products.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold"></th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Barcode</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.brand && (
                          <div className="text-xs text-gray-500">{product.brand}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{product.sku || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{product.barcode}</td>
                      <td className="px-4 py-3 text-gray-600">{product.category || "—"}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatPrice(product.selling_price)}
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge quantity={product.stock_quantity} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {products.map(product => (
                <div
                  key={product.id}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </div>
                    <div className="flex-1 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{product.name}</p>
                        {product.brand && (
                          <p className="text-xs text-gray-500">{product.brand}</p>
                        )}
                      </div>
                      <p className="whitespace-nowrap font-medium text-gray-900">
                        {formatPrice(product.selling_price)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono">{product.barcode}</span>
                    {product.category && (
                      <span className="rounded-full bg-gray-100 px-2 py-1">{product.category}</span>
                    )}
                    <StockBadge quantity={product.stock_quantity} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
