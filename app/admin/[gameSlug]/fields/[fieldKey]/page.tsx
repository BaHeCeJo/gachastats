import ImageInput from '@/app/components/ImageInput'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createFieldOptionAction, deleteFieldOptionAction } from './actions'

type PageProps = {
  params: Promise<{ gameSlug: string; fieldKey: string }>
}

export default async function FieldOptionsPage({ params }: PageProps) {
  const { gameSlug, fieldKey } = await params
  const supabase = await createClient()

  // fetch game & verify field is enabled (optional)
  const { data: game } = await supabase.from('games').select('*').eq('slug', gameSlug).single()
  if (!game) redirect('/admin')

  const { data: options } = await supabase
    .from('game_field_options')
    .select('*')
    .eq('game_id', game.id)
    .eq('field_key', fieldKey)
    .order('sort_order')

  // compute public URLs for icons
  const optionsWithUrls = (options ?? []).map((opt: any) => {
    const iconUrl = opt.icon_path ? supabase.storage.from('field-icons').getPublicUrl(opt.icon_path).data.publicUrl : null
    return { ...opt, iconUrl }
  })

  return (
    <main className="max-w-xl p-8 space-y-6">
      <h1 className="text-2xl font-bold">
        {game.name} — Manage {fieldKey}
      </h1>

      <ul className="space-y-2">
        {optionsWithUrls.map((opt: any) => (
          <li key={opt.id} className="flex items-center justify-between border p-2 rounded">
            <div className="flex items-center gap-3">
              {opt.iconUrl ? (
                <img src={opt.iconUrl} className="w-8 h-8 rounded" alt={opt.display_name} />
              ) : (
                <div className="w-8 h-8 rounded bg-gray-200" />
              )}
              <div>
                <div className="font-medium">{opt.display_name}</div>
                <div className="text-sm text-gray-500">{opt.value_key}</div>
              </div>
            </div>

            <form action={deleteFieldOptionAction.bind(null, opt.id, gameSlug, fieldKey)}>
              <button className="text-red-600">Delete</button>
            </form>
          </li>
        ))}
      </ul>

      <form action={createFieldOptionAction.bind(null, game.id, fieldKey, new FormData())} encType="multipart/form-data" className="border rounded p-4 space-y-3">
        {/* Note: Next.js server actions require binding values; we'll rely on the bound arguments in actions.ts */}
        <div>
          <label className="block mb-1">Value key (slug)</label>
          <input name="value_key" className="border p-2 w-full" placeholder="fire" />
        </div>

        <div>
          <label className="block mb-1">Display name</label>
          <input name="label" className="border p-2 w-full" placeholder="Fire" required />
        </div>

        <div>
          <label className="block mb-1">Color</label>
          <input type="color" name="color" defaultValue="#ffffff" />
        </div>

        <div>
          <label className="block mb-1">Icon</label>
          <ImageInput name="icon" initialUrl={null} />
        </div>

        <button className="bg-green-600 text-white px-4 py-2">Add option</button>
      </form>
    </main>
  )
}
