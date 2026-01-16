import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createCharacterAction } from './actions'

type PageProps = {
  params: Promise<{ gameSlug: string }>
}

export default async function NewCharacterPage({ params }: PageProps) {
  const { gameSlug } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin')

  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key, display_name, required')
    .eq('game_id', game.id)
    .eq('enabled', true)
    .order('field_key')

  const fieldsArr = (fields ?? []).filter(f => f.field_key !== 'name')

  const { data: options } = await supabase
    .from('game_field_options')
    .select('*')
    .eq('game_id', game.id)

  const optsByField: Record<string, any[]> = {}
  ;(options ?? []).forEach(o => {
    optsByField[o.field_key] ??= []
    optsByField[o.field_key].push(o)
  })

  const missingRequired = fieldsArr.some(
    f => f.required && !(optsByField[f.field_key]?.length)
  )

  return (
    <main className="max-w-2xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">New character — {game.name}</h1>

      <form
        action={createCharacterAction.bind(null, game.id, game.slug)}
        className="space-y-4"
      >
        <input
          name="name"
          required
          className="border p-2 w-full"
          placeholder="Character name"
        />

        {fieldsArr.map(f => {
          const opts = optsByField[f.field_key] ?? []

          if (!f.required && opts.length === 1) return null

          return (
            <select
              key={f.field_key}
              name={`${f.field_key}_option`}
              required={f.required}
              className="border p-2 w-full"
            >
              {!f.required && <option value="">— none —</option>}
              {opts.map(o => (
                <option key={o.id} value={o.id}>
                  {o.display_name}
                </option>
              ))}
            </select>
          )
        })}

        <button
          disabled={missingRequired}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Create character
        </button>
      </form>
    </main>
  )
}
