"use client";

import { useState, useTransition, useEffect } from "react";
import { toggleCollectionEntityAction, checkEntityOwnershipAction } from "@/app/collections/actions";
import { useLocalizationParams } from "@/lib/localization";
import { Check, Plus, Loader2 } from "lucide-react";

export default function CollectionToggle({ 
  entityId, 
  initialIsOwned 
}: { 
  entityId: string; 
  initialIsOwned: boolean;
}) {
  const [isOwned, setIsOwned] = useState(initialIsOwned);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { t } = useLocalizationParams();

  // Perform client-side check on mount to handle static page hydration
  useEffect(() => {
    async function checkOwnership() {
      try {
        const result = await checkEntityOwnershipAction(entityId);
        setIsOwned(result.owned);
        setIsAuthenticated(!!result.authenticated);
      } catch (err) {
        console.error("Failed to check ownership:", err);
      } finally {
        setIsLoading(false);
      }
    }
    checkOwnership();
  }, [entityId]);

  const handleToggle = () => {
    if (!isAuthenticated) {
      alert("You must be logged in to manage your collection");
      return;
    }

    startTransition(async () => {
      const result = await toggleCollectionEntityAction(entityId, isOwned);
      if (result.success) {
        setIsOwned(!isOwned);
      } else {
        alert(result.error || "Something went wrong");
      }
    });
  };

  // Don't show the button if we are not authenticated (for public visitors)
  if (!isLoading && !isAuthenticated) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={isPending || isLoading}
      className={`
        flex items-center gap-2 px-6 py-2.5 rounded-full font-bold uppercase tracking-widest text-xs transition-all
        ${isOwned 
          ? "bg-[#22c55e] text-black hover:bg-red-500 hover:text-white group" 
          : "bg-zinc-900 text-white border border-zinc-800 hover:border-[#22c55e] hover:text-[#22c55e]"
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        min-w-[160px] justify-center
      `}
    >
      {isPending || isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isOwned ? (
        <>
          <Check className="w-4 h-4 group-hover:hidden" />
          <span className="group-hover:hidden">{t('owned')}</span>
          <span className="hidden group-hover:inline">{t('removeFromCollection')}</span>
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          <span>{t('addToCollection')}</span>
        </>
      )}
    </button>
  );
}
