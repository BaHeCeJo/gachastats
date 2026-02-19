import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImageInput from '@/app/components/ImageInput'
import { deleteSectionAction } from '@/app/admin/games/actions'
import ConfirmButton from '@/app/components/ConfirmButton'

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}
/* ===========================
   Server Action — Update Section
=========================== */
export async function updateSectionAction(
  gameSlug: string,
  sectionId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const key = (formData.get('key') as string)?.trim()
  const color = (formData.get('color') as string) || '#ffffff'
  const order_index = Number(formData.get('order_index') || 0)
  const icon = formData.get('icon') as File | null

  if (!key) {
    throw new Error('Key is required')
  }

  let iconPath: string | undefined

  if (icon && icon.size > 0) {
    const ext = icon.name.split('.').pop()
    iconPath = `${gameSlug}/sections/${key}/icon.${ext}`

    await supabase.storage
      .from('games')
      .upload(iconPath, icon, {
        upsert: true,
        contentType: icon.type
      })
  }

  const { error } = await supabase
    .from('game_sections')
    .update({
      key,
      color,
      order_index,
      ...(iconPath ? { icon_path: iconPath } : {})
    })
    .eq('id', sectionId)

  if (error) throw new Error(error.message)

  redirect(`/admin/games/${gameSlug}/sections`)
}

/* ===========================
   Server Component — Edit Section + Manage Fields + Manage Entities
=========================== */
export default async function EditSectionPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  const supabase = await createClient()

  // Fetch section
  const { data: section } = await supabase
    .from('game_sections')
    .select('*')
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  // Fetch fields
  const { data: fields } = await supabase
    .from('section_fields')
    .select('*')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true })

  // Group fields by category and sort them
  const groupedFields: Record<string, typeof fields> = {}
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

  // Fetch entities with their default skin and a single image for the icon
  const { data: entities, error: entitiesError } = await supabase
    .from('section_entities')
    .select(`
      *,
      entity_skins (
        is_default,
        entity_images (
          image_path
        )
      )
    `)
    .eq('section_id', sectionId)
    .eq('entity_skins.is_default', true)
    .limit(1, { foreignTable: 'entity_skins.entity_images' })

  // Process entities to create public URLs for icons
  if (entities) {
    for (const entity of entities) {
      const iconPath = entity.entity_skins?.[0]?.entity_images?.[0]?.image_path
      if (iconPath && !iconPath.startsWith('http')) {
        const { data } = supabase.storage.from('games').getPublicUrl(iconPath)
        // A bit of a hack to attach the public URL to the entity object
        ;(entity as any).publicIconUrl = data.publicUrl
      } else if (iconPath) {
        ;(entity as any).publicIconUrl = iconPath
      }
    }
  }

  return (
    <main className="max-w-4xl p-8 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Edit Section</h1>
        <form action={deleteSectionAction.bind(null, sectionId, gameSlug)}>
          <ConfirmButton>Delete Section</ConfirmButton>
        </form>
      </div>
      {/* ================= Section Edit ================= */}
      <section className="space-y-6">

        <form
          action={updateSectionAction.bind(null, gameSlug, sectionId)}
          className="space-y-4"
          encType="multipart/form-data"
        >
          <input
            name="key"
            defaultValue={section.key}
            placeholder="Display name (characters, weapons...)"
            className="border p-2 w-full"
            required
          />

          <div className="flex gap-4 items-center">
            <input
              name="color"
              type="color"
              defaultValue={section.color ?? '#ffffff'}
              className="border w-16 h-10"
            />

            <input
              name="order_index"
              type="number"
              defaultValue={section.order_index ?? 0}
              className="border p-2 w-24"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Icon</label>
            <ImageInput 
              name="icon" 
              initialUrl={section.icon_path ? supabase.storage.from('games').getPublicUrl(section.icon_path).data.publicUrl : null} 
            />
          </div>

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Save Section
          </button>
        </form>
      </section>

      {/* ================= Fields Management ================= */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Fields</h2>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/new`}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Add Field
          </Link>
        </div>

        {sortedCategories.length > 0 ? (
          <div className="space-y-6">
            {sortedCategories.map(category => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800 pb-1">
                  {category}
                </h3>
                <div className="space-y-2">
                  {groupedFields[category]!.map(field => (
                    <Link
                      key={field.id}
                      href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${field.id}`}
                      className="block border rounded p-4 hover:bg-gray-800 transition"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{field.key}</span>
                        <span className="text-sm text-gray-400">{field.field_type}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No fields defined for this section yet.</p>
        )}
      </section>

      {/* ================= Entities Management ================= */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Entities</h2>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/new`}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Add Entity
          </Link>
        </div>

        {entities && entities.length > 0 ? (
          <div className="space-y-2">
            {entities.map(entity => {
              const iconUrl = (entity as any).publicIconUrl;

              return (
                <Link
                  key={entity.id}
                  href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`}
                  className="block border rounded p-4 hover:bg-gray-800 transition flex items-center gap-4"
                >
                  {iconUrl ? (
                    <img src={iconUrl} className="w-12 h-12 object-cover rounded" alt={`${entity.name} icon`} />
                  ) : (
                    <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-400">?</div>
                  )}
                  <span className="font-medium">{entity.name}</span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400">No entities created yet.</p>
        )}
      </section>
    </main>
  )
}
