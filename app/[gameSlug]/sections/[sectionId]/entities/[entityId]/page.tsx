import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import { getTranslatedField, LocalizedString, getTranslation } from "@/lib/localization-utils";
import { headers, cookies } from "next/headers";
import { GameLocalizationProvider } from "@/lib/localization";
import CollectionToggle from "@/app/components/CollectionToggle";

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string; entityId: string }>;
};

export async function generateMetadata({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId, entityId } = await paramsPromise;
  const supabase = await createClient();
  
  // Get current language from cookie or header
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = cookieStore.get('user_lang')?.value;
  
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  const preferredLang = userLang || browserLang;

  const { data: game } = await supabase.from("games").select("name, default_lang, supported_languages").eq("slug", gameSlug).single();
  const { data: entity } = await supabase.from("section_entities").select("name").eq("id", entityId).single();

  if (!game || !entity) return { title: 'Entity Not Found' };

  // Note: We don't have readyLanguages here, so we just use the raw currentLang
  const title = getTranslatedField(entity.name, preferredLang, game.default_lang || 'en');
  const gameTitle = getTranslatedField(game.name, preferredLang, game.default_lang || 'en');

  return {
    title: `${title} - ${gameTitle} | GachaStats`,
    openGraph: {
      title: `${title} - ${gameTitle} | GachaStats`,
    },
  };
}

