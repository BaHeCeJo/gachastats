import { createClient } from '@/lib/supabase/server'

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameSlug: string }>
}) {
  const { gameSlug } = await params

  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('slug', gameSlug)
    .single()

  if (!game) {
    return <p>Game not found</p>
  }

  const imageUrl = game.cover_image
    ? supabase.storage
        .from('games')
        .getPublicUrl(game.cover_image).data.publicUrl
    : null

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{game.name}</h1>

      {imageUrl && (
        <img
          src={imageUrl}
          alt={`${game.name} cover`}
          className="mb-6 rounded-lg max-h-[400px] object-cover"
        />
      )}

      {game.description && (
        <p className="text-zinc-700 dark:text-zinc-300">
          {game.description}
        </p>
      )}
    </main>
  )
}
