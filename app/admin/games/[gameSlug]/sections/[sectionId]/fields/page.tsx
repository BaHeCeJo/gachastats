import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
  const field_type = formData.get('field_type') as string
  const required = formData.get('required') === 'on'
  const manual_fill = formData.get('manual_fill') === 'on'
  const has_icon = formData.get('has_icon') === 'on'
  const has_color = formData.get('has_color') === 'on'
  const order_index = Number(formData.get('order_index') || 0)

  if (!display_name || !key || !field_type) {
    throw new Error('Missing required fields')
  }

  const { error } = await supabase.from('section_fields').insert({
    section_id: sectionId,
    key,
    display_name,
    field_type,
    required,
    manual_fill,
    has_icon,
    has_color,
    order_index
  })

  if (error) throw new Error(error.message)

  redirect(`/admin/games/${gameSlug}/sections/${sectionId}/fields`)
}

/* ===========================
   Server Component — List Fields
=========================== */
export default async function FieldsPage({ params }: PageProps) {
  const { gameSlug, sectionId } = await params
  const supabase = await createClient()

  const { data: section } = await supabase
    .from('game_sections')
    .select('id, display_name')
    .eq('id', sectionId)
    .single()

  if (!section) redirect(`/admin/games/${gameSlug}/sections`)

  const { data: fields } = await supabase
    .from('section_fields')
    .select('*')
    .eq('section_id', sectionId)
    .order('order_index', { ascending: true })

  return (
    <main className="max-w-3xl p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          {section.display_name} — Fields
        </h1>

        <Link
          href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/new`}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add Field
        </Link>
      </div>

      {fields?.length ? (
        <ul className="space-y-2">
          {fields.map(f => (
            <li
              key={f.id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <span>
                {f.display_name}{' '}
                <span className="text-sm text-gray-400">
                  ({f.field_type})
                </span>
              </span>

              <Link
                href={`/admin/games/${gameSlug}/sections/${sectionId}/fields/${f.id}`}
                className="text-indigo-600"
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400">No fields yet.</p>
      )}
    </main>
  )
}
