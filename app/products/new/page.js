import Link from "next/link";

export default function AddProductEntryPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center pt-20">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <Link
            href="/products"
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            ← Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-500 text-sm mt-2">
            Choose how you want to add this item to your inventory.
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/products/new/scan"
            className="block w-full border-2 border-blue-500 rounded-lg p-4 hover:bg-blue-50 transition-colors flex items-center gap-4 group"
          >
            <div className="bg-blue-100 p-3 rounded-full text-blue-600 group-hover:bg-blue-200 transition-colors">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                Scan Barcode
              </h3>
              <p className="text-sm text-gray-500">
                Fastest way to auto-fill details
              </p>
            </div>
          </Link>

          <Link
            href="/products/new/manual"
            className="block w-full border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex items-center gap-4 group"
          >
            <div className="bg-gray-100 p-3 rounded-full text-gray-600 group-hover:bg-gray-200 transition-colors">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">
                Enter Manually
              </h3>
              <p className="text-sm text-gray-500">
                Start with a blank product form
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
