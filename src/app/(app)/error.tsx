"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <p className="heading text-xl mb-2">Something broke on this page</p>
      <p className="text-sm text-ic-red bg-ic-red/[0.08] border border-ic-red/20 rounded-xl px-4 py-3 max-w-lg break-words">
        {error.message || "Unknown error"}
        {error.digest ? ` · digest: ${error.digest}` : ""}
      </p>
      <button
        onClick={reset}
        className="mt-5 h-9 px-5 rounded-full text-sm font-medium bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
