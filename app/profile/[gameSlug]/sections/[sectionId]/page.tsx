import { createClient } from "@/lib/supabase/server";
import { 
  getGameBySlug, 
  getSectionById, 
  getSectionFields, 
  getSectionDisplaySettings,
  Game,
  Section,
  SectionField,
  SectionDisplaySettings,
  FieldOption,
  LocalizedString,
} from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers, cookies } from "next/headers";
import CollectionGridManager from "@/app/components/CollectionGridManager";

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>;
};

interface EntityWithOwnership {
  id: string;
  section_id: string;
  name: Record<string, string>;
  icon_path: string | null;
  entity_skins: {
    entity_images: {
      image_path: string;
      type: string;
    }[];
  }[];
  entity_field_values: {
    game_field_id: string;
    value_text: string | LocalizedString | null;
    option_id: string | null;
    field_options: {
      color: string | null;
      icon_path: string | null;
      value_key: Record<string, string>;
    } | null;
  }[];
  user_entities: {
    id: string;
    dupes: number;
  }[];
}

interface ProcessedCollectionEntity {
  id: string;
  section_id: string;
  name: Record<string, string>;
  icon_path: string | null;
  publicIconUrl: string;
  fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>;
  allValues: Record<string, string[]>;
}

export default async function SectionCollectionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createClient();

  // 1. Parallelize Auth and Cached Global Data
  const [userRes, gameRes] = await Promise.all([
    supabase.auth.getUser(),
    getGameBySlug(gameSlug)
  ]);

  const user = userRes.data.user;
  const game = gameRes.data as Game | null;

  if (!user) redirect("/auth/signin");
  if (!game) redirect("/profile");

  // 2. Parallelize everything else (Consolidated entities and owned check)
  const [sectionRes, fieldsRes, settingsRes, entitiesRes] = await Promise.all([
    getSectionById(sectionId),
    getSectionFields(sectionId),
    getSectionDisplaySettings(sectionId),
    // Fetch entities AND the user's ownership status in ONE query
    supabase.from("section_entities").select(`
      id, 
      section_id, 
      name, 
      icon_path,
      entity_skins ( 
        entity_images ( image_path, type ) 
      ),
      entity_field_values ( 
        game_field_id, 
        value_text, 
        option_id, 
        field_options ( color, icon_path, value_key ) 
      ),
      user_entities!left (
        id,
        dupes
      )
    `)
    .eq("section_id", sectionId)
    .eq("user_entities.user_id", user.id)
    .eq("entity_skins.is_default", true)
    .order(`name->>${game.default_lang}`, { ascending: true }) as Promise<{ data: EntityWithOwnership[] | null }>
  ]);

  const section = sectionRes.data as Section | null;
  const fieldsRaw = fieldsRes.data as unknown as SectionField[];
  const displaySettings = settingsRes.data as SectionDisplaySettings | null;
  const entities = entitiesRes.data || [];

  if (!section || section.game_id !== game.id || !section.is_collectible) redirect(`/profile/${gameSlug}`);

  // Map owned entities from the joined query
  const ownedEntities = entities
    .filter(e => e.user_entities && e.user_entities.length > 0)
    .map(e => ({
      id: e.user_entities[0].id,
      entity_id: e.id,
      dupes: e.user_entities[0].dupes
    }));

  // Flatten fields structure for compatibility
  const fields = (fieldsRaw || []).map((f) => {
    return {
      ...f,
      manual_fill: f.game_fields?.manual_fill,
      has_icon: f.game_fields?.has_icon,
      has_color: f.game_fields?.has_color,
      field_options: f.game_fields?.field_options || []
    };
  });

  // --- Language Detection ---
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = (await cookieStore).get('user_lang')?.value;
  const acceptLanguage = (await headersList).get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const currentLang = game.supported_languages.includes(userLang || browserLang) ? (userLang || browserLang) : game.default_lang;

  // Create map by game_field_id for entity values processing
  const gameFieldsMap = new Map((fields || [])?.map(f => [f.game_field_id, f]));

  const processedEntities: ProcessedCollectionEntity[] = (entities || []).map((entity) => {
    const defaultSkin = entity.entity_skins?.[0];
    const skinIconPath = defaultSkin?.entity_images?.find((img) => img.type === 'icon')?.image_path;
    const iconPath = entity.icon_path || skinIconPath;
    
    let publicIconUrl = "";
    if (iconPath) {
      publicIconUrl = getPublicUrl('games', iconPath) || "";
    }

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
        const translated = getTranslatedField(val.value_text || {}, currentLang, game.default_lang);
        if (translated) {
          if (field?.is_multi) allValues[fieldId].push(...translated.split(',').filter(Boolean).map(p => p.trim()));
          else allValues[fieldId].push(translated);
        }
      }
      if (val.field_options) {
        fieldValuesMap[fieldId] = {
          color: val.field_options.color || undefined,
          iconUrl: val.field_options.icon_path ? getPublicUrl('games', val.field_options.icon_path) || undefined : undefined,
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
  const filterFields = (fields || [])
    .filter((f) => filterFieldIds.includes(f.id))
    .map((f) => ({
      id: String(f.id),
      key: f.key,
      options: (f.field_options || [])
        .sort((a: FieldOption, b: FieldOption) => a.order_index - b.order_index)
        .map((opt: FieldOption) => ({
          id: String(opt.id),
          value_key: opt.value_key,
          iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined,
          color: opt.color,
        })),
    }));

  const gameCoverUrl = getPublicUrl('games', game.cover_url);

  return (
    <div className="relative flex flex-col min-h-screen bg-black font-sans text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center grayscale blur-md opacity-25 scale-105 transition-all duration-1000 ease-out" style={{ backgroundImage: gameCoverUrl ? `url(${gameCoverUrl})` : "none" }} />
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <GSBackground isHidden={!!gameCoverUrl} />
        <Header breadcrumbs={[
          { href: "/profile", label: getTranslation('profile', currentLang) },
          { href: `/profile/${gameSlug}`, label: getTranslatedField(game.name, currentLang, game.default_lang) },
          { href: `/profile/${gameSlug}/sections/${sectionId}`, label: getTranslatedField(section.key, currentLang, game.default_lang) },
        ]} />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {section.icon_path ? (
                <div className="relative w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 p-4 shadow-2xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: section.color || 'transparent' }}>
                  <Image 
                    src={getPublicUrl('games', section.icon_path)!} 
                    fill
                    sizes="96px"
                    className="object-contain filter grayscale invert brightness-200" 
                    alt="" 
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-500 text-4xl font-black" style={{ backgroundColor: section.color || 'transparent' }}>?</div>
              )}
              <div className="space-y-2 text-center md:text-left">
                <h1 className="text-5xl font-black italic uppercase tracking-tighter text-[#22c55e]">
                  {getTranslatedField(section.key, currentLang, game.default_lang)}
                </h1>
                <p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                  {getTranslation('tapToCollect', currentLang)}
                </p>
              </div>
            </div>

            <CollectionGridManager
              entities={processedEntities}
              initialOwnedEntities={ownedEntities}
              section={section}
              displaySettings={displaySettings}
              filterFields={filterFields}
              gameDefaultLang={game.default_lang}
              currentLang={currentLang}
            />
          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}
