import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getGameBySlug, getSectionById } from "@/lib/supabase/queries";
import { getPublicUrl } from "@/lib/supabase/client";
import { redirect } from 'next/navigation'
import { getTranslatedField, getTranslation, LocalizedString } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import AdminHeader from '@/app/admin/components/AdminHeader';
import BulkEntityManager from './BulkEntityManager';

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}

export default async function EntitiesPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise
  if (!gameSlug || !sectionId) redirect('/admin/games')

  const supabase = await createClient()

  // 1. Fetch game (cached)
  const { data: game } = await getGameBySlug(gameSlug);
  if (!game) redirect('/admin/games')

  // 2. Parallelize everything else
  const [sectionRes, entitiesRes, headersList] = await Promise.all([
    getSectionById(sectionId),
    supabase
      .from('section_entities')
      .select(`
        id,
        name,
        icon_path,
        entity_skins (
          is_default,
          entity_images (
            id,
            type,
            image_path
          )
        ),
        entity_field_values (
          id,
          game_field_id,
          option_id,
          value_text
        ),
        entity_stats (
          stat_id,
          level,
          phase_index,
          value
        )
      `)
      .eq('section_id', sectionId)
      .eq('entity_skins.is_default', true)
      .order(`name->>${game.default_lang}`, { ascending: true }),
    headers()
  ]);

  const section = sectionRes.data;

  interface EntityRaw {
    id: string;
    name: LocalizedString;
    icon_path: string | null;
    entity_skins: {
      is_default: boolean;
      entity_images: {
        id: string;
        type: string;
        image_path: string;
      }[];
    }[];
    entity_field_values: {
      id: string;
      game_field_id: string;
      option_id: string | null;
      value_text: string | null;
    }[];
    entity_stats: {
      stat_id: string;
      level: number;
      phase_index: number;
      value: number;
    }[];
  }

  const entitiesRaw = entitiesRes.data as EntityRaw[] | null;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  // We need the mapping of game_field_id -> section_field_id
  const { data: sectionFields } = await supabase.from('section_fields').select('id, game_field_id').eq('section_id', sectionId);
  const gameToSectionFieldMap = new Map(sectionFields?.map(sf => [sf.game_field_id, sf.id]));

  const processedBulkData = (entitiesRaw || []).map(e => {
    return {
      id: e.id,
      name: e.name,
      icon_path: e.icon_path,
      field_values: (e.entity_field_values || []).map((fv) => {
        const field_id = gameToSectionFieldMap.get(fv.game_field_id);
        let values: string[] = [];
        if (fv.option_id) {
          values = [fv.option_id];
        } else if (fv.value_text) {
          values = fv.value_text.split(',');
        }
        return { field_id, values };
      }).filter((fv) => fv.field_id),
      entity_stats: e.entity_stats
    };
  });

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <main className="p-8 space-y-12">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
            {getTranslatedField(section.key, currentLang, game.default_lang)} — {getTranslation('entities', currentLang)}
          </h1>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/new`}
            className="bg-[#22c55e] text-black font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl hover:bg-[#1da34a] transition-all shadow-lg shadow-green-500/20"
            prefetch={false}
          >
            {getTranslation('createEntity', currentLang)}
          </Link>
        </div>

        <section className="space-y-6">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-8 h-[1px] bg-zinc-800" />
                Individual Entities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entitiesRaw?.length ? (
                entitiesRaw.map(entity => {
                const defaultSkin = entity.entity_skins?.find((s) => s.is_default);
                const icon = defaultSkin?.entity_images?.find((i) => i.type === 'icon');
                const iconUrl = icon ? getPublicUrl('games', icon.image_path) : null;

                return (
                    <Link
                    key={entity.id}
                    href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`}
                    className="border rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-800 border-zinc-800 bg-zinc-900/30 transition-all group"
                    >
                    <div className="relative w-14 h-14 flex-shrink-0 bg-black/40 rounded-xl overflow-hidden border border-zinc-800 group-hover:border-green-500/50 transition-all">
                        {iconUrl ? (
                        <Image
                            src={iconUrl}
                            alt={getTranslatedField(entity.name, currentLang, game.default_lang)}
                            fill
                            sizes="56px"
                            className="object-cover"
                        />
                        ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-black italic">?</div>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <span className="font-bold flex items-center gap-2 text-zinc-200">
                            {getTranslatedField(entity.name, currentLang, game.default_lang)}
                            <MissingTranslationIndicator value={entity.name} />
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Manage Details</span>
                    </div>
                    </Link>
                )
                })
            ) : (
                <p className="text-zinc-400">{getTranslation('noEntities', currentLang)}</p>
            )}
            </div>
        </section>

        <section className="space-y-6 pt-10 border-t border-zinc-800/50">
            <h2 className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-8 h-[1px] bg-zinc-800" />
                Bulk Operations
            </h2>
            <BulkEntityManager 
                sectionId={sectionId} 
                gameDefaultLang={game.default_lang} 
                initialEntitiesData={processedBulkData} 
            />
        </section>
      </main>
    </GameLocalizationProvider>
    </>
  )
}
