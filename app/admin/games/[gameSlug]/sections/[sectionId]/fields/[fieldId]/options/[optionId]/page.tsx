import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ImageInput from '@/app/components/ImageInput'

type PageProps = {
  params: Promise<{
    gameSlug: string
    sectionId: string
    fieldId: string
    optionId: string
  }>
}

/* ===========================
   Server Actions
=========================== */
export async function updateOptionAction(
  gameSlug: string,
  sectionId: string,
  fieldId: string,
  optionId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const value_key = (formData.get('value_key') as string)?.trim()
  const display_name = (formData.get('display_name') as string)?.trim()
  const color = (formData.get('color') as string) || null
  const icon = formData.get('icon') as File | null

  if (!value_key || !display_name) {
    throw new Error('Missing required fields')
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

  const { error } = await supabase
    .from('field_options')
    .update({
      value_key,
      display_name,
      color,
      ...(icon_path ? { icon_path } : {})
    })
    .eq('id', optionId)

  if (error) throw new Error(error.message)

  redirect(
    `/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`
  )
}

export async function deleteOptionAction(
  gameSlug: string,
  sectionId: string,
  fieldId: string,
  optionId: string
) {
  'use server'

  const supabase = await createClient()

  await supabase.from('field_options').delete().eq('id', optionId)

  redirect(
    `/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`
  )
}

/* ===========================
   Page
=========================== */
export default async function EditOptionPage({ params }: PageProps) {
  const { gameSlug, sectionId, fieldId, optionId } = await params
  const supabase = await createClient()

  const { data: option } = await supabase
    .from('field_options')
    .select('*')
    .eq('id', optionId)
    .single()

  if (!option) {
    redirect(
      `/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`
    )
  }

  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">Edit Option</h1>

      <form
        action={updateOptionAction.bind(
          null,
          gameSlug,
          sectionId,
          fieldId,
          optionId
        )}
        className="space-y-4"
        encType="multipart/form-data"
      >
        <input
          name="value_key"
          defaultValue={option.value_key}
          className="border p-2 w-full"
          required
        />

        <input
          name="display_name"
          defaultValue={option.display_name}
          className="border p-2 w-full"
          required
        />

        <input
          name="color"
          type="color"
          defaultValue={option.color ?? '#ffffff'}
          className="border p-2 w-full"
        />

        <div>
          <label className="block mb-1">Icon</label>
          <ImageInput name="icon" />
        </div>

        <div className="flex justify-between pt-4">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded">
            Save
          </button>

          <button
            formAction={deleteOptionAction.bind(
              null,
              gameSlug,
              sectionId,
              fieldId,
              optionId
            )}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </form>
    </main>
  )
}
