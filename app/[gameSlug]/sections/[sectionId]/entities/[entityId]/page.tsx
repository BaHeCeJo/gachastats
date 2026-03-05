import { createPublicClient } from "@/lib/supabase/server";
import { 
  getGameBySlug, 
  getSectionById, 
  getEntityById, 
  getSectionFields, 
  getSectionDisplaySettings, 
  getEntityFieldValues,
  getEntityTeams,
  getSectionEntities,
  SectionField,
  EntityFieldValue,
  SectionEntity,
  SectionDisplaySettings,
} from "@/lib/supabase/queries";
import TeamBuilder, { TeamEntity, TeamData, TeamFieldOption } from "@/app/components/TeamBuilder";
import { redirect } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import CollectionToggle from "@/app/components/CollectionToggle";
import { getPublicUrl } from "@/lib/supabase/client";

// Enable ISR
export const revalidate = 3600;

interface StaticParamsEntity {
  id: string;
  section_id: string;
  game_sections: {
    games: {
      slug: string;
    };
  } | null;
}

/**
 * Pre-generate static paths for entities.
 */
export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data: entities } = await supabase.from('section_entities').select('id, section_id, game_sections(games(slug))') as { data: StaticParamsEntity[] | null };
  
  return (entities || []).map((e) => ({
    gameSlug: e.game_sections?.games?.slug,
    sectionId: e.section_id,
    entityId: e.id
  }));
}

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string; entityId: string }>;
};

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, entityId } = await paramsPromise;
  
  const [gameRes, entityRes] = await Promise.all([
    getGameBySlug(gameSlug),
    getEntityById(entityId)
  ]);

  const game = gameRes.data;
  const entity = entityRes.data as unknown as SectionEntity;

  if (!game || !entity) return { title: 'Entity Not Found' };

  const currentLang = game.default_lang || 'en';
  const title = getTranslatedField(entity.name, currentLang, game.default_lang || 'en');
  const gameTitle = getTranslatedField(game.name, currentLang, game.default_lang || 'en');

  return {
    title: `${title} - ${gameTitle} | GachaStats`,
    openGraph: {
      title: `${title} - ${gameTitle} | GachaStats`,
    },
  };
}

