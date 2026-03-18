import { createClient } from "@/lib/supabase/server";
import { 
  getGameBySlug, 
  getSectionById, 
  getSectionFields, 
  getSectionDisplaySettings,
  getUserSectionCollection,
  getSectionAscensions,
  Game,
  Section,
  SectionField,
  SectionDisplaySettings,
  EntityFieldValue,
} from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers, cookies } from "next/headers";
import CollectionGridManager from "@/app/components/CollectionGridManager";

type PageProps = { params: Promise<{ gameSlug: string; sectionId: string }>; };

/**
 * Processes entity field values into a usable map.
 */
function processEntityValues(val: EntityFieldValue, field: SectionField, currentLang: string, defaultLang: string, allValues: Record<string, string[]>, fieldValuesMap: Record<string, { color?: string; iconUrl?: string }>) {
  const fieldId = field.id;
  // eslint-disable-next-line security/detect-object-injection
  if (!allValues[fieldId]) {
    // eslint-disable-next-line security/detect-object-injection
    allValues[fieldId] = [];
  }
  
  if (val.option_id) {
    // eslint-disable-next-line security/detect-object-injection
    allValues[fieldId].push(String(val.option_id));
  } else {
    const text = typeof val.value_text === 'string' ? val.value_text : getTranslatedField(val.value_text || {}, currentLang, defaultLang);
    if (text) {
      if (field.is_multi) {
        // eslint-disable-next-line security/detect-object-injection
        allValues[fieldId].push(...text.split(',').filter(Boolean).map(p => p.trim()));
      } else {
        // eslint-disable-next-line security/detect-object-injection
        allValues[fieldId].push(text);
      }
    }
  }
  const opt = Array.isArray(val.field_options) ? val.field_options[0] : val.field_options;
  if (opt) {
    // eslint-disable-next-line security/detect-object-injection
    fieldValuesMap[fieldId] = {
      color: opt.color || undefined,
      iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined, 
    };
  }
}

export default async function SectionCollectionPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const supabase = await createClient();

  const [userRes, gameRes] = await Promise.all([supabase.auth.getUser(), getGameBySlug(gameSlug)]);
  const user = userRes.data.user;
  const game = gameRes.data as Game;
  if (!user) redirect("/auth/signin");
  if (!game) redirect("/profile");

  const [secRes, fieldsRes, settingsRes, entitiesRes, ascRes] = await Promise.all([
    getSectionById(sectionId), 
    getSectionFields(sectionId), 
    getSectionDisplaySettings(sectionId), 
    getUserSectionCollection(sectionId, user.id, game.default_lang),
    getSectionAscensions(sectionId)
  ]);

  const section = secRes.data as Section;
  if (!section) return notFound();
  if (section.game_id !== game.id || !section.is_collectible) redirect(`/profile/${gameSlug}`);

  const ownedEntities = (entitiesRes.data || []).filter(e => e.user_entities?.length).map(e => ({ 
    id: e.user_entities![0].id, 
    entity_id: e.id, 
    dupes: e.user_entities![0].dupes,
    level: e.user_entities![0].level,
    phase_index: e.user_entities![0].phase_index
  }));

  const fields = (fieldsRes.data as unknown as SectionField[] || []).map(f => {
    const gField = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return { 
      ...f, 
      manual_fill: gField?.manual_fill, 
      has_icon: gField?.has_icon, 
      has_color: gField?.has_color, 
      field_options: gField?.field_options || [] 
    };
  });
  const gameFieldsMap = new Map(fields.map(f => [f.game_field_id, f]));

  const h = await headers();
  const c = await cookies();
  const lang = game.supported_languages.includes(c.get('user_lang')?.value || h.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en') ? (c.get('user_lang')?.value || h.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en') : game.default_lang;

  const processedEntities = (entitiesRes.data || []).map(entity => {
    const skinIconPath = entity.entity_skins?.[0]?.entity_images?.find((img: { type: string; image_path: string }) => img.type === 'icon')?.image_path;
    const publicIconUrl = (entity.icon_path || skinIconPath) ? getPublicUrl('games', (entity.icon_path || skinIconPath)!) || "" : "";
    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};
    entity.entity_field_values?.forEach(val => {
      const field = gameFieldsMap.get(val.game_field_id);
      if (field) processEntityValues(val, field, lang, game.default_lang, allValues, fieldValuesMap);
    });

    const availableLevels = Array.from(
      new Map((entity.entity_stats || []).map((s: { level: number; phase_index: number }) => [`${s.level}-${s.phase_index}`, s])).values()
    ).sort((a, b) => a.level !== b.level ? a.level - b.level : a.phase_index - b.phase_index);

    return { 
      id: entity.id, 
      section_id: entity.section_id, 
      name: entity.name, 
      icon_path: entity.icon_path, 
      publicIconUrl, 
      fieldValuesMap, 
      allValues,
      availableLevels
    };
  });

  const filterIds = (settingsRes.data as SectionDisplaySettings)?.filter_field_ids || [];
  const filterFields = fields.filter(f => filterIds.includes(f.id)).map(f => ({ id: String(f.id), key: f.key, options: (f.field_options || []).sort((a, b) => a.order_index - b.order_index).map(opt => ({ id: String(opt.id), value_key: opt.value_key, iconUrl: opt.icon_path ? getPublicUrl('games', opt.icon_path) || undefined : undefined, color: opt.color || undefined })) }));

  const coverUrl = getPublicUrl('games', game.cover_url);

  return (
    <div className="relative flex flex-col min-h-screen bg-black font-sans text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"><div className="absolute inset-0 bg-cover bg-center grayscale blur-md opacity-25 scale-105 transition-all duration-1000 ease-out" style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : "none" }} /><div className="absolute inset-0 bg-black/80" /></div>
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <GSBackground isHidden={!!game.cover_url} />
        <Header breadcrumbs={[{ href: "/profile", label: getTranslation('profile', lang) }, { href: `/profile/${gameSlug}`, label: getTranslatedField(game.name, lang, game.default_lang) }, { href: `/profile/${gameSlug}/sections/${sectionId}`, label: getTranslatedField(section.key, lang, game.default_lang) }]} />
        <main className="flex-1 px-8 py-24 z-10 relative"><div className="max-w-7xl mx-auto space-y-12"><div className="flex flex-col md:flex-row items-center gap-8">{section.icon_path ? <div className="relative w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 p-4 shadow-2xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: section.color || 'transparent' }}><Image src={getPublicUrl('games', section.icon_path)!} fill sizes="96px" className="object-contain filter grayscale invert brightness-200" alt="" /></div> : <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-500 text-4xl font-black" style={{ backgroundColor: section.color || 'transparent' }}>?</div>}<div className="space-y-2 text-center md:text-left"><h1 className="text-5xl font-black italic uppercase tracking-tighter text-[#22c55e]">{getTranslatedField(section.key, lang, game.default_lang)}</h1><p className="text-zinc-400 font-bold uppercase tracking-[0.3em] text-[10px]">{getTranslation('tapToCollect', lang)}</p></div></div><CollectionGridManager entities={processedEntities} initialOwnedEntities={ownedEntities} section={section} ascensions={ascRes.data || []} displaySettings={settingsRes.data as SectionDisplaySettings} filterFields={filterFields} gameDefaultLang={game.default_lang} currentLang={lang} /></div></main>
      </GameLocalizationProvider>
    </div>
  );
}
