'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateCharacterAction(
  characterId: string,
  gameSlug: string,
  formData: FormData
) {
  const supabase = await createClient()

  const name = formData.get('name')?.toString().trim()
  if (!name) throw new Error('Name is required')

  // Update base character
  await supabase
    .from('characters')
    .update({ name })
    .eq('id', characterId)

  // Load enabled fields
  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key, required')
    .eq('enabled', true)

  // Load valid options
  const { data: options } = await supabase
    .from('game_field_options')
    .select('id, field_key')

  const valid = new Map(options?.map(o => [o.id, o.field_key]))

  // Clear previous values
  await supabase
    .from('character_field_values')
    .delete()
    .eq('character_id', characterId)

  // Reinsert
  for (const f of fields ?? []) {
    const value = formData.get(`${f.field_key}_option`)?.toString() || null

    if (f.required && !value) {
      throw new Error(`Missing ${f.field_key}`)
    }

    if (value) {
      if (valid.get(value) !== f.field_key) {
        throw new Error(`Invalid value for ${f.field_key}`)
      }

      await supabase.from('character_field_values').insert({
        character_id: characterId,
        field_key: f.field_key,
        option_id: value,
      })
    }
  }

  redirect(`/admin/${gameSlug}/characters/${characterId}/edit`)
}

export async function deleteCharacterAction(
  characterId: string,
  gameSlug: string
) {
  const supabase = await createClient()

  // Delete images first (storage safety)
  const { data: images } = await supabase
    .from('image_assets')
    .select('image_path')
    .eq('owner_type', 'character')
    .eq('owner_id', characterId)

  if (images?.length) {
    await supabase.storage
      .from('game-assets')
      .remove(images.map(i => i.image_path))
  }

  // DB cleanup
  await supabase.from('image_assets').delete().eq('owner_id', characterId)
  await supabase.from('character_field_values').delete().eq('character_id', characterId)
  await supabase.from('characters').delete().eq('id', characterId)

  redirect(`/admin/${gameSlug}/characters`)
}
