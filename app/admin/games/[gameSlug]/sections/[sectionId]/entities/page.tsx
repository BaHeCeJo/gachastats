import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}

export default async function EntitiesPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  if (!gameSlug || !sectionId) redirect('/admin/games')

  const supabase = await createClient()

  const { data: section } = await supabase
    .from('game_sections')
    .select('id, key')
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  const { data: entities } = await supabase
    .from('section_entities')
    .select(`
      id,
      name,
      entity_images (
        id,
        type,
        path
      )
    `)
    .eq('section_id', sectionId)
    .order('created_at')

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {section.key} — Entities
        </h1>

        <Link
          href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/new`}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
          prefetch={false}
        >
          Add Entity
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entities?.length ? (
          entities.map(entity => {
            const icon = entity.entity_images?.find(i => i.type === 'icon')

            const iconUrl = icon
              ? supabase.storage
                  .from('games')
                  .getPublicUrl(icon.path).data.publicUrl
              : null

            return (
              <Link
                key={entity.id}
                href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`}
                className="border rounded p-4 flex items-center gap-4 hover:bg-gray-800"
              >
                {iconUrl && (
                  <img
                    src={iconUrl}
                    alt=""
                    className="w-12 h-12 object-cover rounded"
                  />
                )}

                <span className="font-medium">{entity.name}</span>
              </Link>
            )
          })
        ) : (
          <p className="text-gray-400">No entities yet.</p>
        )}
      </div>
    </main>
  )
}
