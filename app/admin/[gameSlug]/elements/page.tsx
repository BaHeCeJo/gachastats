import { createClient } from '@/lib/supabase/server'
import { createElementAction, deleteElementAction } from './actions'

export default async function ElementsPage({
  params,
}: {
  params: { gameSlug: string }
}) {
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('slug', params.gameSlug)
    .single()

  const { data: elements } = await supabase
    .from('elements')
    .select('*')
    .eq('game_id', game!.id)
    .order('name')

  return (
    <main className="p-8 max-w-xl space-y-4">
      <h1 className="text-xl font-bold">Elements</h1>

      <form
        action={createElementAction.bind(null, game!.id)}
        className="flex gap-2"
      >
        <input
          name="name"
          placeholder="Name"
          className="border p-2 flex-1"
        />
        <input
          name="color"
          placeholder="Color"
          className="border p-2 w-24"
        />
        <button className="bg-green-600 text-white px-3">
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {elements?.map(el => (
          <li
            key={el.id}
            className="border p-2 flex justify-between"
          >
            <span>{el.name}</span>
            <form
              action={deleteElementAction.bind(null, el.id, params.gameSlug)}
            >
              <button className="text-red-600">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
