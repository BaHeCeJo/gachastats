import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string; entityId: string }>;
};

export default async function EntityDetailPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId, entityId } = params;
  const supabase = await createClient();

  // Fetch game details
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url")
    .eq("slug", gameSlug)
    .single();

  if (gameError || !game) redirect("/");

  // Fetch section details
  const { data: section, error: sectionError } = await supabase
    .from("game_sections")
    .select("*")
    .eq("id", sectionId)
    .single();

  if (sectionError || !section) redirect(`/${gameSlug}`);

  // Fetch display settings for the section to identify filter fields
  const { data: displaySettings } = await supabase
    .from("section_display_settings")
    .select("*")
    .eq("section_id", sectionId)
    .single();

  const filterFieldIds = displaySettings?.filter_field_ids || [];

  // Fetch entity with its default skin and images
  const { data: entity, error: entityError } = await supabase
    .from("section_entities")
    .select(`
      *,
      entity_skins (
        is_default,
        entity_images (
          image_path,
          type
        )
      )
    `)
    .eq("id", entityId)
    .single();

  if (entityError || !entity) {
    console.error("Entity fetch error:", entityError?.message || "Entity not found");
    redirect(`/${gameSlug}/sections/${sectionId}`);
  }

  // Fetch all fields and their values for this entity
  const { data: fields } = await supabase
    .from("section_fields")
    .select(`
      *,
      field_options (
        id,
        value_key,
        icon_path,
        color
      ),
      entity_field_values (
        value_text,
        option_id
      )
    `)
    .eq("section_id", sectionId)
    .eq("entity_field_values.entity_id", entityId)
    .order("order_index", { ascending: true });

  // Process Images - Find default skin or fallback to first
  const defaultSkin = entity.entity_skins?.find(img => img.is_default) || entity.entity_skins?.[0];
  const iconImage = defaultSkin?.entity_images?.find(img => img.type === 'icon');
  const fullArtImage = defaultSkin?.entity_images?.find(img => img.type === 'splashart');

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
    const values = field.entity_field_values || [];
    let displayValue = "";
    let iconUrl = "";
    let color = "";

    // Helper to get labels from IDs
    const getLabelsFromIds = (ids: string[]) => {
      return field.field_options
        .filter(opt => ids.includes(String(opt.id)))
        .map(opt => opt.value_key);
    };

    if (field.is_multi) {
      // Multi-value: IDs are stored as comma-separated string in value_text
      const rawIds = (values[0]?.value_text || "").split(',').filter(Boolean);
      const labels = getLabelsFromIds(rawIds);
      displayValue = labels.join(", ");
    } else {
      // Single value: check option_id first, then fallback to value_text
      const val = values[0];
      if (val?.option_id) {
        const selectedOption = field.field_options.find(opt => String(opt.id) === String(val.option_id));
        if (selectedOption) {
          displayValue = selectedOption.value_key;
          iconUrl = selectedOption.icon_path ? getPublicUrl(selectedOption.icon_path) : "";
          color = selectedOption.color || "";
        }
      } else {
        displayValue = val?.value_text || "";
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

      <GSBackground isHidden={!!gameCoverUrl} />
      <Header
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: `/${gameSlug}`, label: game.name },
          { href: `/${gameSlug}/sections/${sectionId}`, label: section.key },
          { href: `/${gameSlug}/sections/${sectionId}/entities/${entityId}`, label: entity.name },
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
                    <img src={iconUrl} alt={entity.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center text-zinc-400 text-4xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-900/10">
                    ?
                  </div>
                )}
                <div>
                  <h1 className="text-6xl font-black text-black dark:text-zinc-50 tracking-tighter uppercase italic">
                    {entity.name}
                  </h1>
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
                          {field.key}:
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
                    alt={`${entity.name} full art`} 
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
              Technical Data
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800/50 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl">
              {/* Name field as requested */}
              <div className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Name</span>
                <span className="text-xl font-bold uppercase italic text-black dark:text-white">{entity.name}</span>
              </div>

              {processedFields.map(field => (
                <div key={field.id} className="bg-white dark:bg-zinc-900/40 p-6 flex flex-col gap-1 group hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-[#22c55e] transition-colors">
                    {field.key}
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
    </div>
  );
}
