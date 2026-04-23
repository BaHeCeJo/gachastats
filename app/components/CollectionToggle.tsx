"use client";

import { useState, useTransition, useCallback } from "react";
import { toggleCollectionEntityAction } from "@/lib/actions/collection";
import { Check, Plus, Loader2 } from "lucide-react";
import { useLocalizationParams } from "@/lib/localization";
import { toast } from "sonner";

interface CollectionToggleProps {
  entityId: string;
  initialIsOwned: boolean;
}

export default function CollectionToggle({
  entityId,
  initialIsOwned,
}: CollectionToggleProps) {
  const { t } = useLocalizationParams();
  const [isOwned, setIsOwned] = useState(initialIsOwned);
  const [isPending, startTransition] = useTransition();

  const handleToggle = useCallback(async () => {
    startTransition(async () => {
      // Toggle logic: if isOwned is true, we are removing.
      const result = await toggleCollectionEntityAction(entityId, isOwned);
      if (result.success) {
        setIsOwned(!isOwned);
      } else {
        toast.error(result.error || "Failed to update collection");
      }
    });
  }, [entityId, isOwned]);

  const renderIcon = () => {
    if (isPending) return <Loader2 className="w-4 h-4 animate-spin" />;
    return isOwned ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />;
  };

  const renderText = () => {
    if (isOwned) return t('removeFromCollection');
    return t('addToCollection');
  };

  const buttonBaseClass = "flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all duration-300";
  const buttonStateClass = isOwned 
    ? "bg-[#22c55e] text-black hover:bg-red-500 hover:text-white" 
    : "bg-zinc-800 text-zinc-400 hover:bg-[#22c55e] hover:text-black";

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`${buttonBaseClass} ${buttonStateClass} disabled:opacity-50`}
    >
      {renderIcon()}
      <span className={isOwned ? "hidden group-hover:inline" : ""}>
        {renderText()}
      </span>
    </button>
  );
}
