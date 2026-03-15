import { createPublicClient } from "@/lib/supabase/server";
import { 
  getGameBySlug, 
  getSectionById, 
  getEntityById, 
  getSectionFields, 
  getSectionDisplaySettings, 
  getEntityFieldValues,
  getEntityAbilities,
  getSectionStats,
  getEntityStats,
  SectionField,
  EntityFieldValue,
  SectionEntity,
  SectionDisplaySettings,
  Game,
  Section,
  SectionStat,
  EntityStatValue,
  EntityAbility
} from "@/lib/supabase/queries";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import CollectionToggle from "@/app/components/CollectionToggle";
import { getPublicUrl } from "@/lib/supabase/client";
import Image from "next/image";
import { redirect } from "next/navigation";

export const revalidate = 3600;

interface StaticParamsEntity {
  id: string;
  section_id: string;
  game_sections: { games: { slug: string; }; } | null;
}

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data: entities } = await supabase.from('section_entities').select('id, section_id, game_sections(games(slug))') as { data: StaticParamsEntity[] | null };
  return (entities || []).map((e) => ({
    gameSlug: e.game_sections?.games?.slug,
    sectionId: e.section_id,
    entityId: e.id
  }));
}

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string; entityId: string }>; };

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, entityId } = await paramsPromise;
  const [gameRes, entityRes] = await Promise.all([getGameBySlug(gameSlug), getEntityById(entityId)]);
  const game = gameRes.data as Game;
  const entity = entityRes.data as SectionEntity;
  if (!game || !entity) return { title: 'Entity Not Found' };
  const lang = game.default_lang || 'en';
  return { title: `${getTranslatedField(entity.name, lang, lang)} - ${getTranslatedField(game.name, lang, lang)} | GachaStats` };
}

/**
 * Resolves display labels for field options.
 */
function resolveLabels(field: SectionField, values: EntityFieldValue[], currentLang: string, defaultLang: string): string {
  const gField = Array.isArray(field.game_fields) ? field.game_fields[0] : field.game_fields;
  const manual = gField?.manual_fill;
  const options = gField?.field_options || [];

  if (manual) {
    const tags = values.flatMap(v => {
      const trans = typeof v.value_text === 'string' ? v.value_text : getTranslatedField(v.value_text || {}, currentLang, defaultLang);
      return trans ? trans.split(",").map(s => s.trim()).filter(Boolean) : [];
    });
    return tags.map(tag => {
      const opt = options.find((o) => String(o.id) === tag);
      return opt ? getTranslatedField(opt.value_key, currentLang, defaultLang) : tag;
    }).join(", ");
  }

  const ids = Array.from(new Set(values.map(v => v.option_id).filter((id): id is string => !!id).map(String)));
  return options.filter((o) => ids.includes(String(o.id))).map((o) => getTranslatedField(o.value_key, currentLang, defaultLang)).join(", ");
}

function processMultiField(field: SectionField, values: EntityFieldValue[], currentLang: string, defaultLang: string) {
  return {
    displayValue: resolveLabels(field, values, currentLang, defaultLang),
    iconUrl: "",
    color: ""
  };
}

function processSingleField(field: SectionField, val: EntityFieldValue | undefined, currentLang: string, defaultLang: string) {
  const gField = Array.isArray(field.game_fields) ? field.game_fields[0] : field.game_fields;
  if (val?.option_id) {
    const opt = gField?.field_options?.find((o) => String(o.id) === String(val.option_id));
    if (opt) {
      return {
        displayValue: getTranslatedField(opt.value_key, currentLang, defaultLang),
        iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || "" : "",
        color: opt.color || ""
      };
    }
  } else if (val) {
    return {
      displayValue: typeof val.value_text === 'string' ? val.value_text : getTranslatedField(val.value_text || {}, currentLang, defaultLang),
      iconUrl: "",
      color: ""
    };
  }
  return { displayValue: "", iconUrl: "", color: "" };
}

/**
 * Processes a single field for display.
 */
function processField(field: SectionField, values: EntityFieldValue[], currentLang: string, defaultLang: string, filterIds: string[]) {
  const result = field.is_multi 
    ? processMultiField(field, values, currentLang, defaultLang)
    : processSingleField(field, values[0], currentLang, defaultLang);
    
  return { id: field.id, key: field.key, ...result, isFilter: filterIds.includes(field.id) };
}

