import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ImageInput from '@/app/components/ImageInput'

type PageProps = {
  params: Promise<{
    gameSlug: string
    sectionId: string
    fieldId: string
  }>
}

/* ===========================
   Server Action — Create Option
=========================== */
export async function createFieldOptionAction(
  gameSlug: string,
  sectionId: string,
  fieldId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const value_key = (formData.get('value_key') as string)?.trim()
  const color = (formData.get('color') as string) || null
  const icon = formData.get('icon') as File | null

  if (!value_key) {
    throw new Error('Key is required')
  }

  let icon_path: string | null = null

  if (icon && icon.size > 0) {
    const ext = icon.name.split('.').pop()
    icon_path = `fields/${fieldId}/options/${value_key}.${ext}`

    await supabase.storage
      .from('games')
      .upload(icon_path, icon, {
        upsert: true,
        contentType: icon.type
      })
  }

  const { error } = await supabase.from('field_options').insert({
    field_id: fieldId,
    value_key,
    color,
    icon_path
  })

  if (error) throw new Error(error.message)

  redirect(
    `/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`
  )
}

/* ===========================
   Page
=========================== */
export default async function NewFieldOptionPage({ params }: PageProps) {
  const { gameSlug, sectionId, fieldId } = await params

  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">Add Field Option</h1>

      <form
        action={createFieldOptionAction.bind(null, gameSlug, sectionId, fieldId)}
        className="space-y-4"
        encType="multipart/form-data"
      >
        <input
          name="value_key"
          placeholder="Display name (Fire, Ice...)"
          required
          className="border p-2 w-full"
        />

        <input
          name="color"
          type="color"
          className="border p-2 w-full"
        />

        <div>
          <label className="block mb-1">Icon</label>
          <ImageInput name="icon" />
        </div>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded">
          Create option
        </button>
      </form>
    </main>
  )
}
