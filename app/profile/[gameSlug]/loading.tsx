export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 animate-pulse" />
      <div className="max-w-7xl mx-auto px-8 py-24 space-y-16">
        <div className="flex items-center gap-10">
          <div className="w-48 h-48 rounded-[2rem] bg-zinc-800 animate-pulse" />
          <div className="space-y-4">
            <div className="h-14 w-72 bg-zinc-800 rounded-xl animate-pulse" />
            <div className="h-4 w-32 bg-zinc-900 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-8 w-40 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
