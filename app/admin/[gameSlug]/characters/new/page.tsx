import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createCharacterAction } from './actions'
import ImageInputWithPreview from '@/app/admin/components/ImageInputWithPreview'

type Props = {
  params: Promise<{ gameSlug: string }>
}

export default async function NewCharacterPage({ params }: Props) {
  const { gameSlug } = await params
  const supabase = await createClient()

  // Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin')

  // Fetch only enabled, required fields (exclude name)
  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key, display_name, required')
    .eq('game_id', game.id)
    .eq('enabled', true)
    .eq('required', true)
    .neq('field_key', 'name')

  const fieldKeys = fields?.map(f => f.field_key) ?? []

  // Fetch all options for these fields
  const { data: options } = await supabase
    .from('game_field_options')
    .select('id, field_key, display_name')
    .eq('game_id', game.id)
    .in('field_key', fieldKeys)
    .order('sort_order')

  const optsByField: Record<string, any[]> = {}
  options?.forEach(o => {
    optsByField[o.field_key] ??= []
    optsByField[o.field_key].push(o)
  })

  return (
    <main className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">
        New character — {game.name}
      </h1>

      <form
        action={createCharacterAction.bind(null, game.id, game.slug)}
        className="space-y-4"
      >
        {/* NAME */}
        <div>
          <label className="block font-semibold">Name *</label>
          <input
            name="name"
            required
            placeholder="Name"
            className="border p-2 w-full"
          />
        </div>

        {/* ENUM FIELDS */}
        {fields?.map(f => (
          <div key={f.field_key}>
            <label className="block font-semibold">
              {f.display_name} {f.required && '*'}
            </label>
            <select
              name={`${f.field_key}_option`}
              required={f.required}
              className="border p-2 w-full"
            >
              <option value="">—</option>
              {optsByField[f.field_key]?.map(o => (
                <option key={o.id} value={o.id}>
                  {o.display_name}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* IMAGES */}
        <ImageInputWithPreview name="profile_image" label="Profile image" />
        <ImageInputWithPreview name="splashart_image" label="Splashart" />

        <button className="bg-green-600 text-white px-4 py-2 rounded">
          Create
        </button>
      </form>

      <Link href={`/admin/${game.slug}/characters`} className="text-blue-600">
        Back
      </Link>
    </main>
  )
}
