import Link from "next/link";

export default function ManualProductPage() {
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

        <form className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Product Name
              <input
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Premium Coffee Beans"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Barcode
              <input
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. 1234567890"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Brand
              <input
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="Brand name"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Category
              <input
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="Groceries, Home, etc."
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Description
            <textarea
              className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
              rows={4}
              placeholder="Describe the product..."
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Selling Price
              <input
                type="number"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="0.00"
              />
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Stock Quantity
              <input
                type="number"
                className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                placeholder="0"
              />
            </label>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 px-4 py-3 font-medium text-white hover:bg-black transition-colors"
          >
            Save Product
          </button>
        </form>
      </div>
    </div>
  );
}