function getProcessedFields(fields: SectionField[], valuesByFieldId: Record<string, EntityFieldValue[]>, settings: SectionDisplaySettings | null, lang: string) {
  const filterIds = settings?.filter_field_ids || [];
  return fields.map(f => processField(f, valuesByFieldId[f.id] || [], lang, lang, filterIds));
}

function getEntityVisuals(entity: SectionEntity, settings: SectionDisplaySettings | null) {
  const skinDisplayTypes = settings?.skin_display_types || ["splashart"];
  const dSkin = entity.entity_skins?.find(s => s.is_default) || entity.entity_skins?.[0];
  const sIcon = dSkin?.entity_images?.find(i => i.type === 'icon');
  const iconUrl = sIcon?.image_path ? getPublicUrl('games', sIcon.image_path) : "";
  
  const displayImages = (dSkin?.entity_images || [])
    .filter(img => skinDisplayTypes.includes(img.type))
    .sort((a, b) => skinDisplayTypes.indexOf(a.type) - skinDisplayTypes.indexOf(b.type))
    .map(img => ({ type: img.type, url: getPublicUrl('games', img.image_path) }));
    
  return { iconUrl, displayImages };
}

function getBreadcrumbs(game: Game, section: Section, entityName: string, gameSlug: string, sectionId: string, entityId: string) {
  return [
    { href: "/", label: getTranslation('home', game.default_lang) }, 
    { href: `/${gameSlug}`, label: getTranslatedField(game.name, game.default_lang, game.default_lang) }, 
    { href: `/${gameSlug}/sections/${sectionId}`, label: getTranslatedField(section.key, game.default_lang, game.default_lang) }, 
    { href: `/${gameSlug}/sections/${sectionId}/entities/${entityId}`, label: entityName }
  ];
}

async function loadEntityPageData(gameSlug: string, sectionId: string, entityId: string) {
  const [gameRes, sectionRes, entityRes, settingsRes, fieldsRes, valuesRes, statsRes, entityStatsRes, abilitiesRes] = await Promise.all([
    getGameBySlug(gameSlug), getSectionById(sectionId), getEntityById(entityId),
    getSectionDisplaySettings(sectionId), getSectionFields(sectionId), getEntityFieldValues(entityId),
    getSectionStats(sectionId), getEntityStats(entityId), getEntityAbilities(entityId)
  ]);

  if (!gameRes.data) redirect("/");
  if (!sectionRes.data || !entityRes.data) redirect(`/${gameSlug}`);

  return {
    game: gameRes.data as Game,
    section: sectionRes.data as Section,
    entity: entityRes.data as SectionEntity,
    settings: settingsRes.data as SectionDisplaySettings,
    fields: fieldsRes.data as SectionField[] || [],
    values: valuesRes.data as EntityFieldValue[] || [],
    sectionStats: statsRes.data as SectionStat[] || [],
    entityStats: entityStatsRes.data as EntityStatValue[] || [],
    abilities: (abilitiesRes.data || []) as EntityAbility[]
  };
}

function groupValuesByFieldId(values: EntityFieldValue[], gameFieldsMap: Map<string, SectionField>) {
  return values.reduce((acc: Record<string, EntityFieldValue[]>, val) => {
    const field = gameFieldsMap.get(val.game_field_id);
    if (field) { 
      if (!acc[field.id]) acc[field.id] = []; 
      acc[field.id].push(val); 
    }
    return acc;
  }, {});
}

import EntityAbilityDisplay from "@/app/components/EntityAbilityDisplay";

