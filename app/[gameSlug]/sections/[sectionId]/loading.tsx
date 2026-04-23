export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 animate-pulse" />
      <div className="max-w-7xl mx-auto px-8 py-24 space-y-12">
        <div className="h-10 w-48 bg-zinc-800 rounded-xl animate-pulse" />
        <div className="flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-zinc-900 border border-zinc-800 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="aspect-square bg-zinc-900 border border-zinc-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
