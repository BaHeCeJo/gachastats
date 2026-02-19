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

  const key = (formData.get('key') as string)?.trim()
  const category = (formData.get('category') as string)?.trim() || 'General'
  const order_index = Number(formData.get('order_index') || 0)

  const required = formData.get('required') === 'on'
  const manual_fill = formData.get('manual_fill') === 'on'
  const is_multi = formData.get('is_multi') === 'on'
  const has_icon = formData.get('has_icon') === 'on'
  const has_color = formData.get('has_color') === 'on'

  if (!key) {
    throw new Error('Missing required fields')
  }

  const { error } = await supabase.from('section_fields').insert({
    section_id: sectionId,
    key,
    category,
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

  redirect(`/admin/games/${gameSlug}/sections/${sectionId}`)
}

/* ===========================
   Page — New Field
=========================== */
export default async function NewFieldPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  const supabase = await createClient()

  const { data: section } = await supabase
    .from('game_sections')
    .select('id, key')
    .eq('id', sectionId)
    .single()

  if (!section) {
    redirect(`/admin/games/${gameSlug}/sections`)
  }

  // Fetch existing categories for the datalist
  const { data: existingFields } = await supabase
    .from('section_fields')
    .select('category')
    .eq('section_id', sectionId)
  
  const categories = Array.from(new Set(existingFields?.map(f => f.category).filter(Boolean) || []))

  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {section.key} — Add Field
      </h1>

      <form
        action={createFieldAction.bind(null, gameSlug, sectionId)}
        className="space-y-4"
      >
        <input
          name="key"
          placeholder="Display name (Element, Tags, Class)"
          className="border p-2 w-full"
          required
        />

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-400">Category</label>
          <input
            name="category"
            placeholder="Category (e.g. Basic, Combat, Social)"
            className="border p-2 w-full"
            list="category-list"
          />
          <datalist id="category-list">
            {categories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>

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
