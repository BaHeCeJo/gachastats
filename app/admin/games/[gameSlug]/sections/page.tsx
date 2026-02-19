import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ gameSlug: string }>
}

export default async function SectionsPage({ params }: PageProps) {
  const { gameSlug } = await params
  if (!gameSlug) redirect('/admin/games')

  const supabase = await createClient()

  // Fetch game (NO slug needed here)
  const { data: game } = await supabase
    .from('games')
    .select('id, name')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin/games')

  // Fetch sections
  const { data: sections } = await supabase
    .from('game_sections')
    .select('*')
    .eq('game_id', game.id)
    .order('order_index', { ascending: true })

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {game.name} — Sections
        </h1>

        {/* ✅ USE gameSlug, NOT game.slug */}
        <Link
          href={`/admin/games/${gameSlug}/sections/new`}
          prefetch={false}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add Section
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections && sections.length > 0 ? (
          sections.map(section => {
            const iconUrl = section.icon_path
              ? supabase.storage
                  .from('games')
                  .getPublicUrl(section.icon_path).data.publicUrl
              : null

            return (
              <Link
                key={section.id}
                href={`/admin/games/${gameSlug}/sections/${section.id}`}
                prefetch={false}
                className="border rounded p-4 hover:bg-gray-800 transition-colors flex items-center gap-4"
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt={section.key}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <span className="font-medium">
                  {section.key}
                </span>
              </Link>
            )
          })
        ) : (
          <p className="text-gray-400">No sections yet.</p>
        )}
      </div>
    </main>
  )
}
