"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Plus, Gamepad2, X } from "lucide-react";
import { getPublicUrl } from "@/lib/supabase/storage-utils";
import { toggleUserGameAction } from "@/lib/actions/collection";
import { toast } from "sonner";
import { getTranslatedField, useLocalizationParams } from "@/lib/localization";

type Game = {
  id: string;
  name: Record<string, string>;
  cover_url: string | null;
  slug: string;
  default_lang: string;
};

type Props = {
  allGames: Game[];
  userGameIds: string[];
  currentLang: string;
};

export default function GameCollectionManager({
  allGames,
  userGameIds,
  currentLang,
}: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { t } = useLocalizationParams();

  const playedGames = allGames.filter(g => userGameIds.includes(g.id));
  const availableGames = allGames.filter(g => !userGameIds.includes(g.id));

  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  const handleToggle = (gameId: string, isPlaying: boolean) => {
    if (isPlaying && confirmingRemoveId !== gameId) {
      setConfirmingRemoveId(gameId);
      return;
    }
    setConfirmingRemoveId(null);
    startTransition(async () => {
      const result = await toggleUserGameAction(gameId, isPlaying);
      if (!result.success) {
        toast.error(result.error);
      }
      if (!isPlaying) setShowPicker(false);
    });
  };

  return (
    <div className="space-y-12">
      {/* Grid of Games Played */}
      <div className="flex flex-wrap justify-center gap-12">
        {playedGames.map((game) => (
          <div key={game.id} className="relative group">
            <a
              href={`/${game.slug}`}
              className="block relative w-48 h-48 rounded-[3rem] overflow-hidden border-4 border-zinc-800 bg-zinc-900 group-hover:border-[#22c55e] group-hover:scale-105 group-hover:rotate-1 transition-all duration-700 shadow-2xl active:scale-95"
            >
              {game.cover_url ? (
                <div className="relative w-full h-full">
                  <Image 
                    src={getPublicUrl('games', game.cover_url)!} 
                    alt={getTranslatedField(game.name, currentLang, game.default_lang || 'en')} 
                    fill
                    sizes="192px"
                    className="object-cover group-hover:scale-110 transition-transform duration-700" 
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-800">
                  <Gamepad2 size={64} />
                </div>
              )}
              {/* Overlay Label */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent pt-12 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                <p className="text-[10px] font-black text-center text-white uppercase tracking-[0.2em] truncate">
                  {getTranslatedField(game.name, currentLang, game.default_lang || 'en')}
                </p>
              </div>
            </a>
            
            {/* Remove Cross / Confirm */}
            {confirmingRemoveId === game.id ? (
              <div className="absolute -top-6 -right-6 flex flex-col items-center gap-1 z-10">
                <button
                  onClick={() => handleToggle(game.id, true)}
                  disabled={isPending}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-500 transition shadow-2xl"
                >
                  {t('confirm') || 'Remove'}
                </button>
                <button
                  onClick={() => setConfirmingRemoveId(null)}
                  className="px-3 py-1.5 bg-zinc-700 text-zinc-300 text-xs rounded-xl hover:bg-zinc-600 transition shadow-xl"
                >
                  {t('cancel') || 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleToggle(game.id, true)}
                disabled={isPending}
                aria-label={`Remove ${getTranslatedField(game.name, currentLang, game.default_lang || 'en')} from collection`}
                className="absolute -top-4 -right-4 p-3 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-red-500 hover:scale-110 active:scale-95"
              >
                <X size={20} strokeWidth={4} />
              </button>
            )}
          </div>
        ))}

        {/* Add New Game Trigger */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          disabled={isPending}
          className={`
            w-48 h-48 rounded-[3rem] border-4 border-dashed transition-all duration-500 flex items-center justify-center
            ${showPicker ? 'bg-[#22c55e] border-[#22c55e] text-black scale-105' : 'bg-zinc-900/40 border-zinc-800 text-zinc-700 hover:border-zinc-500 hover:text-zinc-500'}
          `}
        >
          {isPending ? (
            <Loader2 className="w-16 h-16 animate-spin" />
          ) : (
            <Plus className={`w-16 h-16 transition-transform duration-500 ${showPicker ? 'rotate-45' : ''}`} />
          )}
        </button>
      </div>

      {/* Picker UI */}
      {showPicker && (
        <div className="animate-in fade-in zoom-in-95 duration-500 p-12 bg-black/40 backdrop-blur-3xl border border-zinc-800 rounded-[4rem] space-y-8 shadow-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 text-center">
            {t('addGames')}
          </p>
          
          {availableGames.length === 0 ? (
            <p className="text-zinc-600 text-sm italic text-center uppercase tracking-widest font-bold">
              {t('noMoreGames')}
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {availableGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleToggle(game.id, false)}
                  disabled={isPending}
                  className="relative group w-32 h-32 rounded-3xl overflow-hidden border-4 border-zinc-800 bg-zinc-900 hover:border-[#22c55e] transition-all duration-500 shadow-xl hover:scale-110 active:scale-90"
                  title={getTranslatedField(game.name, currentLang, game.default_lang || 'en')}
                >
                  {game.cover_url ? (
                    <div className="relative w-full h-full">
                      <Image 
                        src={getPublicUrl('games', game.cover_url)!} 
                        alt="" 
                        fill
                        sizes="128px"
                        className="object-cover group-hover:scale-110 transition-transform duration-500" 
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-800">
                      <Gamepad2 size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="text-white w-10 h-10" strokeWidth={3} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
