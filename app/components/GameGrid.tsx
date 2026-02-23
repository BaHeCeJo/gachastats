"use client";

import { useState } from "react";
import Link from "next/link";
import { LocalizedString, getTranslatedField, useLocalizationParams } from "@/lib/localization";

type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString; // Add description
  cover_url: string | null;
  default_lang: string; // Add default_lang
  supported_languages: string[]; // Add supported_languages
};

type Props = {
  games: Game[];
  supabaseUrl: string;
  onHoverChange?: (isHovering: boolean) => void;
};

export default function GameGrid({ games, supabaseUrl, onHoverChange }: Props) {
  const [hoveredCover, setHoveredCover] = useState<string | null>(null);
  const { currentLang } = useLocalizationParams(); // Get current language

  const handleHover = (url: string | null) => {
    setHoveredCover(url);
    onHoverChange?.(!!url);
  };

  return (
    <>
      {/* Dynamic Background Layer - Placed above page background but below content */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        <div
          className={`absolute inset-0 bg-cover bg-center grayscale transition-all duration-[1500ms] ease-in-out transform ${
            hoveredCover ? "opacity-20 scale-100" : "opacity-0 scale-105"
          }`}
          style={{ backgroundImage: hoveredCover ? `url(${hoveredCover})` : 'none' }}
        />
      </div>

      <main className="flex-1 px-8 py-24 z-10 relative">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-5xl font-extrabold text-center mb-16 text-black dark:text-zinc-50 tracking-tight">
            Explore <span className="text-[#22c55e]">Games</span>
          </h1>

          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            {games.map((game) => {
              const coverUrl = game.cover_url
                ? `${supabaseUrl}/storage/v1/object/public/games/${game.cover_url}`
                : null;

              return (
                <li
                  key={game.id}
                  className="group flex flex-col"
                  onMouseEnter={() => coverUrl && handleHover(coverUrl)}
                  onMouseLeave={() => handleHover(null)}
                >
                  <Link href={`/${game.slug}`} className="block">
                    {/* Game Cover Card */}
                    <div className="relative aspect-[3/4] w-full border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md overflow-hidden shadow-sm group-hover:shadow-2xl group-hover:shadow-[#22c55e]/20 group-hover:-translate-y-2 transition-all duration-500 group-hover:border-[#22c55e]/50">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={getTranslatedField(game.name, currentLang, game.default_lang)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                          No Cover
                        </div>
                      )}

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Game Name Under the Card */}
                    <div className="mt-4 text-center">
                      <h3 className="font-bold text-xl text-black dark:text-zinc-50 group-hover:text-[#22c55e] transition-colors uppercase tracking-wide">
                        {getTranslatedField(game.name, currentLang, game.default_lang)}
                      </h3>
                      <div className="h-1 w-0 group-hover:w-12 bg-[#22c55e] mx-auto mt-1 transition-all duration-500 rounded-full" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {games.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl backdrop-blur-sm">
              <p className="text-zinc-500">No games have been added to the archives yet.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
