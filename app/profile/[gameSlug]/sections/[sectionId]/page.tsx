import { createClient } from "@/lib/supabase/server";
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

export default async function SectionCollectionPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin");

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url, default_lang, supported_languages")
    .eq("slug", gameSlug)
    .single();

  if (gameError || !game) redirect("/profile");

  const [sectionRes, fieldsRes, settingsRes, entitiesRes, ownedRes] = await Promise.all([
    supabase.from("game_sections").select("*").eq("id", sectionId).single(),
    supabase.from("section_fields").select(`
      id, key, required, is_multi, category, order_index, game_field_id,
      game_fields (
        manual_fill, has_icon, has_color,
        field_options ( id, value_key, icon_path, color, order_index )
      )
    `).eq("section_id", sectionId).order("order_index", { ascending: true }),
    supabase.from("section_display_settings").select("*").eq("section_id", sectionId).single(),
    supabase.from("section_entities").select(`
      id, section_id, name, icon_path,
      entity_skins ( is_default, entity_images ( image_path, type ) ),
      entity_field_values ( id, game_field_id, value_text, option_id, field_options ( color, icon_path, value_key ) )
    `).eq("section_id", sectionId).eq("entity_skins.is_default", true).order(`name->>${game.default_lang}`, { ascending: true }),
    supabase.from("user_entities").select("id, entity_id, dupes").eq("user_id", user.id)
  ]);

  const section = sectionRes.data;
  const fieldsRaw = fieldsRes.data;
  const displaySettings = settingsRes.data;
  const entities = entitiesRes.data;
  const ownedEntities = ownedRes.data || [];

  if (!section || section.game_id !== game.id || !section.is_collectible) redirect(`/profile/${gameSlug}`);

  // Flatten fields structure for compatibility
  const fields = (fieldsRaw || []).map((f: any) => {
    // Handle cases where game_fields might be returned as an array or a single object
    const gf = Array.isArray(f.game_fields) ? f.game_fields[0] : f.game_fields;
    return {
      ...f,
      manual_fill: gf?.manual_fill,
      has_icon: gf?.has_icon,
      has_color: gf?.has_color,
      field_options: gf?.field_options || []
    };
  });

  // --- Language Detection ---
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = cookieStore.get('user_lang')?.value;
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';
  const currentLang = game.supported_languages.includes(userLang || browserLang) ? (userLang || browserLang) : game.default_lang;

  // Create map by game_field_id for entity values processing
  const gameFieldsMap = new Map((fields || [])?.map(f => [f.game_field_id, f]));

  const processedEntities = (entities || []).map((entity: any) => {
    const defaultSkin = entity.entity_skins?.[0];
    const skinIconPath = defaultSkin?.entity_images?.find((img: any) => img.type === 'icon')?.image_path;
    const iconPath = entity.icon_path || skinIconPath;
    
    let publicIconUrl = "";
    if (iconPath) {
      publicIconUrl = iconPath.startsWith("http") ? iconPath : supabase.storage.from("games").getPublicUrl(iconPath).data.publicUrl;
    }

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};

    entity.entity_field_values?.forEach((val: any) => {
      const field = gameFieldsMap.get(val.game_field_id);
      if (!field) return;
      const fieldId = field.id;

      if (!allValues[fieldId]) allValues[fieldId] = [];
      if (val.option_id) allValues[fieldId].push(val.option_id);
      else {
        const translated = getTranslatedField(val.value_text, currentLang, game.default_lang);
        if (translated) {
          if (field?.is_multi) allValues[fieldId].push(...translated.split(',').filter(Boolean).map(p => p.trim()));
          else allValues[fieldId].push(translated);
        }
      }
      if (val.field_options) {
        fieldValuesMap[fieldId] = {
          color: val.field_options.color || undefined,
          iconUrl: val.field_options.icon_path ? supabase.storage.from("games").getPublicUrl(val.field_options.icon_path).data.publicUrl : undefined,
        };
      }
    });

    return { ...entity, publicIconUrl, fieldValuesMap, allValues };
  });

  const filterFieldIds = displaySettings?.filter_field_ids || [];
  const filterFields = (fields || [])
    .filter((f) => filterFieldIds.includes(f.id))
    .map((f) => ({
      id: String(f.id),
      key: f.key,
      options: (f.field_options || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((opt: any) => ({
          id: String(opt.id),
          value_key: opt.value_key,
          iconUrl: opt.icon_path ? supabase.storage.from("games").getPublicUrl(opt.icon_path).data.publicUrl : undefined,
          color: opt.color,
        })),
    }));

  const gameCoverUrl = game.cover_url ? supabase.storage.from("games").getPublicUrl(game.cover_url).data.publicUrl : null;

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
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 p-4 shadow-2xl flex items-center justify-center" style={{ backgroundColor: section.color || 'transparent' }}>
                  <img src={supabase.storage.from("games").getPublicUrl(section.icon_path).data.publicUrl} className="w-full h-full object-contain filter grayscale invert brightness-200" alt="" />
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
