"use client";

import Link from 'next/link';
import { getTranslatedField, useLocalizationParams } from "@/lib/localization";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import ConfirmButton from '@/app/components/ConfirmButton';
import { deleteGameAction } from '@/app/admin/games/actions';
import { GameLocalizationProvider } from "@/lib/localization";

type Game = {
  id: string;
  name: any;
  slug: string;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

export default function AdminGameList({ games, supabaseUrl }: { games: Game[], supabaseUrl: string }) {
  const { displayLang, currentLang } = useLocalizationParams() as any;
  const activeLang = displayLang || currentLang;

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    return `${supabaseUrl}/storage/v1/object/public/games/${path}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map(game => {
        const coverUrl = getPublicUrl(game.cover_url || "");

        return (
          <GameLocalizationProvider key={game.id} gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
            <div className="border rounded p-4 hover:bg-gray-800 transition-colors flex flex-col gap-4 bg-zinc-900/50 backdrop-blur-sm border-zinc-800">
              <Link
                href={`/admin/games/${game.slug}`}
                prefetch={false}
                className="flex items-center gap-4 flex-grow"
              >
                {coverUrl && (
                  <img
                    src={coverUrl}
                    alt={getTranslatedField(game.name, activeLang, game.default_lang)}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded shadow-lg"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lg text-white">
                    {getTranslatedField(game.name, activeLang, game.default_lang)}
                  </span>
                  <MissingTranslationIndicator value={game.name} />
                </div>
              </Link>
              
              <div className="flex justify-end border-t border-zinc-800 pt-2">
                <form action={deleteGameAction.bind(null, game.id)}>
                  <ConfirmButton>Delete</ConfirmButton>
                </form>
              </div>
            </div>
          </GameLocalizationProvider>
        );
      })}
    </div>
  );
}
