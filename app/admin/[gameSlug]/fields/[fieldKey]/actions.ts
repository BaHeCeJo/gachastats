'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function sanitizeFileName(s: string) {
  return s.replace(/[^\w\-\.]/g, '-').toLowerCase()
}

export async function createFieldOptionAction(
  gameId: string,
  fieldKey: string,
  formData: FormData,
  gameSlug: string
) {
  const supabase = await createClient()

  const label = formData.get('label')?.toString()
  const valueKey = formData.get('value_key')?.toString() ?? label
  const color = formData.get('color')?.toString()
  const file = formData.get('icon') as File | null

  if (!label) {
    throw new Error('Label is required')
  }

  let iconPath: string | undefined

  if (file && file.size > 0) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const sanitized = sanitizeFileName(valueKey || label)
    iconPath = `field-icons/${gameId}/${fieldKey}/${sanitized}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('field-icons')
      .upload(iconPath, file, { upsert: true })

    if (uploadError) {
      throw uploadError
    }
  }

  const { error } = await supabase
    .from('game_field_options')
    .insert({
      game_id: gameId,
      field_key: fieldKey,
      value_key: valueKey,
      display_name: label,
      color,
      icon_path: iconPath,
    })

  if (error) throw error

  redirect(`/admin/${gameSlug}/fields/${fieldKey}`)
}

export async function deleteFieldOptionAction(
  optionId: string,
  gameSlug: string,
  fieldKey: string
) {
  const supabase = await createClient()

  // Fetch the option so we can remove stored file
  const { data: option } = await supabase
    .from('game_field_options')
    .select('icon_path')
    .eq('id', optionId)
    .single()

  if (option?.icon_path) {
    await supabase.storage.from('field-icons').remove([option.icon_path])
  }

  const { error } = await supabase
    .from('game_field_options')
    .delete()
    .eq('id', optionId)

  if (error) throw error

  redirect(`/admin/${gameSlug}/fields/${fieldKey}`)
}
