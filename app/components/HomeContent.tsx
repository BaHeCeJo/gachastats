"use client";

import { useState } from "react";
import GSIntro from "./GSIntro";
import GSBackground from "./GSBackground";
import GameGrid from "./GameGrid";

type Game = {
  id: string;
  name: string;
  slug: string;
  cover_url: string | null;
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
