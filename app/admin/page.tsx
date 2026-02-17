import Link from 'next/link'

export default function AdminPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-4 hover:bg-gray-800">
          <Link href="/admin/games" className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Manage Games</h2>
            <p className="text-sm text-gray-400">
              Create, edit, and manage all games and their content.
            </p>
          </Link>
        </div>
        {/* Other admin sections can be added here in the future */}
      </div>
    </main>
  )
}
