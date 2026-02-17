import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ImageInput from '@/app/components/ImageInput'

type PageProps = {
  params: Promise<{ gameSlug: string }>
}

/* ===========================
   Server Action
=========================== */
export async function createSectionAction(
  gameSlug: string,
  formData: FormData
) {
  'use server'

  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id')
    .eq('slug', gameSlug)
    .single()

  if (!game) {
    throw new Error('Game not found')
  }

  const display_name = (formData.get('display_name') as string)?.trim()
  const key = (formData.get('key') as string)?.trim()
  const color = (formData.get('color') as string) || '#ffffff'
  const order_index = Number(formData.get('order_index') || 0)
  const icon = formData.get('icon') as File | null

  if (!display_name || !key) {
    throw new Error('Missing required fields')
  }

  let iconPath: string | null = null

  if (icon && icon.size > 0) {
    const ext = icon.name.split('.').pop()
    iconPath = `${gameSlug}/sections/${key}/icon.${ext}`

    await supabase.storage
      .from('games')
      .upload(iconPath, icon, {
        upsert: true,
        contentType: icon.type
      })
  }

  const { error } = await supabase.from('game_sections').insert({
    game_id: game.id,
    key,
    display_name,
    color,
    order_index,
    icon_path: iconPath
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/admin/games/${gameSlug}/sections`)
}

/* ===========================
   Server Component
=========================== */
export default async function NewSectionPage({ params }: PageProps) {
  const { gameSlug } = await params

  if (!gameSlug) {
    redirect('/admin/games')
  }

  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, name')
    .eq('slug', gameSlug)
    .single()

  if (!game) {
    redirect('/admin/games')
  }

  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {game.name} — Add Section
      </h1>

      <form
        action={createSectionAction.bind(null, gameSlug)}
        className="space-y-4"
        encType="multipart/form-data"
      >
        <input
          name="display_name"
          placeholder="Display name"
          className="border p-2 w-full"
          required
        />

        <input
          name="key"
          placeholder="Unique key (characters, weapons...)"
          className="border p-2 w-full"
          required
        />

        <div className="flex gap-4">
          <input
            name="color"
            type="color"
            defaultValue="#ffffff"
            className="w-16 h-10 border"
          />

          <input
            name="order_index"
            type="number"
            defaultValue={0}
            className="border p-2 w-24"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium">Icon</label>
          <ImageInput name="icon" />
        </div>

        <button className="bg-indigo-600 text-white px-4 py-2 rounded">
          Create Section
        </button>
      </form>
    </main>
  )
}
