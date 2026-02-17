import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{ gameSlug: string; sectionId: string }>
}

/* ===========================
   Server Action — Create Field
=========================== */
export async function createFieldAction(
  gameSlug: string,
  sectionId: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const display_name = (formData.get('display_name') as string)?.trim()
  const key = (formData.get('key') as string)?.trim()
  const order_index = Number(formData.get('order_index') || 0)

  const required = formData.get('required') === 'on'
  const manual_fill = formData.get('manual_fill') === 'on'
  const is_multi = formData.get('is_multi') === 'on'
  const has_icon = formData.get('has_icon') === 'on'
  const has_color = formData.get('has_color') === 'on'

  if (!display_name || !key) {
    throw new Error('Missing required fields')
  }

  const { error } = await supabase.from('section_fields').insert({
    section_id: sectionId,
    key,
    display_name,
    required,
    manual_fill,
    is_multi,
    has_icon,
    has_color,
    order_index
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`)
}

/* ===========================
   Page — New Field
=========================== */
export default async function NewFieldPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  const supabase = await createClient()

  const { data: section } = await supabase
    .from('game_sections')
    .select('id, display_name')
    .eq('id', sectionId)
    .single()

  if (!section) {
    redirect(`/admin/games/${gameSlug}/sections`)
  }

  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {section.display_name} — Add Field
      </h1>

      <form
        action={createFieldAction.bind(null, gameSlug, sectionId)}
        className="space-y-4"
      >
        <input
          name="display_name"
          placeholder="Display name (Element, Tags, Class)"
          className="border p-2 w-full"
          required
        />

        <input
          name="key"
          placeholder="Unique key (element, tags, class)"
          className="border p-2 w-full"
          required
        />

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="manual_fill" />
            Manual input (free text)
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_multi" />
            Multiple values allowed
          </label>
        </div>

        <div className="flex gap-6 items-center">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="required" />
            Required
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" name="has_icon" />
            Has icon
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" name="has_color" />
            Has color
          </label>
        </div>

        <input
          name="order_index"
          type="number"
          defaultValue={0}
          className="border p-2 w-24"
        />

        <button className="bg-indigo-600 text-white px-4 py-2 rounded">
          Create Field
        </button>
      </form>
    </main>
  )
}
