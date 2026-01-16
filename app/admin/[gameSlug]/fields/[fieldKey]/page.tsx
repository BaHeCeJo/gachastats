import ImageInput from '@/app/components/ImageInput'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  createFieldOptionAction,
  updateFieldOptionAction,
  deleteFieldOptionAction,
} from './actions'

type PageProps = {
  params: Promise<{ gameSlug: string; fieldKey: string }>
}

export default async function FieldOptionsPage({ params }: PageProps) {
  const { gameSlug, fieldKey } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('id, name, slug')
    .eq('slug', gameSlug)
    .single()

  if (!game) redirect('/admin')

  const { data: options } = await supabase
    .from('game_field_options')
    .select('*')
    .eq('game_id', game.id)
    .eq('field_key', fieldKey)
    .order('sort_order')

  const optionsWithUrls =
    options?.map((opt) => ({
      ...opt,
      iconUrl: opt.icon_url
        ? supabase.storage
            .from('field-icons')
            .getPublicUrl(opt.icon_url).data.publicUrl
        : null,
    })) ?? []

  return (
    <main className="max-w-2xl p-8 space-y-8">
      <h1 className="text-2xl font-bold">
        {game.name} — Manage field: {fieldKey}
      </h1>

      <ul className="space-y-6">
        {optionsWithUrls.map((opt) => (
          <li key={opt.id} className="border rounded p-4 space-y-4">
            <form
              action={updateFieldOptionAction.bind(
                null,
                opt.id,
                game.slug,
                fieldKey
              )}
              encType="multipart/form-data"
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                {opt.iconUrl ? (
                  <img
                    src={opt.iconUrl}
                    alt={opt.display_name}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-gray-200" />
                )}
                <strong>{opt.display_name}</strong>
              </div>

              <input
                name="value_key"
                defaultValue={opt.value_key}
                className="border p-2 w-full"
              />

              <input
                name="label"
                defaultValue={opt.display_name}
                className="border p-2 w-full"
                required
              />

              <input
                type="color"
                name="color"
                defaultValue={opt.color ?? '#ffffff'}
              />

              <ImageInput name="icon" initialUrl={opt.iconUrl} />

              <button className="bg-blue-600 text-white px-3 py-1 rounded">
                Save
              </button>
            </form>

            <form
              action={deleteFieldOptionAction.bind(
                null,
                opt.id,
                game.slug,
                fieldKey
              )}
            >
              <button className="text-red-600 text-sm">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      <form
        action={createFieldOptionAction.bind(
          null,
          game.id,
          game.slug,
          fieldKey
        )}
        encType="multipart/form-data"
        className="border rounded p-4 space-y-3"
      >
        <h2 className="font-semibold">Add new option</h2>

        <input
          name="value_key"
          className="border p-2 w-full"
          placeholder="fire"
        />

        <input
          name="label"
          className="border p-2 w-full"
          placeholder="Fire"
          required
        />

        <input type="color" name="color" defaultValue="#ffffff" />

        <ImageInput name="icon" />

        <button className="bg-green-600 text-white px-4 py-2 rounded">
          Add option
        </button>
      </form>
    </main>
  )
}
