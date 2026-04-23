'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GameError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <span className="text-2xl">⚠</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-widest text-white">Failed to load</h2>
          <p className="text-zinc-500 text-sm">{error.message || 'Could not load this page.'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={reset} className="flex-1 py-3 bg-[#22c55e] text-black font-black uppercase tracking-widest text-sm rounded-xl hover:bg-[#1da34a] transition">Try again</button>
          <Link href="/" className="flex-1 py-3 bg-zinc-800 text-white font-black uppercase tracking-widest text-sm rounded-xl hover:bg-zinc-700 transition text-center">Go home</Link>
        </div>
      </div>
    </div>
  );
}
