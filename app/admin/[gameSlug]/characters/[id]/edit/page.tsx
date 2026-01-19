import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { updateCharacterAction, deleteCharacterAction } from './actions'
import ImageInputWithPreview from '@/app/admin/components/ImageInputWithPreview'

type Props = {
  params: Promise<{ gameSlug: string; id: string }>
}

export default async function EditCharacterPage({ params }: Props) {
  const { gameSlug, id } = await params
  const supabase = await createClient()

  // Fetch character
  const { data: character } = await supabase
    .from('characters')
    .select('id, name, game_id')
    .eq('id', id)
    .single()

  if (!character) redirect(`/admin/${gameSlug}/characters`)

  // Fetch only enabled, editable fields (exclude 'name')
  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key, display_name, required')
    .eq('game_id', character.game_id)
    .eq('enabled', true)
    .eq('required', true)
    .neq('field_key', 'name') // exclude name

  // Fetch all options for these fields
  const { data: options } = await supabase
    .from('game_field_options')
    .select('id, field_key, display_name')
    .eq('game_id', character.game_id)
    .order('sort_order')

  // Fetch current values for this character
  const { data: values } = await supabase
    .from('character_field_values')
    .select('field_key, option_id')
    .eq('character_id', id)

  // Fetch images
  const { data: images } = await supabase
    .from('character_images')
    .select('*')
    .eq('character_id', id)

  const imgUrl = (path: string) =>
    supabase.storage.from('character_images').getPublicUrl(path).data.publicUrl

  const optsByField: Record<string, any[]> = {}
  options?.forEach(o => {
    optsByField[o.field_key] ??= []
    optsByField[o.field_key].push(o)
  })

  const valueMap = new Map(values?.map(v => [v.field_key, v.option_id]))
  const imageByType = new Map(images?.map(i => [`${i.type}:${i.key}`, i]))

  return (
    <main className="p-8 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Edit character</h1>

      {/* ===== EDIT FORM ===== */}
      <form
        action={updateCharacterAction.bind(null, id, gameSlug)}
        className="space-y-4" // Removed encType
      >
        {/* NAME (editable directly) */}
        <div>
          <label className="block font-semibold">Name *</label>
          <input
            name="name"
            defaultValue={character.name}
            required
            className="border p-2 w-full"
          />
        </div>

        {/* ENUM FIELDS */}
        {fields?.map(f => (
          <div key={f.field_key}>
            <label className="block font-semibold">
              {f.display_name} {f.required && '*'}
            </label>
            <select
              name={`${f.field_key}_option`}
              defaultValue={valueMap.get(f.field_key) ?? ''}
              required={f.required}
              className="border p-2 w-full"
            >
              <option value="">—</option>
              {optsByField[f.field_key]?.map(o => (
                <option key={o.id} value={o.id}>
                  {o.display_name}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* IMAGES */}
        <ImageInputWithPreview
          name="profile_image"
          label="Profile image"
          initialUrl={imageByType.get('profile:default') ? imgUrl(imageByType.get('profile:default')!.image_path) : undefined}
        />

        <ImageInputWithPreview
          name="splashart_image"
          label="Splashart"
          initialUrl={imageByType.get('splashart:default') ? imgUrl(imageByType.get('splashart:default')!.image_path) : undefined}
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Save
        </button>
      </form>

      {/* ===== DELETE FORM ===== */}
      <form action={deleteCharacterAction.bind(null, id, gameSlug)}>
        <button className="text-red-600">Delete character</button>
      </form>

      <Link href={`/admin/${gameSlug}/characters`} className="text-blue-600">
        Back
      </Link>
    </main>
  )
}
