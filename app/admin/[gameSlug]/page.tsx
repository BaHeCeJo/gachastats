import Link from 'next/link'
import ImageInput from '@/app/components/ImageInput'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CHARACTER_FIELDS } from '@/lib/constants/characterFields'
import { updateGameAction, updateGameFieldsAction } from './actions'

type PageProps = {
  params: Promise<{ gameSlug: string }>
}

export default async function AdminGamePage({ params }: PageProps) {
  const { gameSlug } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin')

  const coverUrl = game.cover_url
    ? supabase.storage.from('games').getPublicUrl(game.cover_url).data.publicUrl
    : null

  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('*')
    .eq('game_id', game.id)

  const fieldMap = Object.fromEntries(
    (fields ?? []).map(f => [f.field_key, f])
  )

  return (
    <main className="max-w-2xl p-8 space-y-10">
      <h1 className="text-2xl font-bold">Configure {game.name}</h1>

      {/* ===================== */}
      {/* Characters management */}
      {/* ===================== */}
      <section className="border rounded p-4 space-y-3">
        <h2 className="text-xl font-semibold">Characters</h2>
        <p className="text-sm text-zinc-600">
          Create, edit, delete and manage characters for this game.
        </p>

        <Link
          href={`/admin/${game.slug}/characters`}
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Manage characters
        </Link>
      </section>

      {/* ===================== */}
      {/* Game metadata */}
      {/* ===================== */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Game information</h2>

        <form
          action={updateGameAction.bind(null, game.id, game.slug)}
          className="space-y-4"
          encType="multipart/form-data"
        >
          <input
            name="name"
            defaultValue={game.name}
            className="border p-2 w-full"
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
            Save game
          </button>
        </form>
      </section>

      {/* ===================== */}
      {/* Character field config */}
      {/* ===================== */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Character fields</h2>

        <form
          action={updateGameFieldsAction.bind(null, game.id)}
          className="space-y-4"
        >
          {CHARACTER_FIELDS.map(key => {
            const field = fieldMap[key]

            return (
              <div key={key} className="border rounded p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`enabled_${key}`}
                    defaultChecked={field?.enabled ?? false}
                  />
                  <span className="font-medium">{key}</span>
                </div>

                <input
                  name={`label_${key}`}
                  defaultValue={field?.display_name ?? ''}
                  placeholder="Display name"
                  className="border p-2 w-full"
                />

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`required_${key}`}
                    defaultChecked={field?.required ?? false}
                  />
                  Required
                </label>

                {field?.enabled && (
                  <Link
                    href={`/admin/${game.slug}/fields/${key}`}
                    className="text-sm text-blue-600 underline inline-block"
                  >
                    Manage {field.display_name ?? key} options
                  </Link>
                )}
              </div>
            )
          })}

          <button className="bg-green-600 text-white px-4 py-2 rounded">
            Save character configuration
          </button>
        </form>
      </section>
    </main>
  )
}
