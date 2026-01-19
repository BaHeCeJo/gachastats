'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { uploadCharacterImage } from '@/lib/characterImages'

export async function updateCharacterAction(
  characterId: string,
  gameSlug: string,
  formData: FormData
) {
  const supabase = await createClient()

  // 1️⃣ Update name separately
  const name = formData.get('name')?.toString().trim()
  if (!name) throw new Error('Name required')

  await supabase.from('characters').update({ name }).eq('id', characterId)

  // 2️⃣ Fetch editable fields only (exclude 'name' and fields not required)
  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key, required')
    .eq('enabled', true)
    .neq('field_key', 'name') // name handled separately
    .eq('required', true) // optional: only fields marked required in DB

  // 3️⃣ Fetch existing field values
  const { data: existingValues } = await supabase
    .from('character_field_values')
    .select('field_key, option_id')
    .eq('character_id', characterId)

  const valueMap = new Map(existingValues?.map(v => [v.field_key, v.option_id]))

  // 4️⃣ Fetch valid options
  const { data: options } = await supabase
    .from('game_field_options')
    .select('id, field_key')
    .eq('game_id', (await supabase.from('characters').select('game_id').eq('id', characterId).single()).data?.game_id)

  const valid = new Map(options?.map(o => [o.id, o.field_key]))

  // 5️⃣ Insert or update only modified fields
  for (const field of fields ?? []) {
    const newValue = formData.get(`${field.field_key}_option`)?.toString() || null
    const oldValue = valueMap.get(field.field_key) || null

    if (newValue && valid.get(newValue) !== field.field_key) throw new Error(`Invalid option for ${field.field_key}`)

    // Only update if value changed
    if (newValue && newValue !== oldValue) {
      // If old value exists, update instead of inserting duplicate
      if (oldValue) {
        await supabase
          .from('character_field_values')
          .update({ option_id: newValue })
          .eq('character_id', characterId)
          .eq('field_key', field.field_key)
      } else {
        await supabase
          .from('character_field_values')
          .insert({
            character_id: characterId,
            field_key: field.field_key,
            option_id: newValue,
          })
      }
    }
  }

  // 6️⃣ Handle images
  const profile = formData.get('profile_image') as File | null
  const splash = formData.get('splashart_image') as File | null

  if (profile?.size) {
    await uploadCharacterImage({
      characterId,
      file: profile,
      type: 'profile',
      key: 'default',
    })
  }

  if (splash?.size) {
    await uploadCharacterImage({
      characterId,
      file: splash,
      type: 'splashart',
      key: 'default',
    })
  }

  redirect(`/admin/${gameSlug}/characters`)
}

export async function deleteCharacterAction(
  characterId: string,
  gameSlug: string
) {
  const supabase = await createClient()

  /** FETCH IMAGE PATHS */
  const { data: images } = await supabase
    .from('character_images')
    .select('image_path')
    .eq('character_id', characterId)

  /** DELETE STORAGE FILES */
  if (images?.length) {
    await supabase.storage
      .from('character_images')
      .remove(images.map(i => i.image_path))
  }

  /** DELETE DB ROWS */
  await supabase
    .from('character_images')
    .delete()
    .eq('character_id', characterId)

  await supabase
    .from('character_field_values')
    .delete()
    .eq('character_id', characterId)

  await supabase
    .from('characters')
    .delete()
    .eq('id', characterId)

  redirect(`/admin/${gameSlug}/characters`)
}
