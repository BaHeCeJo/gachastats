'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { uploadCharacterImage } from '@/lib/characterImages'

export async function createCharacterAction(
  gameId: string,
  gameSlug: string,
  formData: FormData
) {
  const supabase = await createClient()

  // 1) Name (direct text input)
  const name = formData.get('name')?.toString().trim()
  if (!name) throw new Error('Name required')

  // 2) Create character row
  const { data: inserted, error: insertError } = await supabase
    .from('characters')
    .insert({ game_id: gameId, name })
    .select('id')
    .single()

  if (insertError || !inserted) throw insertError ?? new Error('Insert failed')
  const characterId = inserted.id

  // 3) Fetch editable fields (required=true) — exclude 'name'
  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key, required')
    .eq('game_id', gameId)
    .eq('enabled', true)
    .eq('required', true)
    .neq('field_key', 'name')

  // 4) Fetch options to validate membership
  const { data: options } = await supabase
    .from('game_field_options')
    .select('id, field_key')
    .eq('game_id', gameId)

  const validOptions = new Map(options?.map(o => [o.id, o.field_key]))

  // 5) Insert values only for the fields the form provided
  for (const field of fields ?? []) {
    const value = formData.get(`${field.field_key}_option`)?.toString() || null

    // If a field is required and not provided, fail
    if (field.required && !value) {
      throw new Error(`Missing ${field.field_key}`)
    }

    // If provided, validate it belongs to the field
    if (value && validOptions.get(value) !== field.field_key) {
      throw new Error('Invalid option')
    }

    if (value) {
      await supabase.from('character_field_values').insert({
        character_id: characterId,
        field_key: field.field_key,
        option_id: value,
      })
    }
  }

  // 6) Images (optional)
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

  // 7) Done
  redirect(`/admin/${gameSlug}/characters`)
}