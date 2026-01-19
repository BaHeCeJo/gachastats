import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { deleteCharacterAction } from './actions'

type Props = {
  params: Promise<{ gameSlug: string }>
}

export default async function CharactersList({ params }: Props) {
  const { gameSlug } = await params
  const supabase = await createClient()

  // 1) Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin')

  // 2) Fetch characters
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, created_at')
    .eq('game_id', game.id)
    .order('created_at', { ascending: false })

  // 3) Fetch all profile images for these characters
  const characterIds = characters?.map(c => c.id) ?? []

  const { data: images } = await supabase
    .from('character_images')
    .select('character_id, image_path')
    .in('character_id', characterIds)
    .eq('type', 'profile')
    .eq('key', 'default')

  // 4) Build map for quick lookup
  const profileMap = new Map(images?.map(img => [img.character_id, img.image_path]))

  // Helper to get public URL
  const getImgUrl = (path?: string) =>
    path
      ? supabase.storage.from('character_images').getPublicUrl(path).data.publicUrl
      : undefined

  return (
    <main className="p-8 max-w-3xl space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{game.name} — Characters</h1>

        <Link
          href={`/admin/${game.slug}/characters/new`}
          className="bg-green-600 text-white px-3 py-2 rounded"
        >
          New character
        </Link>
      </header>

      <ul className="space-y-4">
        {characters?.map(c => (
          <li key={c.id} className="border rounded p-4 flex items-center gap-4">
            {/* Profile image */}
            <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border">
              {profileMap.has(c.id) ? (
                <img
                  src={getImgUrl(profileMap.get(c.id))}
                  alt={c.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-xs text-zinc-500">
                  No image
                </div>
              )}
            </div>

            {/* Name and fields */}
            <div className="flex-1 space-y-1">
              <Link
                href={`/admin/${game.slug}/characters/${c.id}/edit`}
                className="font-semibold hover:underline"
              >
                {c.name}
              </Link>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href={`/admin/${game.slug}/characters/${c.id}/edit`}
                className="text-blue-600 text-sm"
              >
                Edit
              </Link>

              <form action={deleteCharacterAction.bind(null, c.id, game.slug)}>
                <button type="submit" className="text-red-600 text-sm">
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
