'use server'

import { createClient } from '@/lib/supabase/server'
import { CHARACTER_FIELDS } from '@/lib/constants/characterFields'
import { redirect } from 'next/navigation'

function sanitizeFileName(s: string) {
  return s.replace(/[^\w\-\.]/g, '-').toLowerCase()
}

export async function updateGameAction(
  gameId: string,
  slug: string,
  formData: FormData
) {
  const supabase = await createClient()

  const name = formData.get('name')?.toString()
  const description = formData.get('description')?.toString()
  const file = formData.get('cover') as File | null

  let coverPath: string | undefined

  if (file && file.size > 0) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const filename = sanitizeFileName(slug)
    coverPath = `covers/${filename}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('games')
      .upload(coverPath, file, { upsert: true })

    if (uploadError) {
      throw uploadError
    }
  }

  const updatePayload: Record<string, any> = { name, description }
  if (coverPath) updatePayload.cover_url = coverPath

  const { error } = await supabase
    .from('games')
    .update(updatePayload)
    .eq('id', gameId)

  if (error) throw error

  redirect(`/admin/${slug}`)
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
      const { error } = await supabase
        .from('game_character_fields')
        .delete()
        .eq('game_id', gameId)
        .eq('field_key', key)

      if (error) throw error
      continue
    }

    const { error } = await supabase
      .from('game_character_fields')
      .upsert(
        {
          game_id: gameId,
          field_key: key,
          display_name: label || key,
          required,
          enabled: true,
        },
        {
          onConflict: 'game_id,field_key',
        }
      )

    if (error) throw error
  }

  redirect(`/admin`)
}
