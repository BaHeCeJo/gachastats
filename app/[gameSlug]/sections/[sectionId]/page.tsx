import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import EntityGridManager from "@/app/components/EntityGridManager";
import { LocalizedString, getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers, cookies } from "next/headers"; // Import cookies helper

// --- Type Definitions ---
type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

type Section = {
  id: string;
  key: LocalizedString;
  game_id: string;
  icon_path: string | null;
  color: string | null;
};

type FieldOption = {
  id: string;
  field_id: string;
  value_key: LocalizedString; // Localized
  icon_path: string | null;
  color: string | null;
  order_index: number;
};

type Field = {
  id: string;
  section_id: string;
  key: LocalizedString; // Localized
  required: boolean;
  manual_fill: boolean;
  has_icon: boolean;
  has_color: boolean;
  order_index: number;
  is_multi: boolean;
  category: string | null;
  field_options: FieldOption[] | null;
};

type EntityFieldValue = {
  id: string;
  field_id: string;
  value_text: LocalizedString | null; // Localized
  option_id: string | null;
  field_options: Pick<FieldOption, 'color' | 'icon_path' | 'value_key'> | null; // value_key also Localized here
};

type EntitySkin = {
  is_default: boolean;
  entity_images: { image_path: string | null }[];
};

type Entity = {
  id: string;
  section_id: string;
  name: LocalizedString; // Localized
  icon_path: string | null;
  entity_skins: EntitySkin[] | null;
  entity_field_values: EntityFieldValue[] | null;
};

type ProcessedEntity = Entity & {
  publicIconUrl: string;
  fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>;
  allValues: Record<string, string[]>;
};

// --- Page Component ---
type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>;
};

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const supabase = await createClient();
  
  // Get current language from cookie or header
  const headersList = await headers();
  const cookies = headersList.get('cookie') || '';
  const userLang = cookies.split('; ').find(row => row.startsWith('user_lang='))?.split('=')[1];
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const currentLang = userLang || browserLang;

  const { data: game } = await supabase.from("games").select("name, default_lang").eq("slug", gameSlug).single();
  const { data: section } = await supabase.from("game_sections").select("key").eq("id", sectionId).single();

  if (!game || !section) return { title: 'Section Not Found' };

  const gameTitle = getTranslatedField(game.name, currentLang, game.default_lang || 'en');
  const sectionTitle = getTranslatedField(section.key, currentLang, game.default_lang || 'en');

  return {
    title: `${sectionTitle} | ${gameTitle} - GachaStats`,
    openGraph: {
      title: `${sectionTitle} | ${gameTitle} - GachaStats`,
    },
  };
}

