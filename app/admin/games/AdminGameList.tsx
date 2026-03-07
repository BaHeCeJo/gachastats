"use client";

import Link from 'next/link';
import Image from 'next/image';
import { getTranslatedField, useLocalizationParams } from "@/lib/localization";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import ConfirmButton from '@/app/components/ConfirmButton';
import { deleteGameAction } from '@/app/admin/games/actions';
import { GameLocalizationProvider } from "@/lib/localization";
import { getPublicUrl } from "@/lib/supabase/client";
import { Game } from '@/lib/supabase/queries';

export default function AdminGameList({ games }: { games: Game[], supabaseUrl: string }) {
  const { displayLang, currentLang, t } = useLocalizationParams();
  const activeLang = displayLang || currentLang;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map(game => {
        const coverUrl = getPublicUrl('games', game.cover_url);

        return (
          <GameLocalizationProvider key={game.id} gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
            <div className="border rounded p-4 hover:bg-zinc-800 transition-colors flex flex-col gap-4 bg-zinc-900/50 backdrop-blur-sm border-zinc-800">
              <Link
                href={`/admin/games/${game.slug}`}
                prefetch={false}
                className="flex items-center gap-4 flex-grow"
              >
                {coverUrl ? (
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={coverUrl}
                      alt={getTranslatedField(game.name, activeLang, game.default_lang)}
                      fill
                      sizes="64px"
                      className="object-cover rounded shadow-lg"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center text-zinc-600 text-xs font-black">NO COVER</div>
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
                  <ConfirmButton>{t('delete')}</ConfirmButton>
                </form>
              </div>
            </div>
          </GameLocalizationProvider>
        );
      })}
    </div>
  );
}
