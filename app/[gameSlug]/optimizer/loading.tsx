export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 animate-pulse" />
      <div className="max-w-7xl mx-auto px-8 py-24 space-y-8">
        <div className="h-10 w-64 bg-zinc-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
            <div className="h-12 bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