export default async function SectionDetailPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createClient();

  // 1. Fetch game details first to get the default_lang needed for sorting child queries
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url, default_lang, supported_languages")
    .eq("slug", gameSlug)
    .single<Game>();

  if (gameError || !game) {
    console.error("Game fetch error:", gameError?.message || "Game not found.");
    redirect("/");
  }

  // 2. Initiate remaining requests in parallel using game data
  const [sectionRes, fieldsRes, settingsRes, entitiesRes] = await Promise.all([
    supabase.from("game_sections").select("id, key, game_id, icon_path, color").eq("id", sectionId).single<Section>(),
    supabase.from("section_fields").select("id, key, required, manual_fill, has_icon, has_color, order_index, is_multi, category, field_options(*)").eq("section_id", sectionId).order("order_index", { ascending: true }),
    supabase.from("section_display_settings").select("*").eq("section_id", sectionId).single(),
    supabase.from("section_entities").select(`
      id, section_id, name, icon_path,
      entity_skins ( is_default, entity_images ( image_path, type ) ),
      entity_field_values ( id, field_id, value_text, option_id, field_options ( color, icon_path, value_key ) )
    `).eq("section_id", sectionId).eq("entity_skins.is_default", true).order(`name->>${game.default_lang}`, { ascending: true })
  ]);

  const { data: section, error: sectionError } = sectionRes;
  const { data: fields } = fieldsRes;
  const { data: displaySettings } = settingsRes;
  const { data: entities, error: entitiesError } = entitiesRes;

  if (sectionError || !section) {
    console.error("Section fetch error:", sectionError?.message || "Section not found.");
    redirect(`/${gameSlug}`);
  }

  if (entitiesError) {
    console.error("Entities fetch error:", entitiesError?.message);
  }

  // --- Language Detection ---
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = cookieStore.get('user_lang')?.value;
  
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  const preferredLang = userLang || browserLang;

  const currentLang = game.supported_languages.includes(preferredLang) ? preferredLang : game.default_lang;

  // Create a map of fields for easy lookup
  const fieldsMap = new Map((fields || [])?.map(f => [f.id, f]));

  // Process entities
  const processedEntities: ProcessedEntity[] = (entities || []).map((entity: any) => {
    // 1. Try to get the direct icon_path from the entity table
    // 2. Fallback to the icon from the default skin
    const defaultSkin = entity.entity_skins?.[0];
    const skinIconPath = defaultSkin?.entity_images?.find((img: any) => img.type === 'icon')?.image_path;
    const iconPath = entity.icon_path || skinIconPath;
    
    let publicIconUrl = "";

    if (iconPath) {
      if (iconPath.startsWith("http")) {
        publicIconUrl = iconPath;
      } else {
        publicIconUrl = supabase.storage.from("games").getPublicUrl(iconPath).data.publicUrl;
      }
    }

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};

    entity.entity_field_values?.forEach((val: EntityFieldValue) => {
      const field = fieldsMap.get(val.field_id);
      if (!allValues[val.field_id]) allValues[val.field_id] = [];

      if (val.option_id) {
        // If it's an option, we use the option_id for filtering
        allValues[val.field_id].push(val.option_id);
      } else {
        // For manual fill fields, we use the translated text value(s)
        const translatedValue = getTranslatedField(val.value_text, currentLang, game.default_lang);
        if (translatedValue) {
          if (field?.is_multi) {
            const parts = translatedValue.split(',').filter(Boolean).map(p => p.trim());
            allValues[val.field_id].push(...parts);
          } else {
            allValues[val.field_id].push(translatedValue);
          }
        }
      }

      const opt = val.field_options;
      if (opt) {
        fieldValuesMap[val.field_id] = {
          color: opt.color || undefined,
          iconUrl: opt.icon_path
            ? supabase.storage.from("games").getPublicUrl(opt.icon_path).data.publicUrl
            : undefined,
        };
      }
    });

    return { ...entity, publicIconUrl, fieldValuesMap, allValues };
  });

  // Prepare filter fields data for EntityGridManager
  const filterFieldIds = displaySettings?.filter_field_ids || [];
  const filterFields =
    (fields || [])
      .filter((f) => filterFieldIds.includes(f.id))
      .map((f) => ({
        id: String(f.id),
        key: f.key, // Keep as LocalizedString object
        options: (f.field_options || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((opt) => ({
            id: String(opt.id),
            value_key: opt.value_key, // Keep as LocalizedString object
            iconUrl: opt.icon_path
              ? supabase.storage.from("games").getPublicUrl(opt.icon_path).data.publicUrl
              : undefined,
            color: opt.color,
          })),
      })) || [];

  const gameCoverUrl = game.cover_url
    ? supabase.storage.from("games").getPublicUrl(game.cover_url).data.publicUrl
    : null;

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      {/* Dynamic Background Cover (Game Cover) */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale blur-md opacity-25 scale-105 transition-all duration-1000 ease-out"
          style={{ backgroundImage: gameCoverUrl ? `url(${gameCoverUrl})` : "none" }}
        />
        <div className="absolute inset-0 bg-zinc-50/60 dark:bg-black/80" />
      </div>

      <GameLocalizationProvider 
        gameDefaultLang={game.default_lang} 
        gameSupportedLanguages={game.supported_languages}
      >
        {/* GS logo as a lower layer for brand presence, hidden if game cover is present */}
        <GSBackground isHidden={!!gameCoverUrl} />
        
        <Header
          breadcrumbs={[
            { href: "/", label: getTranslation('home', currentLang) },
            { href: `/${gameSlug}`, label: getTranslatedField(game.name, currentLang, game.default_lang) },
            { href: `/${game.slug}/sections/${sectionId}`, label: getTranslatedField(section.key, currentLang, game.default_lang) },
          ]}
        />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex items-center gap-6">
              {section.icon_path ? (
                <Image
                  src={supabase.storage.from("games").getPublicUrl(section.icon_path).data.publicUrl}
                  alt={getTranslatedField(section.key, currentLang, game.default_lang)}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-contain p-2 rounded-full shadow-lg border border-zinc-300 dark:border-zinc-700"
                  style={{ backgroundColor: section.color || 'transparent' }}
                />
              ) : (
                <div
                  className="w-20 h-20 flex items-center justify-center text-zinc-400 text-3xl border border-zinc-300 dark:border-zinc-700 rounded-full"
                  style={{ backgroundColor: section.color || 'transparent' }}
                >
                  ?
                </div>
              )}
              <h1 className="text-5xl font-extrabold text-black dark:text-zinc-50 tracking-tight uppercase">
                {getTranslatedField(section.key, currentLang, game.default_lang)}
              </h1>
            </div>

            <EntityGridManager
              entities={processedEntities}
              displaySettings={displaySettings}
              filterFields={filterFields}
              gameSlug={gameSlug}
              sectionId={sectionId}
              sectionName={getTranslatedField(section.key, currentLang, game.default_lang)}
              gameDefaultLang={game.default_lang}
              currentLang={currentLang}
            />
          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}