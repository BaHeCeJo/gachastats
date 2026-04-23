"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-6 px-8">
          <div className="text-6xl font-black text-red-500">!</div>
          <h1 className="text-2xl font-black uppercase tracking-widest">Something went wrong</h1>
          <p className="text-zinc-400 text-sm">An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#22c55e] text-black font-bold rounded-xl hover:bg-[#1da34a] transition"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
