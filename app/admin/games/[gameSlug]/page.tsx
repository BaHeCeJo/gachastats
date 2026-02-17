// /admin/games/[gameSlug]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImageInput from '@/app/components/ImageInput'

type PageProps = { params: Promise<{ gameSlug: string }> }

async function updateGame(gameId: string, slug: string, formData: FormData) {
  'use server'

  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || ''
  const cover = formData.get('cover') as File | null

  if (!name) throw new Error('Game name is required')

  let coverPath: string | undefined

  if (cover && cover.size > 0) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(cover.type)) {
      throw new Error('Invalid cover image format')
    }

    const ext = cover.name.split('.').pop()
    coverPath = `${slug}/cover.${ext}`

    await supabase.storage
      .from('games')
      .upload(coverPath, cover, { upsert: true, contentType: cover.type })
  }

  const { error } = await supabase
    .from('games')
    .update({
      name,
      description,
      ...(coverPath ? { cover_url: coverPath } : {})
    })
    .eq('id', gameId)

  if (error) throw new Error(error.message)

  redirect(`/admin/games/${slug}`)
}

export default async function AdminGamePage({ params }: PageProps) {
  const { gameSlug } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin/games')

  const coverUrl = game.cover_url
    ? supabase.storage.from('games').getPublicUrl(game.cover_url).data.publicUrl
    : null

  return (
    <main className="max-w-2xl p-8 space-y-10">
      <h1 className="text-3xl font-bold">{game.name}</h1>

      {/* Game information */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Game information</h2>
        <form
          action={updateGame.bind(null, game.id, game.slug)}
          className="space-y-4"
          encType="multipart/form-data"
        >
          <input
            name="name"
            defaultValue={game.name}
            className="border p-2 w-full"
            required
          />

          <textarea
            name="description"
            defaultValue={game.description ?? ''}
            className="border p-2 w-full"
          />

          <div>
            <label className="block mb-2 font-medium">Cover</label>
            <ImageInput name="cover" initialUrl={coverUrl} />
          </div>

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Save changes
          </button>
        </form>
      </section>

      {/* Sections */}
      <section className="border rounded p-4 space-y-3">
        <h2 className="text-xl font-semibold">Sections</h2>
        <p className="text-sm text-gray-400">
          Define characters, weapons, bangboo, and other entities for this game.
        </p>

        <a
          href={`/admin/games/${game.slug}/sections`}
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Manage sections →
        </a>
      </section>
    </main>
  )
}
