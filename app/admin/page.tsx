import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { addGameAction } from './actions'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: games } = await supabase
    .from('games')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      {/* Add Game */}
      <form action={addGameAction} className="mb-8 flex flex-col gap-2 max-w-md">
        <input
          name="name"
          placeholder="Game name"
          required
          className="border p-2"
        />
        <textarea
          name="description"
          placeholder="Description"
          className="border p-2"
        />
        <button className="bg-blue-600 text-white p-2">
          Add Game
        </button>
      </form>

      {/* Game list */}
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {games?.map((game) => {
          const imageUrl = game.cover_image
            ? supabase.storage
              .from('games')
              .getPublicUrl(game.cover_image).data.publicUrl
            : null

          return (
            <li
              key={game.id}
              className="border rounded p-3 flex flex-col gap-2"
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={game.name}
                  className="rounded object-cover h-40"
                />
              )}

              <strong>{game.name}</strong>

              <div className="text-sm">
                <a href={`/admin/${game.slug}`} className="text-blue-600">
                  Edit
                </a>{' '}
                |{' '}
                <a href={`/${game.slug}`} className="text-green-600">
                  View
                </a>
              </div>
            </li>
          )
        })}
      </ul>

    </main>
  )
}
