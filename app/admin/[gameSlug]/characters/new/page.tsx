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
    .select('*')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin')

  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key')
    .eq('game_id', game.id)
    .eq('enabled', true)

  const enabled = new Set(fields?.map(f => f.field_key))

  const [elements, paths, factions, rarities] = await Promise.all([
    supabase.from('elements').select('*').eq('game', game.id),
    supabase.from('paths').select('*').eq('game', game.id),
    supabase.from('factions').select('*').eq('game', game.id),
    supabase.from('rarities').select('*').eq('game', game.id),
  ])

  return (
    <main className="max-w-xl p-8 space-y-4">
      <h1 className="text-2xl font-bold">
        New {game.name} Character
      </h1>

      <form
        action={createCharacterAction.bind(null, game.id)}
        className="space-y-4"
      >
        {/* Always required */}
        <input
          name="name"
          placeholder="Character name"
          className="border p-2 w-full"
          required
        />

        {enabled.has('element') && (
          <select name="element" className="border p-2 w-full">
            {elements.data?.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )}

        {enabled.has('path') && (
          <select name="path" className="border p-2 w-full">
            {paths.data?.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {enabled.has('faction') && (
          <select name="faction" className="border p-2 w-full">
            {factions.data?.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}

        {enabled.has('rarity') && (
          <select name="rarity" className="border p-2 w-full">
            {rarities.data?.map(r => (
              <option key={r.id} value={r.id}>
                {r.number}★
              </option>
            ))}
          </select>
        )}

        <button className="bg-green-600 text-white px-4 py-2">
          Create character
        </button>
      </form>
    </main>
  )
}
