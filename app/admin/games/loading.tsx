export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 animate-pulse" />
      <div className="max-w-5xl mx-auto px-8 py-16 space-y-8">
        <div className="flex justify-between items-center">
          <div className="h-8 w-32 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-10 w-28 bg-zinc-800 rounded-xl animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
