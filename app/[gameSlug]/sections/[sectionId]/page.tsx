import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import EntityGridManager from "@/app/components/EntityGridManager";
import { LocalizedString, getTranslatedField } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers"; // Import headers for server components

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

export default async function SectionDetailPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createClient();

  // Fetch game details (including language settings)
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url, default_lang, supported_languages")
    .eq("slug", gameSlug)
    .single<Game>();

  if (gameError || !game) {
    console.error("Game fetch error:", gameError?.message || "Game not found.");
    redirect("/");
  }

  // Fetch section details
  const { data: section, error: sectionError } = await supabase
    .from("game_sections")
    .select("id, key, game_id, icon_path, color") // Select specific columns for section
    .eq("id", sectionId)
    .eq("game_id", game.id)
    .single<Section>();

  if (sectionError || !section) {
    console.error("Section fetch error:", sectionError?.message || "Section not found.");
    redirect(`/${gameSlug}`);
  }

  // Fetch fields with options for filtering
  const { data: fields, error: fieldsError } = await supabase
    .from("section_fields")
    .select("*, field_options(*)")
    .eq("section_id", sectionId)
    .order("order_index", { ascending: true });

  if (fieldsError) {
    console.error("Fields fetch error:", fieldsError?.message);
  }

  // Fetch display settings for the section
  const { data: displaySettings, error: displaySettingsError } = await supabase
    .from("section_display_settings")
    .select("*")
    .eq("section_id", sectionId)
    .single();

  if (displaySettingsError) {
    console.error("Display settings fetch error:", displaySettingsError?.message);
  }

  // Fetch entities with their default skin and a single image for the icon, ordered alphabetically
  const { data: entities, error: entitiesError } = await supabase
    .from("section_entities")
    .select(
      `
      id,
      section_id,
      name,
      icon_path,
      entity_skins (
        is_default,
        entity_images (
          image_path
        )
      ),
      entity_field_values (
        id,
        field_id,
        value_text,
        option_id,
        field_options (
          color,
          icon_path,
          value_key
        )
      )
    `
    )
    .eq("section_id", sectionId)
    .eq("entity_skins.is_default", true)
    .order(`name->>${game.default_lang}`, { ascending: true }) // Order by localized name
    .limit(1, { foreignTable: "entity_skins.entity_images" });

  if (entitiesError) {
    console.error("Entities fetch error:", entitiesError?.message);
  }

  // For server components, we'll get currentLang from headers
  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  // Create a map of fields for easy lookup
  const fieldsMap = new Map((fields || [])?.map(f => [f.id, f]));

  // Process entities
  const processedEntities: ProcessedEntity[] = (entities || []).map((entity: Entity) => {
    const skin = entity.entity_skins?.[0];
    const iconPath = skin?.entity_images?.[0]?.image_path;
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

      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        {/* GS logo as a lower layer for brand presence, hidden if game cover is present */}
        <GSBackground isHidden={!!gameCoverUrl} />
        <Header
          breadcrumbs={[
            { href: "/", label: "Home" },
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