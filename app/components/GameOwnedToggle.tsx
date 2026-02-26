"use client";

import { useState, useTransition } from "react";
import { toggleUserGameAction } from "@/app/collections/actions";
import { useLocalizationParams } from "@/lib/localization";
import { X, Loader2 } from "lucide-react";

export default function GameOwnedToggle({ 
  gameId, 
  gameName,
  isPlaying 
}: { 
  gameId: string; 
  gameName: string;
  isPlaying: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const { t } = useLocalizationParams() as any;

  const handleToggle = () => {
    if (isPlaying) {
      if (!confirm(`${t('deleteConfirm')} ${gameName}?`)) return;
    }

    startTransition(async () => {
      const result = await toggleUserGameAction(gameId, isPlaying);
      if (!result.success) {
        alert(result.error || "Something went wrong");
      }
    });
  };

  if (!isPlaying) {
    // This could be a "Add Game" button elsewhere, 
    // but for now we focus on the "Remove" cross for the profile list
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="p-2 rounded-full bg-zinc-800 text-zinc-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 group"
      title={t('delete')}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <X className="w-4 h-4" />
      )}
    </button>
  );
}