export default async function EntityDetailPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId, entityId } = await paramsPromise;

  // 1. Fetch basic details in parallel (all cached via public client)
  const [gameRes, sectionRes, entityRes, settingsRes, fieldsRes, valuesRes] = await Promise.all([
    getGameBySlug(gameSlug),
    getSectionById(sectionId),
    getEntityById(entityId),
    getSectionDisplaySettings(sectionId),
    getSectionFields(sectionId),
    getEntityFieldValues(entityId)
  ]);

  const game = gameRes.data;
  const section = sectionRes.data;
  const entity = entityRes.data as unknown as SectionEntity;
  const displaySettings = settingsRes.data as SectionDisplaySettings | null;
  const fieldsRaw = fieldsRes.data as unknown as SectionField[];
  const entityValues = valuesRes.data as unknown as EntityFieldValue[];

  if (!game) redirect("/");
  if (!section || !entity) redirect(`/${gameSlug}`);

  // 2. Fetch feature data (cached)
  const [teamsRes, sectionEntitiesRes] = await Promise.all([
    getEntityTeams(entityId),
    section.has_teams ? getSectionEntities(sectionId, game.default_lang) : Promise.resolve({ data: [] }),
  ]);

  const relevantTeams = (teamsRes.data || []) as unknown as TeamData[];
  const rawSectionEntities = sectionEntitiesRes.data as unknown as SectionEntity[] || [];

  const defaultLang = game.default_lang || 'en';
  const currentLang = defaultLang; // Static fallback

  const fields = (fieldsRaw || []).map((f) => ({
    ...f,
    manual_fill: f.game_fields?.manual_fill,
    has_icon: f.game_fields?.has_icon,
    has_color: f.game_fields?.has_color,
    field_options: f.game_fields?.field_options || []
  }));

  const filterFieldIds = displaySettings?.filter_field_ids || [];
  const gameFieldsMap = new Map((fields || [])?.map((f) => [f.game_field_id, f]));
  const valuesByFieldId = (entityValues || []).reduce((acc: Record<string, EntityFieldValue[]>, val) => {
    const field = gameFieldsMap.get(val.game_field_id);
    if (field) {
      if (!acc[field.id]) acc[field.id] = [];
      acc[field.id].push(val);
    }
    return acc;
  }, {});

  const defaultSkin = entity.entity_skins?.find((skin) => skin.is_default) || entity.entity_skins?.[0];
  const iconImage = defaultSkin?.entity_images?.find((img) => img.type === 'icon');
  const splashartImage = defaultSkin?.entity_images?.find((img) => img.type === 'splashart');

  const iconUrl = iconImage ? getPublicUrl('games', iconImage.image_path) : "";
  const splashartUrl = splashartImage ? getPublicUrl('games', splashartImage.image_path) : "";
  const gameCoverUrl = game.cover_url ? getPublicUrl('games', game.cover_url) : null;

  const processedFields = (fields || []).map((field) => {
    const values = valuesByFieldId[field.id] || [];
    let displayValue = "";
    let fieldIconUrl = "";
    let color = "";

    const getLabelsFromIds = (ids: string[]) => {
      const uniqueIds = Array.from(new Set(ids));
      return (field.field_options || [])
        .filter((opt) => uniqueIds.includes(String(opt.id)))
        .map((opt) => getTranslatedField(opt.value_key, currentLang, defaultLang));
    };

    if (field.is_multi) {
      if (field.manual_fill) {
        const tags = values.flatMap((v) => {
          const valText = v.value_text;
          const translated = typeof valText === 'string' ? valText : getTranslatedField(valText || {}, currentLang, defaultLang);
          return translated ? translated.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
        });
        const resolvedLabels = tags.map((tag: string) => {
          const option = (field.field_options || []).find((opt) => String(opt.id) === tag);
          if (option) return getTranslatedField(option.value_key, currentLang, defaultLang);
          return tag;
        });
        displayValue = resolvedLabels.join(", ");
      } else {
        const optionIds = values.map((v) => v.option_id).filter((id): id is string => !!id).map(String);
        displayValue = getLabelsFromIds(optionIds).join(", ");
      }
    } else {
      const val = values[0];
      if (val?.option_id) {
        const selectedOption = (field.field_options || []).find((opt) => String(opt.id) === String(val.option_id));
        if (selectedOption) {
          displayValue = getTranslatedField(selectedOption.value_key, currentLang, defaultLang);
          fieldIconUrl = selectedOption.icon_path ? getPublicUrl('games', selectedOption.icon_path) || "" : "";
          color = selectedOption.color || "";
        }
      } else {
        const valText = val?.value_text;
        displayValue = typeof valText === 'string' ? valText : getTranslatedField(valText || {}, currentLang, defaultLang);
      }
    }

    return {
      ...field,
      displayValue,
      iconUrl: fieldIconUrl,
      color,
      isFilter: filterFieldIds.includes(field.id)
    };
  });

  const filterFields = processedFields.filter((f) => f.isFilter && f.displayValue);
  const translatedEntityName = getTranslatedField(entity.name, currentLang, defaultLang);
  const translatedGameName = getTranslatedField(game.name, currentLang, defaultLang);
  const translatedSectionKey = getTranslatedField(section.key, currentLang, defaultLang);

  let sectionEntities: TeamEntity[] = [];
  let fieldOptions: TeamFieldOption[] = [];

  if (section.has_teams) {
    sectionEntities = (rawSectionEntities || []).map((ent) => {
      const dSkin = ent.entity_skins?.find((s) => s.is_default) || ent.entity_skins?.[0];
      const iImg = dSkin?.entity_images?.find((img) => img.type === 'icon');
      return { id: ent.id, name: ent.name, icon_path: iImg?.image_path || ent.icon_path };
    });

    fieldOptions = fields.flatMap((f) => (f.field_options || []).map((o) => ({
      ...o,
      field_name: getTranslatedField(f.key, currentLang, defaultLang)
    })));
  }

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

      <GameLocalizationProvider gameDefaultLang={defaultLang} gameSupportedLanguages={game.supported_languages}>
        <GSBackground isHidden={!!gameCoverUrl} />
        <Header
          breadcrumbs={[
            { href: "/", label: getTranslation('home', currentLang) },
            { href: `/${gameSlug}`, label: translatedGameName },
            { href: `/${gameSlug}/sections/${sectionId}`, label: translatedSectionKey },
            { href: `/${gameSlug}/sections/${sectionId}/entities/${entityId}`, label: translatedEntityName },
          ]}
        />

        <main className="flex-1 px-8 py-6 z-10 relative">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-end justify-between mb-0">
              <div className="flex-1 space-y-6 w-full pb-4">
                <div className="flex flex-col gap-6">
                  {iconUrl ? (
                    <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                      <Image 
                        src={iconUrl} 
                        alt={translatedEntityName} 
                        fill
                        sizes="112px"
                        className="object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-28 flex items-center justify-center text-zinc-400 text-4xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-900/10">?</div>
                  )}
                  <div className="space-y-3">
                    <h1 className="text-6xl font-black text-black dark:text-zinc-50 tracking-tighter uppercase italic leading-none">{translatedEntityName}</h1>
                    
                    {section.is_collectible && (
                      <div className="pt-1"><CollectionToggle entityId={entityId} initialIsOwned={false} /></div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {filterFields.map((field) => (
                        <div key={field.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 dark:bg-zinc-100/10 backdrop-blur-md border border-zinc-200/20 dark:border-white/5 shadow-xl transition-all hover:scale-105">
                          {field.iconUrl && (
                            <div className="relative w-4 h-4">
                              <Image src={field.iconUrl} alt="" fill className="object-contain" />
                            </div>
                          )}
                          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">{getTranslatedField(field.key, currentLang, defaultLang)}:</span>
                          <span className="text-sm font-black text-black dark:text-white uppercase italic">{field.displayValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {splashartUrl && (
                <div className="lg:w-[75%] flex justify-end">
                  <div className="relative group w-full aspect-square lg:aspect-auto lg:h-[600px]">
                    <div className="absolute -inset-20 bg-gradient-to-tr from-[#22c55e]/20 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    
                    <div className="relative w-full h-full transform lg:scale-150 origin-bottom pointer-events-none">
                      <Image 
                        src={splashartUrl} 
                        alt={translatedEntityName} 
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 75vw"
                        className="object-contain object-bottom transition-all duration-1000 group-hover:scale-[1.05]" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {section.has_teams && relevantTeams.length > 0 && (
              <div className="mb-4">
                <TeamBuilder 
                  sectionId={sectionId}
                  gameSlug={gameSlug}
                  sectionEntities={sectionEntities}
                  fieldOptions={fieldOptions}
                  maxTeamSize={section.max_team_size || 4}
                  existingTeams={relevantTeams}
                  gameDefaultLang={defaultLang}
                  isAdmin={false}
                  currentEntityId={entityId}
                />
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200/20 dark:border-white/5 relative z-10">
              <h2 className="text-xl font-black uppercase tracking-widest mb-4 italic flex items-center gap-4 text-black dark:text-zinc-50">
                <span className="w-8 h-1 bg-[#22c55e]" />
                {getTranslation('technicalData', currentLang)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800/50 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                <div className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{getTranslation('name', currentLang)}</span>
                  <span className="text-xl font-bold uppercase italic text-black dark:text-white">{translatedEntityName}</span>
                </div>
                {processedFields.map((field) => (
                  <div key={field.id} className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1 group hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-[#22c55e] transition-colors">{getTranslatedField(field.key, currentLang, defaultLang)}</span>
                    <div className="flex items-center gap-4">
                      {field.iconUrl && (
                        <div className="relative w-12 h-12">
                          <Image src={field.iconUrl} alt="" fill className="object-contain" />
                        </div>
                      )}
                      <span className="text-xl font-bold uppercase italic text-black dark:text-white">{field.displayValue || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}
