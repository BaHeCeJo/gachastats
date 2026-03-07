import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import MissingTranslationIndicator from '@/app/components/MissingTranslationIndicator';
import { getGameBySlug, getSectionById, LocalizedString } from '@/lib/supabase/queries';
import AdminHeader from '@/app/admin/components/AdminHeader';

type Field = {
  id: string;
  section_id: string;
  key: LocalizedString; // Localized
  category: string | null;
  order_index: number;
}

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}

/* ===========================
   Server Component — List Fields
=========================== */
export default async function FieldsPage({ params: paramsPromise }: PageProps) {
  const { gameSlug, sectionId } = await paramsPromise;
  const supabase = await createClient();

  // 1. Fetch game (cached)
  const { data: game } = await getGameBySlug(gameSlug);
  if (!game) redirect('/admin/games')

  // 2. Parallelize everything else
  const [sectionRes, fieldsRes, headersList] = await Promise.all([
    getSectionById(sectionId),
    supabase
      .from('section_fields')
      .select('id, key, category, order_index')
      .eq('section_id', sectionId)
      .order('order_index', { ascending: true }),
    headers()
  ]);

  const section = sectionRes.data;
  const fields = fieldsRes.data as Field[] | null;
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  // Group fields by category and sort them
  const groupedFields: Record<string, Field[]> = {}
  if (fields) {
    fields.forEach(field => {
      const cat = field.category || 'General'
      if (!groupedFields[cat]) groupedFields[cat] = []
      groupedFields[cat]!.push(field)
    })
  }

  // Sort categories by the minimum order_index of their fields
  const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
    const minA = Math.min(...groupedFields[a]!.map(f => f.order_index || 0))
    const minB = Math.min(...groupedFields[b]!.map(f => f.order_index || 0))
    if (minA !== minB) return minA - minB
    return a.localeCompare(b)
  })

  return (
    <>
      <AdminHeader params={paramsPromise} />
      <GameLocalizationProvider gameDefaultLang={game.default_lang} gameSupportedLanguages={game.supported_languages}>
        <main className="max-w-3xl p-8 space-y-6 mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {getTranslatedField(section.key, currentLang, game.default_lang)} — {getTranslation('fields', currentLang)}
          </h1>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/new`}
            className="bg-[#22c55e] text-black font-bold px-4 py-2 rounded hover:bg-[#1da34a] transition"
          >
            {getTranslation('createField', currentLang)}
          </Link>
        </div>

        {sortedCategories.length ? (
          <div className="space-y-8">
            {sortedCategories.map(category => (
              <div key={category} className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800 pb-1">
                  {category}
                </h2>
                <ul className="space-y-2">
                  {groupedFields[category]!.map(f => (
                    <li
                      key={f.id}
                      className="border border-zinc-800 p-3 rounded flex justify-between items-center bg-zinc-900/50"
                    >
                      <span className="flex items-center gap-2">
                        {getTranslatedField(f.key, currentLang, game.default_lang)}
                        <MissingTranslationIndicator value={f.key} />
                      </span>

                      <Link
                        href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${f.id}`}
                        className="text-[#22c55e] font-medium hover:underline"
                      >
                        {getTranslation('edit', currentLang)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">{getTranslation('noFields', currentLang)}</p>
        )}
      </main>
    </GameLocalizationProvider>
    </>
  )
}
