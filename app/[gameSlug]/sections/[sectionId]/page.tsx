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
  SectionDisplaySettings,
  SectionEntity,
  FieldOption,
  EntityFieldValue,
} from "@/lib/supabase/queries";
import { redirect } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import EntityGridManager from "@/app/components/EntityGridManager";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { getPublicUrl } from "@/lib/supabase/client";

export const revalidate = 3600;

interface StaticParamsSection { id: string; games: { slug: string; } | null; }

export async function generateStaticParams() {
  const supabase = createPublicClient();
  const { data: sections } = await supabase.from('game_sections').select('id, games(slug)') as { data: StaticParamsSection[] | null };
  return (sections || []).map((s) => ({ gameSlug: s.games?.slug, sectionId: s.id }));
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

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const [gameRes, sectionRes] = await Promise.all([getGameBySlug(gameSlug), getSectionById(sectionId)]);
  const game = gameRes.data as Game;
  const section = sectionRes.data as Section;
  if (!game || !section) return { title: 'Section Not Found' };
  const lang = game.default_lang || 'en';
  return { title: `${getTranslatedField(section.key, lang, lang)} | ${getTranslatedField(game.name, lang, lang)} - GachaStats` };
}

/**
 * Resolves icon URL for an entity.
 */
function getEntityIconUrl(entity: SectionEntity): string {
  const defaultSkin = entity.entity_skins?.find((s) => s.is_default) || entity.entity_skins?.[0];
  const skinIconPath = defaultSkin?.entity_images?.find((img) => img.type === 'icon')?.image_path;
  const iconPath = entity.icon_path || skinIconPath;
  return iconPath ? getPublicUrl('games', iconPath) || "" : "";
}

/**
 * Processes a single field value.
 */
function processSingleValue(val: EntityFieldValue, field: SectionField, lang: string, defLang: string, all: string[]) {
  if (val.option_id) {
    all.push(String(val.option_id));
  } else {
    const text = typeof val.value_text === 'string' ? val.value_text : getTranslatedField(val.value_text || {}, lang, defLang);
    if (text) {
      if (field.is_multi) all.push(...text.split(',').filter(Boolean).map(p => p.trim()));
      else all.push(text);
    }
  }
}

/**
 * Maps field values for an entity.
 */
function mapFieldValues(entity: SectionEntity, fieldsMap: Map<string, SectionField>, optionsMap: Map<string, FieldOption>, lang: string, defLang: string) {
  const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
  const allValues: Record<string, string[]> = {};

  entity.entity_field_values?.forEach((val) => {
    const field = fieldsMap.get(val.game_field_id);
    if (!field) return;
    const fId = field.id;

    // eslint-disable-next-line security/detect-object-injection
    if (!allValues[fId]) allValues[fId] = [];
    // eslint-disable-next-line security/detect-object-injection
    processSingleValue(val, field, lang, defLang, allValues[fId]);

    const opt = optionsMap.get(String(val.option_id));
    if (opt) {
      // eslint-disable-next-line security/detect-object-injection
      fieldValuesMap[fId] = { color: opt.color || undefined, iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined };
    }
  });
  return { fieldValuesMap, allValues };
}

export default async function SectionDetailPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const [gRes, sRes, fRes, dsRes] = await Promise.all([getGameBySlug(gameSlug), getSectionById(sectionId), getSectionFields(sectionId), getSectionDisplaySettings(sectionId)]);
  const game = gRes.data as Game;
  const section = sRes.data as Section;
  if (!game) redirect("/");
  if (!section) redirect(`/${gameSlug}`);

  const { data: entities } = await getSectionEntities(sectionId, game.default_lang);
  const fields = (fRes.data as SectionField[] || []).map(f => {
    const gField = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return { 
      ...f, 
      manual_fill: gField?.manual_fill, 
      has_icon: gField?.has_icon, 
      has_color: gField?.has_color, 
      field_options: gField?.field_options || [] 
    };
  });
  
  const allOptionsMap = new Map<string, FieldOption>();
  fields.forEach(f => f.field_options?.forEach(o => allOptionsMap.set(String(o.id), o)));
  const fieldsMap = new Map(fields.map(f => [f.game_field_id, f]));

  const processedEntities: ProcessedEntity[] = (entities || []).map(e => {
    const skinIcon = e.entity_skins?.find((s) => s.is_default)?.entity_images?.find((i) => i.type === 'icon')?.image_path;
    const { fieldValuesMap, allValues } = mapFieldValues(e, fieldsMap, allOptionsMap, game.default_lang, game.default_lang);
    return { id: e.id, section_id: e.section_id, name: e.name, icon_path: e.icon_path || skinIcon || null, publicIconUrl: getEntityIconUrl(e), fieldValuesMap, allValues };
  });

  const filterIds = (dsRes.data as SectionDisplaySettings)?.filter_field_ids || [];
  const filterFields = fields.filter(f => filterIds.includes(f.id)).map(f => ({ id: String(f.id), key: f.key, options: (f.field_options || []).sort((a, b) => a.order_index - b.order_index).map(o => ({ id: String(o.id), value_key: o.value_key, iconUrl: o.icon_path ? getPublicUrl('games', o.icon_path) || undefined : undefined, color: o.color || undefined })) }));

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <GSBackground isHidden={!!game.cover_url} />
        <Header breadcrumbs={[{ href: "/", label: getTranslation('home', game.default_lang) }, { href: `/${gameSlug}`, label: getTranslatedField(game.name, game.default_lang, game.default_lang) }, { href: `/${gameSlug}/sections/${sectionId}`, label: getTranslatedField(section.key, game.default_lang, game.default_lang) }, { href: `/${gameSlug}/sections/${sectionId}/entities/${game.id}`, label: "Section" }]} />
        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex items-center gap-6">{section.icon_path ? <div className="relative w-20 h-20 rounded-full shadow-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden" style={{ backgroundColor: section.color || 'transparent' }}><Image src={getPublicUrl('games', section.icon_path)!} alt={getTranslatedField(section.key, game.default_lang, game.default_lang)} fill sizes="80px" className="object-contain p-2" priority /></div> : <div className="w-20 h-20 flex items-center justify-center text-zinc-400 text-3xl border border-zinc-300 dark:border-zinc-700 rounded-full" style={{ backgroundColor: section.color || 'transparent' }}>?</div>}<h1 className="text-5xl font-extrabold text-black dark:text-zinc-50 tracking-tight uppercase">{getTranslatedField(section.key, game.default_lang, game.default_lang)}</h1></div>
            <EntityGridManager entities={processedEntities} displaySettings={dsRes.data as SectionDisplaySettings} filterFields={filterFields} gameSlug={gameSlug} sectionId={sectionId} sectionName={getTranslatedField(section.key, game.default_lang, game.default_lang)} gameDefaultLang={game.default_lang} currentLang={game.default_lang} />
          </div>
        </main>
      </GameLocalizationProvider>
    </div>
  );
}