export default async function EntityDetailPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId, entityId } = params;
  const supabase = await createClient();

  // Fetch current user and their ownership status
  const { data: { user } } = await supabase.auth.getUser();
  const { data: userEntity } = user 
    ? await supabase.from("user_entities").select("user_id").eq("user_id", user.id).eq("entity_id", entityId).single()
    : { data: null };

  const isOwned = !!userEntity;

  // Fetch game details first
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url, default_lang, supported_languages")
    .eq("slug", gameSlug)
    .single();

  if (gameError || !game) redirect("/");

  const defaultLang = game.default_lang || 'en';

  // 1. Initiate remaining requests in parallel
  const [sectionRes, settingsRes, entityRes, fieldsRes, valuesRes] = await Promise.all([
    supabase.from("game_sections").select("*").eq("id", sectionId).single(),
    supabase.from("section_display_settings").select("*").eq("section_id", sectionId).single(),
    supabase.from("section_entities").select(`*, entity_skins (id, is_default, name, entity_images (image_path, type))`).eq("id", entityId).single(),
    supabase.from("section_fields").select(`*, field_options (id, value_key, icon_path, color)`).eq("section_id", sectionId).order("order_index", { ascending: true }),
    supabase.from("entity_field_values").select("*").eq("entity_id", entityId)
  ]);

  const { data: section } = sectionRes;
  const { data: displaySettings } = settingsRes;
  const { data: entity } = entityRes;
  const { data: fields } = fieldsRes;
  const { data: entityValues } = valuesRes;

  if (!section || !entity) redirect(`/${gameSlug}`);

  // --- Language Detection ---
  const headersList = await headers();
  const cookieStore = await cookies();
  const userLang = cookieStore.get('user_lang')?.value;
  
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  const preferredLang = userLang || browserLang;

  const currentLang = game.supported_languages.includes(preferredLang) ? preferredLang : defaultLang;

  const filterFieldIds = displaySettings?.filter_field_ids || [];

  // Map values to fields
  const valuesByField = (entityValues || []).reduce((acc: any, val) => {
    if (!acc[val.field_id]) acc[val.field_id] = [];
    acc[val.field_id].push(val);
    return acc;
  }, {});

  // Process Images - Find default skin or fallback to first
  const defaultSkin = entity.entity_skins?.find((skin: any) => skin.is_default) || entity.entity_skins?.[0];
  const iconImage = defaultSkin?.entity_images?.find((img: any) => img.type === 'icon');
  const fullArtImage = defaultSkin?.entity_images?.find((img: any) => img.type === 'splashart');

  const getPublicUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return supabase.storage.from("games").getPublicUrl(path).data.publicUrl;
  };

  const iconUrl = iconImage ? getPublicUrl(iconImage.image_path) : "";
  const fullArtUrl = fullArtImage ? getPublicUrl(fullArtImage.image_path) : "";
  const gameCoverUrl = game.cover_url ? getPublicUrl(game.cover_url) : null;

  // Process Fields
  const processedFields = (fields || []).map(field => {
    const values = valuesByField[field.id] || [];
    let displayValue = "";
    let iconUrl = "";
    let color = "";

    // Helper to get labels from IDs
    const getLabelsFromIds = (ids: string[]) => {
      const uniqueIds = Array.from(new Set(ids));
      return (field.field_options || [])
        .filter((opt: any) => uniqueIds.includes(String(opt.id)))
        .map((opt: any) => getTranslatedField(opt.value_key as any, currentLang, defaultLang));
    };

    if (field.is_multi) {
      if (field.manual_fill) {
        const tags = values.flatMap((v: any) => {
          const translated = getTranslatedField(v.value_text as any, currentLang, defaultLang);
          return translated ? translated.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
        });
        const resolvedLabels = tags.map((tag: string) => {
          const option = (field.field_options || []).find((opt: any) => String(opt.id) === tag);
          if (option) return getTranslatedField(option.value_key as any, currentLang, defaultLang);
          return tag;
        });
        displayValue = resolvedLabels.join(", ");
      } else {
        const optionIds = values.map((v: any) => v.option_id).filter(Boolean).map(String);
        displayValue = getLabelsFromIds(optionIds).join(", ");
      }
    } else {
      const val = values[0];
      if (val?.option_id) {
        const selectedOption = (field.field_options || []).find((opt: any) => String(opt.id) === String(val.option_id));
        if (selectedOption) {
          displayValue = getTranslatedField(selectedOption.value_key as any, currentLang, defaultLang);
          iconUrl = selectedOption.icon_path ? getPublicUrl(selectedOption.icon_path) : "";
          color = selectedOption.color || "";
        }
      } else {
        displayValue = getTranslatedField(val?.value_text as any, currentLang, defaultLang);
      }
    }

    return {
      ...field,
      displayValue,
      iconUrl,
      color,
      isFilter: filterFieldIds.includes(field.id)
    };
  });

  const filterFields = processedFields.filter(f => f.isFilter && f.displayValue);

  const translatedEntityName = getTranslatedField(entity.name as any, currentLang, defaultLang);
  const translatedGameName = getTranslatedField(game.name as any, currentLang, defaultLang);
  const translatedSectionKey = getTranslatedField(section.key as any, currentLang, defaultLang);

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      {/* Dynamic Background Cover */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale blur-md opacity-25 scale-105 transition-all duration-1000 ease-out"
          style={{ backgroundImage: gameCoverUrl ? `url(${gameCoverUrl})` : "none" }}
        />
        <div className="absolute inset-0 bg-zinc-50/60 dark:bg-black/80" />
      </div>

      <GameLocalizationProvider 
        gameDefaultLang={defaultLang} 
        gameSupportedLanguages={game.supported_languages}
      >
        <GSBackground isHidden={!!gameCoverUrl} />
        
        <Header
          breadcrumbs={[
            { href: "/", label: getTranslation('home', currentLang) },
            { href: `/${gameSlug}`, label: translatedGameName },
            { href: `/${gameSlug}/sections/${sectionId}`, label: translatedSectionKey },
            { href: `/${gameSlug}/sections/${sectionId}/entities/${entityId}`, label: translatedEntityName },
          ]}
        />

        <main className="flex-1 px-8 py-24 z-10 relative">
          <div className="max-w-7xl mx-auto space-y-12">
            
            {/* Top Section: Icon, Name, Filters (Left) and Full Art (Right) */}
            <div className="flex flex-col lg:flex-row gap-12 items-start justify-between">
              
              {/* Left Side: Identity & Filters */}
              <div className="flex-1 space-y-8">
                <div className="flex items-center gap-8">
                  {iconUrl ? (
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                      <img src={iconUrl} alt={translatedEntityName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center text-zinc-400 text-4xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-900/10">
                      ?
                    </div>
                  )}
                  <div className="space-y-4">
                    <h1 className="text-6xl font-black text-black dark:text-zinc-50 tracking-tighter uppercase italic">
                      {translatedEntityName}
                    </h1>
                    
                    {/* Collection Toggle */}
                    {user && section.is_collectible && (
                      <div className="pt-2">
                        <CollectionToggle entityId={entityId} initialIsOwned={isOwned} />
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      {filterFields.map(field => (
                        <div 
                          key={field.id}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 dark:bg-zinc-100/10 backdrop-blur-md border border-zinc-200/20 dark:border-white/5 shadow-xl transition-all hover:scale-105"
                        >
                          {field.iconUrl && (
                            <img src={field.iconUrl} alt="" className="w-5 h-5 object-contain" />
                          )}
                          <span className="text-xs font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400">
                            {getTranslatedField(field.key as any, currentLang, defaultLang)}:
                          </span>
                          <span className="text-sm font-black text-black dark:text-white uppercase italic">
                            {field.displayValue}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Full Art */}
              {fullArtUrl && (
                <div className="lg:w-1/2 flex justify-end">
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-[#22c55e]/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <img 
                      src={fullArtUrl} 
                      alt={`${translatedEntityName} ${getTranslation('fullArt', currentLang)}`} 
                      className="relative max-w-full h-auto max-h-[70vh] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Details Block: Two Columns */}
            <div className="mt-20 pt-12 border-t border-zinc-200/20 dark:border-white/5">
              <h2 className="text-2xl font-black uppercase tracking-widest mb-10 italic flex items-center gap-4">
                <span className="w-8 h-1 bg-[#22c55e]" />
                {getTranslation('technicalData', currentLang)}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800/50 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                {/* Name field as requested */}
                <div className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{getTranslation('name', currentLang)}</span>
                  <span className="text-xl font-bold uppercase italic text-black dark:text-white">{translatedEntityName}</span>
                </div>

                {processedFields.map(field => (
                  <div key={field.id} className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1 group hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-[#22c55e] transition-colors">
                      {getTranslatedField(field.key as any, currentLang, defaultLang)}
                    </span>
                    <div className="flex items-center gap-4">
                      {field.iconUrl && (
                        <img src={field.iconUrl} alt="" className="w-12 h-12 object-contain" />
                      )}
                      <span className="text-xl font-bold uppercase italic text-black dark:text-white">
                        {field.displayValue || "—"}
                      </span>
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
