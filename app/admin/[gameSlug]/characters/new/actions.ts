'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCharacterAction(
  gameId: string,
  gameSlug: string,
  formData: FormData
) {
  const supabase = await createClient()

  const name = formData.get('name')?.toString().trim()
  if (!name) throw new Error('Name is required')

  const { data: fields } = await supabase
    .from('game_character_fields')
    .select('field_key, required')
    .eq('game_id', gameId)
    .eq('enabled', true)

  const { data: options } = await supabase
    .from('game_field_options')
    .select('id, field_key')
    .eq('game_id', gameId)

  const optionsByField: Record<string, string[]> = {}
  options?.forEach(o => {
    optionsByField[o.field_key] ??= []
    optionsByField[o.field_key].push(o.id)
  })

  const { data: character } = await supabase
    .from('characters')
    .insert({ game_id: gameId, name })
    .select('id')
    .single()

  if (!character) throw new Error('Creation failed')

  for (const f of fields ?? []) {
    const value =
      formData.get(`${f.field_key}_option`)?.toString() ||
      (!f.required && optionsByField[f.field_key]?.length === 1
        ? optionsByField[f.field_key][0]
        : null)

    if (f.required && !value) {
      throw new Error(`Missing ${f.field_key}`)
    }

    if (value) {
      await supabase.from('character_field_values').insert({
        character_id: character.id,
        field_key: f.field_key,
        option_id: value,
      })
    }
  }

  redirect(`/admin/${gameSlug}/characters/${character.id}/edit`)
}
