import { createPublicClient } from "@/lib/supabase/server";
import { 
  getGameBySlug, 
  getSectionById, 
  getEntityById, 
  getSectionFields, 
  getSectionDisplaySettings, 
  getEntityFieldValues,
  SectionField,
  EntityFieldValue,
  SectionEntity,
  SectionDisplaySettings,
  Game,
  Section,
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

/**
 * Processes a single field for display.
 */
function processField(field: SectionField, values: EntityFieldValue[], currentLang: string, defaultLang: string, filterIds: string[]) {
  const gField = Array.isArray(field.game_fields) ? field.game_fields[0] : field.game_fields;
  let displayValue = "";
  let iconUrl = "";
  let color = "";

  if (field.is_multi) {
    displayValue = resolveLabels(field, values, currentLang, defaultLang);
  } else {
    const val = values[0];
    if (val?.option_id) {
      const opt = gField?.field_options?.find((o) => String(o.id) === String(val.option_id));
      if (opt) {
        displayValue = getTranslatedField(opt.value_key, currentLang, defaultLang);
        iconUrl = opt.icon_path ? getPublicUrl('games', opt.icon_path) || "" : "";
        color = opt.color || "";
      }
    } else if (val) {
      displayValue = typeof val.value_text === 'string' ? val.value_text : getTranslatedField(val.value_text || {}, currentLang, defaultLang);
    }
  }
  return { id: field.id, key: field.key, displayValue, iconUrl, color, isFilter: filterIds.includes(field.id) };
}

export default async function EntityDetailPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId, entityId } = await paramsPromise;
  const [gameRes, sectionRes, entityRes, settingsRes, fieldsRes, valuesRes] = await Promise.all([
    getGameBySlug(gameSlug), getSectionById(sectionId), getEntityById(entityId),
    getSectionDisplaySettings(sectionId), getSectionFields(sectionId), getEntityFieldValues(entityId)
  ]);

  const game = gameRes.data as Game;
  const section = sectionRes.data as Section;
  const entity = entityRes.data as SectionEntity;
  if (!game) redirect("/");
  if (!section || !entity) redirect(`/${gameSlug}`);

  const fields = (fieldsRes.data as SectionField[] || []);
  const gameFieldsMap = new Map(fields.map(f => [f.game_field_id, f]));
  const valuesByFieldId = (valuesRes.data as EntityFieldValue[] || []).reduce((acc: Record<string, EntityFieldValue[]>, val) => {
    const field = gameFieldsMap.get(val.game_field_id);
    if (field) { 
      if (!acc[field.id]) acc[field.id] = []; 
      acc[field.id].push(val); 
    }
    return acc;
  }, {});

  const filterIds = (settingsRes.data as SectionDisplaySettings)?.filter_field_ids || [];
  const processedFields = fields.map(f => processField(f, valuesByFieldId[f.id] || [], game.default_lang, game.default_lang, filterIds));
  
  const dSkin = entity.entity_skins?.find(s => s.is_default) || entity.entity_skins?.[0];
  const sIcon = dSkin?.entity_images?.find(i => i.type === 'icon');
  const iconUrl = sIcon?.image_path ? getPublicUrl('games', sIcon.image_path) : "";
  const sSplash = dSkin?.entity_images?.find(i => i.type === 'splashart');
  const splashUrl = sSplash?.image_path ? getPublicUrl('games', sSplash.image_path) : "";
  
  const entityName = getTranslatedField(entity.name, game.default_lang, game.default_lang);
  const filterFields = processedFields.filter(f => f.isFilter && f.displayValue);

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <GSBackground isHidden={!!game.cover_url} />
        <Header breadcrumbs={[{ href: "/", label: getTranslation('home', game.default_lang) }, { href: `/${gameSlug}`, label: getTranslatedField(game.name, game.default_lang, game.default_lang) }, { href: `/${gameSlug}/sections/${sectionId}`, label: getTranslatedField(section.key, game.default_lang, game.default_lang) }, { href: `/${gameSlug}/sections/${sectionId}/entities/${entityId}`, label: entityName }]} />
        <main className="flex-1 px-8 pt-24 pb-12 z-10 relative">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8 items-end justify-between">
              <div className="flex-1 space-y-6 w-full pb-4">
                <div className="flex flex-col gap-6">
                  {iconUrl ? <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-900/50 backdrop-blur-sm"><Image src={iconUrl} alt={entityName} fill sizes="112px" className="object-cover" /></div> : <div className="w-28 h-28 flex items-center justify-center text-zinc-400 text-4xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-900/10">?</div>}
                  <div className="space-y-3">
                    <h1 className="text-6xl font-black text-black dark:text-zinc-50 tracking-tighter uppercase italic leading-none">{entityName}</h1>
                    {section.is_collectible && <div className="pt-1"><CollectionToggle entityId={entityId} initialIsOwned={false} /></div>}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {filterFields.map(f => (
                        <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 dark:bg-zinc-100/10 backdrop-blur-md border border-zinc-200/20 dark:border-white/5 shadow-xl transition-all hover:scale-105">
                          {f.iconUrl && <div className="relative w-4 h-4"><Image src={f.iconUrl} alt="" fill className="object-contain" /></div>}
                          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">{getTranslatedField(f.key, game.default_lang, game.default_lang)}:</span>
                          <span className="text-sm font-black text-black dark:text-white uppercase italic">{f.displayValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {splashUrl && <div className="lg:w-[75%] flex justify-end relative lg:-mt-32"><div className="relative group w-full aspect-square lg:aspect-auto lg:h-[calc(100vh-100px)] min-h-[600px] flex items-end justify-end pointer-events-none"><div className="absolute -inset-20 bg-gradient-to-tr from-[#22c55e]/20 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" /><Image src={splashUrl} alt={entityName} fill priority sizes="(max-width: 1024px) 100vw, 75vw" className="object-contain object-bottom transition-all duration-1000 group-hover:scale-[1.02]" /></div></div>}
            </div>
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
