import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import GSBackground from "@/app/components/GSBackground";
import EntityGridManager from "@/app/components/EntityGridManager"; // Reusing the client component for entity display

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>;
};

export default async function SectionDetailPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const { gameSlug, sectionId } = params;
  const supabase = await createClient();

  // Fetch game details
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, name, slug, cover_url")
    .eq("slug", gameSlug)
    .single();

  if (gameError || !game) {
    console.error("Game fetch error:", gameError?.message || "Game not found.");
    redirect("/");
  }

  // Fetch section details
  const { data: section, error: sectionError } = await supabase
    .from("game_sections")
    .select("*")
    .eq("id", sectionId)
    .eq("game_id", game.id)
    .single();

  if (sectionError || !section) {
    console.error("Section fetch error:", sectionError?.message || "Section not found.");
    redirect(`/${gameSlug}`); // Redirect to game page if section not found
  }

  // Fetch fields with options for filtering
  const { data: fields, error: fieldsError } = await supabase
    .from("section_fields")
    .select("*, field_options(*)")
    .eq("section_id", sectionId)
    .order("order_index", { ascending: true });

  if (fieldsError) {
    console.error("Fields fetch error:", fieldsError?.message);
  }

  // Fetch display settings for the section
  const { data: displaySettings, error: displaySettingsError } = await supabase
    .from("section_display_settings")
    .select("*")
    .eq("section_id", sectionId)
    .single();

  if (displaySettingsError) {
    console.error("Display settings fetch error:", displaySettingsError?.message);
  }

  // Fetch entities with their default skin and a single image for the icon, ordered alphabetically
  const { data: entities, error: entitiesError } = await supabase
    .from("section_entities")
    .select(
      `
      *,
      entity_skins (
        is_default,
        entity_images (
          image_path
        )
      ),
      entity_field_values (
        id,
        field_id,
        value_text,
        option_id,
        field_options (
          color,
          icon_path
        )
      )
    `
    )
    .eq("section_id", sectionId)
    .eq("entity_skins.is_default", true)
    .order("name", { ascending: true })
    .limit(1, { foreignTable: "entity_skins.entity_images" });

  if (entitiesError) {
    console.error("Entities fetch error:", entitiesError?.message);
  }

  // Create a map of fields for easy lookup
  const fieldsMap = new Map(fields?.map(f => [f.id, f]));

  // Process entities
  const processedEntities = (entities || []).map((entity) => {
    const skin = entity.entity_skins?.[0];
    const iconPath = skin?.entity_images?.[0]?.image_path;
    let publicIconUrl = "";

    if (iconPath) {
      if (iconPath.startsWith("http")) {
        publicIconUrl = iconPath;
      } else {
        publicIconUrl = supabase.storage.from("games").getPublicUrl(iconPath).data.publicUrl;
      }
    }

    const fieldValuesMap: Record<string, { color?: string; iconUrl?: string }> = {};
    const allValues: Record<string, string[]> = {};

    entity.entity_field_values?.forEach((val: any) => {
      const field = fieldsMap.get(val.field_id);
      if (!allValues[val.field_id]) allValues[val.field_id] = [];
      
      if (field?.is_multi) {
        // Multi-value: parse from value_text
        const raw = val.value_text || "";
        const parts = raw.split(',').filter(Boolean);
        allValues[val.field_id].push(...parts);
      } else {
        // Single value
        const value = val.option_id || val.value_text;
        if (value) allValues[val.field_id].push(String(value));

        const opt = val.field_options;
        if (opt) {
          fieldValuesMap[val.field_id] = {
            color: opt.color,
            iconUrl: opt.icon_path
              ? supabase.storage.from("games").getPublicUrl(opt.icon_path).data.publicUrl
              : undefined,
          };
        }
      }
    });

    return { ...entity, publicIconUrl, fieldValuesMap, allValues };
  });

  // Prepare filter fields data for EntityGridManager
  const filterFieldIds = displaySettings?.filter_field_ids || [];
  const filterFields =
    (fields || [])
      .filter((f) => filterFieldIds.includes(f.id))
      .map((f) => ({
        id: String(f.id),
        key: f.key,
        options: (f.field_options || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((opt) => ({
            id: String(opt.id),
            value_key: opt.value_key,
            iconUrl: opt.icon_path
              ? supabase.storage.from("games").getPublicUrl(opt.icon_path).data.publicUrl
              : undefined,
            color: opt.color,
          })),
      })) || [];

  const gameCoverUrl = game.cover_url
    ? supabase.storage.from("games").getPublicUrl(game.cover_url).data.publicUrl
    : null;

  return (
    <div className="relative flex flex-col min-h-screen bg-zinc-50 dark:bg-black font-sans overflow-x-hidden">
      {/* Dynamic Background Cover (Game Cover) */}
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale blur-md opacity-25 scale-105 transition-all duration-1000 ease-out"
          style={{ backgroundImage: gameCoverUrl ? `url(${gameCoverUrl})` : "none" }}
        />
        <div className="absolute inset-0 bg-zinc-50/60 dark:bg-black/80" />
      </div>

      {/* GS logo as a lower layer for brand presence, hidden if game cover is present */}
      <GSBackground isHidden={!!gameCoverUrl} />
      <Header
        breadcrumbs={[
          { href: "/", label: "Home" },
          { href: `/${gameSlug}`, label: game.name },
          { href: `/${game.slug}/sections/${sectionId}`, label: section.key },
        ]}
      />

      <main className="flex-1 px-8 py-24 z-10 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex items-center gap-6">
            {section.icon_path ? (
              <Image
                src={supabase.storage.from("games").getPublicUrl(section.icon_path).data.publicUrl}
                alt={section.key}
                width={80}
                height={80}
                className="w-20 h-20 object-contain p-2 rounded-full shadow-lg border border-zinc-300 dark:border-zinc-700"
                style={{ backgroundColor: section.color || 'transparent' }}
              />
            ) : (
              <div
                className="w-20 h-20 flex items-center justify-center text-zinc-400 text-3xl border border-zinc-300 dark:border-zinc-700 rounded-full"
                style={{ backgroundColor: section.color || 'transparent' }}
              >
                ?
              </div>
            )}
            <h1 className="text-5xl font-extrabold text-black dark:text-zinc-50 tracking-tight uppercase">
              {section.key}
            </h1>
          </div>

          <EntityGridManager
            entities={processedEntities as any}
            displaySettings={displaySettings}
            filterFields={filterFields}
            gameSlug={gameSlug}
            sectionId={sectionId}
            sectionName={section.key}
          />
        </div>
      </main>
    </div>
  );
}
