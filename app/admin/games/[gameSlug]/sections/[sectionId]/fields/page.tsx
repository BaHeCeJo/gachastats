import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LocalizedString, getTranslatedField, getTranslation } from "@/lib/localization-utils";
import { GameLocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";

type Game = {
  id: string;
  name: LocalizedString;
  slug: string;
  default_lang: string;
  supported_languages: string[];
}

type Section = {
  id: string;
  key: LocalizedString;
  game_id: string;
}

type Field = {
  id: string;
  section_id: string;
  key: LocalizedString; // Localized
  category: string | null;
  field_type: string; // Assuming 'text', 'number', 'boolean', 'select' etc.
  order_index: number;
}

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}

/* ===========================
   Server Component — List Fields
=========================== */
export default async function FieldsPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug, default_lang, supported_languages')
    .eq('slug', gameSlug)
    .single<Game>();

  if (!game) redirect('/admin/games')

  const { data: section } = await supabase
    .from('game_sections')
    .select('id, key, game_id')
    .eq('id', sectionId)
    .single<Section>()

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  const { data: fields } = await supabase
    .from('section_fields')
    .select('id, key, category, field_type, order_index') // Select key as LocalizedString
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true }) as { data: Field[] | null };

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

  const headersList = await headers();
  const currentLang = headersList.get('Accept-Language')?.split(',')[0].split('-')[0].toLowerCase() || 'en';


  return (
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
                      className="border p-3 rounded flex justify-between items-center bg-zinc-900/50 border-zinc-800"
                    >
                      <span>
                        {getTranslatedField(f.key, currentLang, game.default_lang)}{' '}
                        {/* <span className="text-sm text-gray-400">
                          ({f.field_type})
                        </span> */}
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
  )
}
