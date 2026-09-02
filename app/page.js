import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Admin</h1>
        <p className="mt-2 text-gray-600">
          Ready to manage product lookup and new inventory entries.
        </p>

        <Link
          href="/products/new"
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Add New Product
        </Link>
      </div>
    </main>
  );
}
