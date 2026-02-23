"use client";

import { useState } from "react";
import GSIntro from "./GSIntro";
import GSBackground from "./GSBackground";
import GameGrid from "./GameGrid";
import { LocalizedString } from "@/lib/localization"; // Import LocalizedString

type Game = {
  id: string;
  name: LocalizedString; // Name is now localized
  slug: string;
  description: LocalizedString; // Description is now localized
  cover_url: string | null;
  default_lang: string; // Add default_lang
  supported_languages: string[]; // Add supported_languages
};

type Props = {
  games: Game[];
  supabaseUrl: string;
};

export default function HomeContent({ games, supabaseUrl }: Props) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <>
      <GSIntro />
      <GSBackground isHidden={isHovering} />

      <GameGrid
        games={games}
        supabaseUrl={supabaseUrl}
        onHoverChange={setIsHovering}
      />
    </>
  );
}
