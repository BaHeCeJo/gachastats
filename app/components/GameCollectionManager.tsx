"use client";

import { useState, useTransition } from "react";
import { toggleUserGameAction } from "@/app/collections/actions";
import { useLocalizationParams, getTranslatedField } from "@/lib/localization";
import { Plus, X, Loader2, Gamepad2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Game = {
  id: string;
  name: any;
  slug: string;
  cover_url: string | null;
};

export default function GameCollectionManager({ 
  allGames, 
  userGameIds,
  currentLang
}: { 
  allGames: Game[]; 
  userGameIds: string[];
  currentLang: string;
}) {
  const supabase = createClient();
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { t } = useLocalizationParams() as any;

  const playedGames = allGames.filter(g => userGameIds.includes(g.id));
  const availableGames = allGames.filter(g => !userGameIds.includes(g.id));

  const handleToggle = (gameId: string, isPlaying: boolean, gameName: string) => {
    if (isPlaying) {
      if (!confirm(`${t('deleteConfirmGame')} (${gameName})`)) return;
    }

    startTransition(async () => {
      const result = await toggleUserGameAction(gameId, isPlaying);
      if (!result.success) {
        alert(result.error);
      }
      if (!isPlaying) setShowPicker(false);
    });
  };

  const getPublicUrl = (path: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("games").getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap gap-10 items-center justify-center lg:justify-start">
        {/* Played Games Icons */}
        {playedGames.map((game) => (
          <div key={game.id} className="relative group">
            <Link 
              href={`/profile/${game.slug}`}
              className="block w-56 h-56 rounded-[3rem] overflow-hidden border-[6px] border-zinc-800 bg-zinc-900 hover:border-[#22c55e] transition-all duration-500 shadow-2xl hover:shadow-[#22c55e]/20"
            >
              {game.cover_url ? (
                <img 
                  src={getPublicUrl(game.cover_url)} 
                  alt="" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <Gamepad2 size={80} />
                </div>
              )}
            </Link>
            
            {/* Remove Cross */}
            <button
              onClick={() => handleToggle(game.id, true, getTranslatedField(game.name, currentLang, 'en'))}
              disabled={isPending}
              className="absolute -top-4 -right-4 p-3 bg-red-600 text-white rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-red-500 hover:scale-110 active:scale-95"
            >
              <X size={20} strokeWidth={4} />
            </button>
          </div>
        ))}

        {/* Plus Button */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={`w-56 h-56 rounded-[3rem] border-[6px] border-dashed flex items-center justify-center transition-all duration-500 ${
            showPicker 
            ? "border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e] scale-95" 
            : "border-zinc-800 text-zinc-700 hover:border-zinc-600 hover:text-zinc-500 hover:scale-105"
          }`}
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
                  onClick={() => handleToggle(game.id, false, getTranslatedField(game.name, currentLang, 'en'))}
                  disabled={isPending}
                  className="relative group w-32 h-32 rounded-3xl overflow-hidden border-4 border-zinc-800 bg-zinc-900 hover:border-[#22c55e] transition-all duration-500 shadow-xl hover:scale-110 active:scale-90"
                  title={getTranslatedField(game.name, currentLang, 'en')}
                >
                  {game.cover_url ? (
                    <img 
                      src={getPublicUrl(game.cover_url)} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
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
