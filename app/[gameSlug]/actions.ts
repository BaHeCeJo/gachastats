'use server'

import { createClient } from '@/lib/supabase/server'
import { CHARACTER_FIELDS } from '@/lib/constants/characterFields'
import { redirect } from 'next/navigation'

export async function updateGameAction(
  gameId: string,
  formData: FormData
) {
  const supabase = await createClient()

  const name = formData.get('name')?.toString()
  const description = formData.get('description')?.toString()

  await supabase
    .from('games')
    .update({ name, description })
    .eq('id', gameId)

  redirect(`/admin`)
}

export async function updateGameFieldsAction(
  gameId: string,
  formData: FormData
) {
  const supabase = await createClient()

  for (const key of CHARACTER_FIELDS) {
    const enabled = formData.get(`enabled_${key}`) === 'on'
    const label = formData.get(`label_${key}`)?.toString()
    const required = formData.get(`required_${key}`) === 'on'

    if (!enabled) {
      await supabase
        .from('game_character_fields')
        .delete()
        .eq('game_id', gameId)
        .eq('field_key', key)
      continue
    }

    await supabase
      .from('game_character_fields')
      .upsert(
        {
          game_id: gameId,
          field_key: key,
          display_name: label || key,
          required,
          enabled: true,
        },
        { onConflict: 'game_id,field_key' }
      )
  }

  redirect(`/admin`)
}
