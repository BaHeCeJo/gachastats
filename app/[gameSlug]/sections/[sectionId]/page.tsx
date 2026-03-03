import { createPublicClient } from "@/lib/supabase/server";
import { getGameBySlug, getSectionById, getPublicUrl, getSectionFields, getSectionDisplaySettings, getSectionEntities } from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import EntityGridManager from "@/app/components/EntityGridManager";
import { LocalizedString, getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";

// Enable ISR
export const revalidate = 3600;

/**
 * Pre-generate static paths for sections.
 */
export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data: sections } = await supabase.from('game_sections').select('id, games(slug)').returns<any[]>();
  
  return (sections || []).map((s) => ({
    gameSlug: s.games?.slug,
    sectionId: s.id,
  }));
}

// --- Type Definitions ---
export type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  cover_url: string | null;
  default_lang: string;
  supported_languages: string[];
};

export type Section = {
  id: string;
  key: LocalizedString;
  game_id: string;
  icon_path: string | null;
  color: string | null;
};

type FieldOption = {
  id: string;
  field_id: string;
  value_key: LocalizedString;
  icon_path: string | null;
  color: string | null;
  order_index: number;
};

type Field = {
  id: string;
  section_id: string;
  key: LocalizedString;
  required: boolean;
  manual_fill: boolean;
  has_icon: boolean;
  has_color: boolean;
  order_index: number;
  is_multi: boolean;
  category: string | null;
  field_options: FieldOption[] | null;
  game_field_id: string;
};

type EntityFieldValue = {
  id: string;
  game_field_id: string;
  value_text: LocalizedString | null;
  option_id: string | null;
  field_options: Pick<FieldOption, 'color' | 'icon_path' | 'value_key'> | null;
};

type EntitySkin = {
  is_default: boolean;
  entity_images: { image_path: string | null; type: string }[];
};

type Entity = {
  id: string;
  section_id: string;
  name: LocalizedString;
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
  
  const [gameRes, sectionRes] = await Promise.all([
    getGameBySlug(gameSlug),
    getSectionById(sectionId)
  ]);

  const game = gameRes.data;
  const section = sectionRes.data;

  if (!game || !section) return { title: 'Section Not Found' };

  // Use default lang for static generation
  const currentLang = game.default_lang || 'en';
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

  // 1. Fetch game (cached)
  const { data: game, error: gameError } = await getGameBySlug(gameSlug);

  if (gameError || !game) {
    redirect("/");
  }

  // 2. Fetch everything else in parallel (all cached)
  const [sectionRes, fieldsRes, settingsRes, entitiesRes] = await Promise.all([
    getSectionById(sectionId),
    getSectionFields(sectionId),
    getSectionDisplaySettings(sectionId),
    getSectionEntities(sectionId, game.default_lang)
  ]);

  const { data: section, error: sectionError } = sectionRes;
  const { data: fieldsRaw } = fieldsRes;
  const { data: displaySettings } = settingsRes;
  const { data: entities, error: entitiesError } = entitiesRes;

  if (sectionError || !section) {
    redirect(`/${gameSlug}`);
  }

  // Static fallback language
  const currentLang = game.default_lang;

  const fields = (fieldsRaw || []).map((f: any) => {
    const gf = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return {
      ...f,
      manual_fill: gf?.manual_fill,
      has_icon: gf?.has_icon,
      has_color: gf?.has_color,
      field_options: gf?.field_options || []
    };
  });

  const gameFieldsMap = new Map((fields || [])?.map(f => [f.game_field_id, f]));

  const processedEntities: ProcessedEntity[] = (entities || []).map((entity: any) => {
    const defaultSkin = entity.entity_skins?.[0];
    const skinIconPath = defaultSkin?.entity_images?.find((img: any) => img.type === 'icon')?.image_path;
    const iconPath = entity.icon_path || skinIconPath;
    
    const publicIconUrl = getPublicUrl('games', iconPath) || "";

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};

    entity.entity_field_values?.forEach((val: any) => {
      const field = gameFieldsMap.get(val.game_field_id);
      if (!field) return;
      const fieldId = field.id;

      if (!allValues[fieldId]) allValues[fieldId] = [];

      if (val.option_id) {
        allValues[fieldId].push(val.option_id);
      } else {
        const translatedValue = getTranslatedField(val.value_text, currentLang, game.default_lang);
        if (translatedValue) {
          if (field?.is_multi) {
            const parts = translatedValue.split(',').filter(Boolean).map((p: string) => p.trim());
            allValues[fieldId].push(...parts);
          } else {
            allValues[fieldId].push(translatedValue);
          }
        }
      }

      const opt = val.field_options;
      if (opt) {
        fieldValuesMap[fieldId] = {
          color: opt.color || undefined,
          iconUrl: getPublicUrl('games', opt.icon_path) || undefined,
        };
      }
    });

    return { ...entity, publicIconUrl, fieldValuesMap, allValues } as ProcessedEntity;
  });

  const filterFieldIds = displaySettings?.filter_field_ids || [];
  const filterFields =
    (fields || [])
      .filter((f) => filterFieldIds.includes(f.id))
      .map((f) => ({
        id: String(f.id),
        key: f.key,
        options: (f.field_options || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((opt: any) => ({
            id: String(opt.id),
            value_key: opt.value_key,
            iconUrl: getPublicUrl('games', opt.icon_path) || undefined,
            color: opt.color,
          })),
      })) || [];

  const gameCoverUrl = getPublicUrl('games', game.cover_url);

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
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
                  src={getPublicUrl('games', section.icon_path)!}
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
