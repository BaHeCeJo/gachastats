// /admin/games/new/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImageInput from '@/app/components/ImageInput'
import { generateUniqueSlug } from '@/lib/utils/slugify'

async function createGame(formData: FormData) {
  'use server'

  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || ''
  const cover = formData.get('cover') as File | null

  if (!name) throw new Error('Game name is required')

  const slug = await generateUniqueSlug(supabase, name)

  let coverPath: string | null = null

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

  const { error } = await supabase.from('games').insert({
    name,
    slug,
    description,
    cover_url: coverPath
  })

  if (error) throw new Error(error.message)

  redirect(`/admin/games/${slug}`)
}

export default function NewGamePage() {
  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">Create Game</h1>

      <form
        action={createGame}
        className="space-y-4"
        encType="multipart/form-data"
      >
        <input
          name="name"
          placeholder="Game name"
          className="border p-2 w-full"
          required
        />

        <textarea
          name="description"
          placeholder="Description (optional)"
          className="border p-2 w-full"
        />

        <div>
          <label className="block mb-2 font-medium">Cover</label>
          <ImageInput name="cover" />
        </div>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded">
          Create game
        </button>
      </form>
    </main>
  )
}
