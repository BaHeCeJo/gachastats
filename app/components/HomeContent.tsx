"use client";

import { useState } from "react";
import GSIntro from "./GSIntro";
import GSBackground from "./GSBackground";
import GameGrid from "./GameGrid";
import { LocalizedString } from "@/lib/localization";

type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  description: LocalizedString;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

type Props = {
  games: Game[];
  supabaseUrl: string;
};

export default function HomeContent({ games, supabaseUrl }: Props) {
  const [isHovering, setIsHovering] = useState(false);

  // GSIntro is fixed/full-screen and covers the grid visually while it plays.
  // Rendering the grid at full opacity from the start lets the browser measure LCP
  // immediately instead of waiting for the intro to finish.
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
