export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 animate-pulse" />
      <div className="max-w-3xl mx-auto px-8 py-16 space-y-10">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-8 w-20 bg-zinc-900 rounded-lg animate-pulse" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
              <div className="h-12 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
            </div>
          ))}
          <div className="h-12 bg-zinc-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          <div className="h-32 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
