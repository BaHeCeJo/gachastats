import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers, cookies } from "next/headers";
import OptimizerClient from "./OptimizerClient";
import type { OwnedEntity, Enemy, LocalizedString } from "./types";

type PageProps = {
  params: Promise<{ gameSlug: string }>;
};

export default async function OptimizerPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug } = params;
  
  const supabase = await createClient();

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/signin");
  }

  // Fetch game details
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url, default_lang, supported_languages")
    .eq("slug", gameSlug)
    .single();

  if (gameError || !game) {
    redirect("/profile");
  }

  // Fetch collectible sections (Characters, Lightcones, etc.)
  const { data: sections } = await supabase
    .from("game_sections")
    .select("id, key, icon_path, color")
    .eq("game_id", game.id);

  // Fetch ALL section_stats for this game to resolve stat names and scalability
  const { data: sectionStats } = await supabase
    .from("section_stats")
    .select("id, key, name, is_scalable, section_id")
    .eq("game_id", game.id);

  const characterSection = sections?.find(s => {
    const enName = (s.key as LocalizedString).en?.toLowerCase() || "";
    return enName === "characters" || enName === "character" || enName === "agents" || enName === "agent" || s.id === "b4a3d27a-09c1-44b5-8507-c6a4eb0b0b6b";
  });
  const enemySection = sections?.find(s => {
    const enName = (s.key as LocalizedString).en?.toLowerCase() || "";
    return enName === "enemies" || enName === "enemy" || s.id === "cf6e5077-c2c5-44dd-9bc4-66563a954350";
  });
  const lightconeSection = sections?.find(s => {
    const enName = (s.key as LocalizedString).en?.toLowerCase() || "";
    return enName === "lightcones" || enName === "lightcone" || enName === "light cones" || enName === "light cone" || enName === "w-engines" || enName === "w-engine" || s.id === "134f597a-976e-4404-b38a-e95e86d06121";
  });
  let ownedCharacters: OwnedEntity[] = [];
  if (characterSection) {
    const { data: collection } = await supabase
      .from("user_entities")
      .select(`
        id,
        entity_id,
        level,
        phase_index,
        dupes,
        section_entities!inner (
          id,
          name,
          icon_path,
          section_id,
          entity_field_values (
            game_field_id,
            option_id,
            value_text
          ),
          entity_stats (
            id,
            level,
            phase_index,
            stat_id,
            value,
            section_stats:stat_id (
              id,
              key,
              name,
              is_scalable
            )
          ),
          entity_abilities (
            id,
            name,
            entity_ability_scaling (
              level,
              value,
              value_type,
              scaling_stat_id,
              attribute_index
            )
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("section_entities.section_id", characterSection.id);
    
    ownedCharacters = collection || [];
  }

  let ownedLightcones: OwnedEntity[] = [];
  if (lightconeSection) {
    const { data: collection } = await supabase
      .from("user_entities")
      .select(`
        id,
        entity_id,
        level,
        phase_index,
        dupes,
        section_entities!inner (
          id,
          name,
          icon_path,
          section_id,
          entity_field_values (
            game_field_id,
            option_id,
            value_text
          ),
          entity_stats (
            id,
            level,
            phase_index,
            stat_id,
            value,
            section_stats:stat_id (
              id,
              key,
              name,
              is_scalable
            )
          ),
          entity_abilities (
            id,
            name,
            entity_ability_scaling (
              level,
              value,
              value_type,
              scaling_stat_id,
              attribute_index
            )
          )
        )
      `)
      .eq("user_id", user.id)
      .eq("section_entities.section_id", lightconeSection.id);
    
    ownedLightcones = collection || [];
  }

  let enemies: Enemy[] = [];
  if (enemySection) {
    const { data: enemiesData } = await supabase
      .from("section_entities")
      .select(`
        id,
        name,
        icon_path,
        entity_field_values (
          game_field_id,
          option_id,
          value_text
        ),
        entity_stats (
          id,
          level,
          phase_index,
          stat_id,
          value,
          section_stats:stat_id (
            id,
            key,
            name,
            is_scalable
          )
        )
      `)
      .eq("section_id", enemySection.id);
    
    enemies = enemiesData || [];
  }

  // Fetch field options to resolve element names if needed
  const { data: fieldOptions } = await supabase
    .from("field_options")
    .select("id, value_key, game_field_id");

  const coverUrl = game.cover_url
    ? supabase.storage.from("games").getPublicUrl(game.cover_url).data.publicUrl
    : null;

  // Language detection
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = (await cookieStore).get('user_lang')?.value;
  const acceptLanguage = (await headersList).get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const preferredLang = userLang || browserLang;
  const currentLang = game.supported_languages.includes(preferredLang) ? preferredLang : game.default_lang;

  return (
    <div className="relative flex flex-col min-h-screen bg-black font-sans text-white overflow-x-hidden">
      <GSBackground isHidden={!!coverUrl} />
      
      <GameLocalizationProvider 
        gameDefaultLang={game.default_lang} 
        gameSupportedLanguages={game.supported_languages}
      >
        <Header breadcrumbs={[
          { href: "/profile", label: getTranslation('profile', currentLang) },
          { href: `/profile/${gameSlug}`, label: getTranslatedField(game.name, currentLang, game.default_lang) },
          { href: `/${gameSlug}/optimizer`, label: "Optimizer" }
        ]} />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-6xl font-black italic uppercase tracking-tighter text-[#22c55e] mb-12">
              Damage Simulator
            </h1>
            
            <OptimizerClient 
              ownedCharacters={ownedCharacters}
              ownedLightcones={ownedLightcones}
              enemies={enemies}
              fieldOptions={fieldOptions || []}
              sectionStats={sectionStats || []}
              enemySectionStats={[]} // No longer needed as we fetch all game stats
              gameDefaultLang={game.default_lang}
              currentLang={currentLang}
            />
          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}
