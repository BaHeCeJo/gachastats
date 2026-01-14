'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createElementAction(
  gameId: string,
  formData: FormData
) {
  const supabase = await createClient()

  const name = formData.get('name')?.toString()
  const color = formData.get('color')?.toString()

  if (!name) return

  await supabase
    .from('elements')
    .insert({ game_id: gameId, name, color })

  redirect('back')
}

export async function deleteElementAction(
  id: string,
  gameSlug: string
) {
  const supabase = await createClient()

  await supabase
    .from('elements')
    .delete()
    .eq('id', id)

  redirect(`/admin/${gameSlug}/elements`)
}
