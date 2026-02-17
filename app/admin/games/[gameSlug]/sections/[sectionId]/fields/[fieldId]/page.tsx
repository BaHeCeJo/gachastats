import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{
    gameSlug: string
    sectionId: string
    fieldId: string
  }>
}

/* ===========================
   Server Action — Update Field
=========================== */
export async function updateFieldAction(
  gameSlug: string,
  sectionId: string,
  fieldId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const display_name = (formData.get('display_name') as string)?.trim()
  const key = (formData.get('key') as string)?.trim()
  const required = formData.get('required') === 'on'
  const manual_fill = formData.get('manual_fill') === 'on'
  const is_multi = formData.get('is_multi') === 'on'
  const has_icon = formData.get('has_icon') === 'on'
  const has_color = formData.get('has_color') === 'on'
  const order_index = Number(formData.get('order_index') || 0)

  const iconFile = formData.get('icon') as File | null

  if (!display_name || !key) {
    throw new Error('Missing required fields')
  }

  const { error } = await supabase
    .from('section_fields')
    .update({
      display_name,
      key,
      required,
      manual_fill,
      is_multi,
      has_icon,
      has_color,
      order_index
    })
    .eq('id', fieldId)

  if (error) throw new Error(error.message)

  /* ---------- Icon upload ---------- */
  if (iconFile && iconFile.size > 0) {
    const ext = iconFile.name.split('.').pop()
    const path = `fields/${fieldId}/icon.${ext}`

    await supabase.storage
      .from('games')
      .upload(path, iconFile, {
        upsert: true,
        contentType: iconFile.type
      })

    await supabase
      .from('character_images')
      .upsert(
        {
          character_id: null,
          field_id: fieldId,
          type: 'field_icon',
          key: 'icon',
          image_path: path
        },
        { onConflict: 'field_id,type,key' }
      )
  }

  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`)
}

/* ===========================
   Page
=========================== */
export default async function EditFieldPage({ params }: PageProps) {
  const { gameSlug, sectionId, fieldId } = await params
  const supabase = await createClient()

  const { data: field } = await supabase
    .from('section_fields')
    .select('*')
    .eq('id', fieldId)
    .single()

  if (!field) {
    redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`)
  }

  /* ---------- Options eligibility ---------- */
  const canHaveOptions = !field.manual_fill

  return (
    <main className="max-w-xl p-8 space-y-10">
      <h1 className="text-2xl font-bold">Edit Field</h1>

      {/* ================= Field form ================= */}
      <form
        action={updateFieldAction.bind(null, gameSlug, sectionId, fieldId)}
        className="space-y-4"
      >
        <input
          name="display_name"
          defaultValue={field.display_name}
          className="border p-2 w-full"
          required
        />

        <input
          name="key"
          defaultValue={field.key}
          className="border p-2 w-full"
          required
        />

        <div className="flex flex-wrap gap-6">
          <label>
            <input
              type="checkbox"
              name="required"
              defaultChecked={field.required}
            />{' '}
            Required
          </label>

          <label>
            <input
              type="checkbox"
              name="manual_fill"
              defaultChecked={field.manual_fill}
            />{' '}
            Manual fill
          </label>

          <label>
            <input
              type="checkbox"
              name="is_multi"
              defaultChecked={field.is_multi}
            />{' '}
            Allow multiple values
          </label>

          <label>
            <input
              type="checkbox"
              name="has_icon"
              defaultChecked={field.has_icon}
            />{' '}
            Has icon
          </label>

          <label>
            <input
              type="checkbox"
              name="has_color"
              defaultChecked={field.has_color}
            />{' '}
            Has color
          </label>
        </div>

        <input
          name="order_index"
          type="number"
          defaultValue={field.order_index}
          className="border p-2 w-24"
        />

        {field.has_icon && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Field Icon
            </label>
            <input type="file" name="icon" accept="image/*" />
          </div>
        )}

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Save Field
        </button>
      </form>

      {/* ================= Options access ================= */}
      {canHaveOptions && (
        <section className="border-t pt-6 space-y-3">
          <h2 className="text-lg font-semibold">Field Options</h2>

          <p className="text-sm text-gray-400">
            Define the allowed values for this field.
          </p>

          <Link
            href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${fieldId}/options`}
            className="inline-block bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Manage Options →
          </Link>
        </section>
      )}
    </main>
  )
}
