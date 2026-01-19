'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function sanitize(s: string) {
  return s.replace(/[^\w-]/g, '-').toLowerCase()
}

/* CREATE */

export async function createFieldOptionAction(
  gameId: string,
  gameSlug: string,
  fieldKey: string,
  formData: FormData
) {
  const supabase = await createClient()

  const label = formData.get('label')?.toString()
  if (!label) throw new Error('Label is required')

  const valueKey =
    formData.get('value_key')?.toString() || sanitize(label)

  const color = formData.get('color')?.toString()
  const file = formData.get('icon') as File | null

  let iconPath: string | null = null

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() || 'webp'
    iconPath = `${gameSlug}/${fieldKey}/${valueKey}.${ext}`

    await supabase.storage
      .from('field-icons')
      .upload(iconPath, file, { upsert: true })
  }

  await supabase.from('game_field_options').insert({
    game_id: gameId,
    field_key: fieldKey,
    value_key: valueKey,
    display_name: label,
    color,
    icon_url: iconPath,
  })

  redirect(`/admin/${gameSlug}/fields/${fieldKey}`)
}

/* UPDATE */

export async function updateFieldOptionAction(
  optionId: string,
  gameSlug: string,
  fieldKey: string,
  formData: FormData
) {
  const supabase = await createClient()

  const label = formData.get('label')?.toString()
  if (!label) throw new Error('Label is required')

  const valueKey =
    formData.get('value_key')?.toString() || sanitize(label)

  const color = formData.get('color')?.toString()
  const file = formData.get('icon') as File | null

  let update: Record<string, any> = {
    value_key: valueKey,
    display_name: label,
    color,
  }

  if (file && file.size > 0) {
    const ext = file.name.split('.').pop() || 'webp'
    const iconPath = `${gameSlug}/${fieldKey}/${valueKey}.${ext}`

    await supabase.storage
      .from('field-icons')
      .upload(iconPath, file, { upsert: true })

    update.icon_url = iconPath
  }

  await supabase
    .from('game_field_options')
    .update(update)
    .eq('id', optionId)

  redirect(`/admin/${gameSlug}/fields/${fieldKey}`)
}

/* DELETE */

export async function deleteFieldOptionAction(
  optionId: string,
  gameSlug: string,
  fieldKey: string
) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('game_field_options')
    .select('icon_url')
    .eq('id', optionId)
    .single()

  if (data?.icon_url) {
    await supabase.storage
      .from('field-icons')
      .remove([data.icon_url])
  }

  await supabase
    .from('game_field_options')
    .delete()
    .eq('id', optionId)

  redirect(`/admin/${gameSlug}/fields/${fieldKey}`)
}