export default async function EntityDetailPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId, entityId } = await paramsPromise;
  const data = await loadEntityPageData(gameSlug, sectionId, entityId);
  const { game, section, entity, settings, fields, values, sectionStats, entityStats, abilities } = data;

  const gameFieldsMap = new Map(fields.map(f => [f.game_field_id, f]));
  const valuesByFieldId = groupValuesByFieldId(values, gameFieldsMap);

  const processedFields = getProcessedFields(fields, valuesByFieldId, settings, game.default_lang);
  const { iconUrl, displayImages } = getEntityVisuals(entity, settings);
  
  const entityName = getTranslatedField(entity.name, game.default_lang, game.default_lang);
  const filterFields = processedFields.filter(f => f.isFilter && f.displayValue);
  const breadcrumbs = getBreadcrumbs(game, section, entityName, gameSlug, sectionId, entityId);

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <GSBackground isHidden={!!game.cover_url} />
        <Header breadcrumbs={breadcrumbs} />
        <main className="flex-1 px-8 pt-24 pb-12 z-10 relative">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-12 items-start mb-12">
              <div className="lg:col-span-5 space-y-8 w-full">
                <div className="flex flex-col gap-8">
                  {iconUrl ? <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-transform hover:scale-105 duration-500"><Image src={iconUrl} alt={entityName} fill sizes="128px" className="object-cover" /></div> : <div className="w-32 h-32 flex items-center justify-center text-zinc-400 text-4xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl bg-zinc-900/10">?</div>}
                  <div className="space-y-4">
                    <h1 className="text-7xl font-black text-black dark:text-zinc-50 tracking-tighter uppercase italic leading-[0.9]">{entityName}</h1>
                    {section.is_collectible && <div className="pt-2"><CollectionToggle entityId={entityId} initialIsOwned={false} /></div>}
                    <div className="mt-6 flex flex-wrap gap-3">
                      {filterFields.map(f => (
                        <div key={f.id} className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/80 dark:bg-zinc-100/10 backdrop-blur-md border border-zinc-200/20 dark:border-white/5 shadow-xl transition-all hover:scale-105">
                          {f.iconUrl && <div className="relative w-5 h-5"><Image src={f.iconUrl} alt="" fill className="object-contain" /></div>}
                          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">{getTranslatedField(f.key, game.default_lang, game.default_lang)}:</span>
                          <span className="text-sm font-black text-black dark:text-white uppercase italic">{f.displayValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Image Grid */}
              <div className="lg:col-span-7 w-full">
                <div className={`grid gap-4 ${displayImages.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {displayImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden bg-zinc-900/20 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-white/5 group transition-all duration-700 hover:shadow-2xl hover:shadow-[#22c55e]/10">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#22c55e]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                      <div className="absolute top-6 left-6 z-10">
                        <span className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-white/10">{img.type}</span>
                      </div>
                      <Image 
                        src={img.url!} 
                        alt={`${entityName} ${img.type}`} 
                        fill 
                        priority={idx === 0}
                        sizes="(max-width: 1024px) 100vw, 50vw" 
                        className="object-contain object-center transition-all duration-1000 group-hover:scale-110" 
                      />
                    </div>
                  ))}
                  {displayImages.length === 0 && (
                    <div className="aspect-square w-full rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-zinc-500 gap-4">
                      <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No display images set</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Abilities Section */}
            {abilities.length > 0 && (
              <div className="mb-20 relative z-10">
                <h2 className="text-xl font-black uppercase tracking-widest mb-8 italic flex items-center gap-4 text-black dark:text-zinc-50">
                  <span className="w-8 h-1 bg-[#22c55e]" />
                  Abilities & Combat Kit
                </h2>
                <EntityAbilityDisplay 
                  abilities={abilities} 
                  sectionStats={sectionStats} 
                  entityStats={entityStats} 
                  gameDefaultLang={game.default_lang} 
                />
              </div>
            )}

            <div className="pt-2 border-t border-zinc-200/20 dark:border-white/5 relative z-10">
              <h2 className="text-xl font-black uppercase tracking-widest mb-4 italic flex items-center gap-4 text-black dark:text-zinc-50"><span className="w-8 h-1 bg-[#22c55e]" />{getTranslation('technicalData', game.default_lang)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800/50 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                <div className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{getTranslation('name', game.default_lang)}</span><span className="text-xl font-bold uppercase italic text-black dark:text-white">{entityName}</span></div>
                {processedFields.map(f => (
                  <div key={f.id} className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1 group hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-[#22c55e] transition-colors">{getTranslatedField(f.key, game.default_lang, game.default_lang)}</span>
                    <div className="flex items-center gap-4">{f.iconUrl && <div className="relative w-12 h-12"><Image src={f.iconUrl} alt="" fill className="object-contain" /></div>}<span className="text-xl font-bold uppercase italic text-black dark:text-white">{f.displayValue || "—"}</span></div>
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
