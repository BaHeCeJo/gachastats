import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ gameSlug: string }>
}

export default async function CharactersList({ params }: PageProps) {
  const { gameSlug } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin')

  const { data: chars } = await supabase
    .from('characters')
    .select(`
      id,
      name,
      character_field_values (
        field_key,
        game_field_options:game_field_options!character_field_values_option_id_fkey (
          display_name
        )
      )
    `)
    .eq('game_id', game.id)
    .order('created_at', { ascending: false })

  return (
    <main className="p-8 max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{game.name} — Characters</h1>
        <Link
          href={`/admin/${game.slug}/characters/new`}
          className="bg-green-600 text-white px-3 py-2 rounded"
        >
          New
        </Link>
      </div>

      <ul className="space-y-4">
        {chars?.map(c => (
          <li key={c.id} className="border rounded p-3">
            <div className="font-semibold">{c.name}</div>
            <div className="text-sm text-zinc-600">
              {c.character_field_values
                ?.map(v => `${v.field_key}: ${v.game_field_options?.display_name}`)
                .join(' — ')}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
