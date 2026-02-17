import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImageInput from '@/app/components/ImageInput'

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

  const display_name = (formData.get('display_name') as string)?.trim()
  const key = (formData.get('key') as string)?.trim()
  const color = (formData.get('color') as string) || '#ffffff'
  const order_index = Number(formData.get('order_index') || 0)
  const icon = formData.get('icon') as File | null

  if (!display_name || !key) {
    throw new Error('Display name and key are required')
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
      display_name,
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

  // Fetch entities
  const { data: entities } = await supabase
    .from('section_entities')
    .select('*')
    .eq('section_id', sectionId)
    .order('created_at', { ascending: true })

  return (
    <main className="max-w-4xl p-8 space-y-10">
      {/* ================= Section Edit ================= */}
      <section className="space-y-6">
        <h1 className="text-2xl font-bold">Edit Section</h1>

        <form
          action={updateSectionAction.bind(null, gameSlug, sectionId)}
          className="space-y-4"
          encType="multipart/form-data"
        >
          <input
            name="display_name"
            defaultValue={section.display_name}
            className="border p-2 w-full"
            required
          />

          <input
            name="key"
            defaultValue={section.key}
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
            <ImageInput name="icon" />
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
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields`}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Manage Fields
          </Link>
        </div>

        {fields && fields.length > 0 ? (
          <div className="space-y-2">
            {fields.map(field => (
              <Link
                key={field.id}
                href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${field.id}`}
                className="block border rounded p-4 hover:bg-gray-800 transition"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{field.display_name}</span>
                  <span className="text-sm text-gray-400">{field.field_type}</span>
                </div>
              </Link>
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
              const iconUrl = entity.icon_path
                ? supabase.storage.from('games').getPublicUrl(entity.icon_path).data.publicUrl
                : null

              return (
                <Link
                  key={entity.id}
                  href={`/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`}
                  className="block border rounded p-4 hover:bg-gray-800 transition flex items-center gap-4"
                >
                  {iconUrl && <img src={iconUrl} className="w-12 h-12 object-cover rounded" />}
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
