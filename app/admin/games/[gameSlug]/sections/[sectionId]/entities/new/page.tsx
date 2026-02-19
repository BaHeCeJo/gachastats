import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ImageInput from '@/app/components/ImageInput'

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}

export async function createEntityAction(
  gameSlug: string,
  sectionId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()
  const name = (formData.get('name') as string)?.trim()

  if (!name) throw new Error('Entity name is required')

  const iconFiles = formData.getAll('icons') as File[]
  const splashFiles = formData.getAll('splasharts') as File[]

  const { data: entity, error } = await supabase
    .from('section_entities')
    .insert({ section_id: sectionId, name })
    .select()
    .single()

  if (error) throw error

  const images: any[] = []

  for (let i = 0; i < iconFiles.length; i++) {
    const file = iconFiles[i]
    if (!file.size) continue

    const ext = file.name.split('.').pop()
    const path = `entities/${entity.id}/icons/${crypto.randomUUID()}.${ext}`

    await supabase.storage.from('games').upload(path, file, {
      contentType: file.type
    })

    images.push({
      entity_id: entity.id,
      type: 'icon',
      image_path: path
    })
  }

  for (let i = 0; i < splashFiles.length; i++) {
    const file = splashFiles[i]
    if (!file.size) continue

    const ext = file.name.split('.').pop()
    const path = `entities/${entity.id}/splash/${crypto.randomUUID()}.${ext}`

    await supabase.storage.from('games').upload(path, file, {
      contentType: file.type
    })

    images.push({
      entity_id: entity.id,
      type: 'cover',
      image_path: path,
      order_index: i
    })
  }

  if (images.length) {
    await supabase.from('entity_images').insert(images)
  }

  redirect(
    `/admin/games/${gameSlug}/sections/${sectionId}/entities/${entity.id}`
  )
}

export default async function NewEntityPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  if (!gameSlug || !sectionId) redirect('/admin/games')

  const supabase = await createClient()

  const { data: section } = await supabase
    .from('game_sections')
    .select('key')
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {section.key} — Add Entity
      </h1>

      <form
        action={createEntityAction.bind(null, gameSlug, sectionId)}
        encType="multipart/form-data"
        className="space-y-4"
      >
        <input
          name="name"
          placeholder="Entity name"
          className="border p-2 w-full"
          required
        />

        <div>
          <label className="block font-medium mb-1">Icons</label>
          <ImageInput name="icons" multiple />
        </div>

        <div>
          <label className="block font-medium mb-1">
            Splasharts / Skins
          </label>
          <ImageInput name="splasharts" multiple />
        </div>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded">
          Create
        </button>
      </form>
    </main>
  )
}
