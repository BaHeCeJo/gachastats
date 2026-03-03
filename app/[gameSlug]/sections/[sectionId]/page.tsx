import { createPublicClient } from "@/lib/supabase/server";
import { 
  getGameBySlug, 
  getSectionById, 
  getSectionFields, 
  getSectionDisplaySettings, 
  getSectionEntities,
  Game,
  Section,
  SectionField,
  SectionEntity,
  SectionDisplaySettings,
} from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import EntityGridManager from "@/app/components/EntityGridManager";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { getPublicUrl } from "@/lib/supabase/client";

// Enable ISR
export const revalidate = 3600;

interface StaticParamsSection {
  id: string;
  games: {
    slug: string;
  } | null;
}

/**
 * Pre-generate static paths for sections.
 */
export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data: sections } = await supabase.from('game_sections').select('id, games(slug)') as { data: StaticParamsSection[] | null };
  
  return (sections || []).map((s) => ({
    gameSlug: s.games?.slug,
    sectionId: s.id,
  }));
}

export type ProcessedEntity = {
  id: string;
  section_id: string;
  name: Record<string, string>;
  icon_path: string | null;
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

  const game = gameRes.data as Game | null;
  const section = sectionRes.data as Section | null;

  if (!game || !section) return { title: 'Section Not Found' };

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
  const { gameSlug, sectionId } = await paramsPromise;

  // 1. Fetch game (cached)
  const { data: gameRaw, error: gameError } = await getGameBySlug(gameSlug);
  const game = gameRaw as Game | null;

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

  const section = sectionRes.data as Section | null;
  const fieldsRaw = fieldsRes.data as unknown as SectionField[];
  const displaySettings = settingsRes.data as SectionDisplaySettings | null;
  const entities = entitiesRes.data as unknown as SectionEntity[];

  if (!section) {
    redirect(`/${gameSlug}`);
  }

  const currentLang = game.default_lang;

  const fields = (fieldsRaw || []).map((f) => {
    return {
      ...f,
      manual_fill: f.game_fields?.manual_fill,
      has_icon: f.game_fields?.has_icon,
      has_color: f.game_fields?.has_color,
      field_options: f.game_fields?.field_options || []
    };
  });

  const gameFieldsMap = new Map(fields.map(f => [f.game_field_id, f]));

  const processedEntities: ProcessedEntity[] = (entities || []).map((entity) => {
    const defaultSkin = entity.entity_skins?.find((s) => s.is_default) || entity.entity_skins?.[0];
    const skinIconPath = defaultSkin?.entity_images?.find((img) => img.type === 'icon')?.image_path;
    const iconPath = entity.icon_path || skinIconPath;
    
    const publicIconUrl = iconPath ? getPublicUrl('games', iconPath) || "" : "";

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};

    entity.entity_field_values?.forEach((val) => {
      const field = gameFieldsMap.get(val.game_field_id);
      if (!field) return;
      const fieldId = field.id;

      if (!allValues[fieldId]) allValues[fieldId] = [];

      if (val.option_id) {
        allValues[fieldId].push(val.option_id);
      } else {
        const valText = val.value_text as string | Record<string, string> | null;
        const translatedValue = typeof valText === 'string' ? valText : getTranslatedField(valText || {}, currentLang, game.default_lang);
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
          iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined,
        };
      }
    });

    return { 
      id: entity.id,
      section_id: entity.section_id,
      name: entity.name,
      icon_path: entity.icon_path,
      publicIconUrl, 
      fieldValuesMap, 
      allValues 
    };
  });

  const filterFieldIds = displaySettings?.filter_field_ids || [];
  const filterFields =
    fields
      .filter((f) => filterFieldIds.includes(f.id))
      .map((f) => ({
        id: String(f.id),
        key: f.key,
        options: (f.field_options || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((opt) => ({
            id: String(opt.id),
            value_key: opt.value_key,
            iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined,
            color: opt.color,
          })),
      })) || [];

  const gameCoverUrl = game.cover_url ? getPublicUrl('games', game.cover_url) : null;

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        {gameCoverUrl && (
          <Image
            src={gameCoverUrl}
            alt=""
            fill
            className="object-cover grayscale blur-md opacity-25 scale-105"
            priority
          />
        )}
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
                <div className="relative w-20 h-20 rounded-full shadow-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden" style={{ backgroundColor: section.color || 'transparent' }}>
                  <Image
                    src={getPublicUrl('games', section.icon_path)!}
                    alt={getTranslatedField(section.key, currentLang, game.default_lang)}
                    fill
                    sizes="80px"
                    className="object-contain p-2"
                  />
                </div>
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
