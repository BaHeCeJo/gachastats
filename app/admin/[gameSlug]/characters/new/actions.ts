'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCharacterAction(
  gameId: string,
  formData: FormData
) {
  const supabase = await createClient()

  const name = formData.get('name')?.toString()
  const element = formData.get('element')?.toString()
  const path = formData.get('path')?.toString()
  const faction = formData.get('faction')?.toString()
  const rarity = formData.get('rarity')?.toString()

  const { data: weaponCategories } = await supabase
    .from('weapons_categories')
    .select('id')
    .eq('game', gameId)

  const weaponCategoryId =
    weaponCategories?.length === 1
      ? weaponCategories[0].id
      : null

  await supabase.from('characters').insert({
    name,
    element,
    path,
    faction,
    rarity,
    game: gameId,
    weapon_category: weaponCategoryId,
  })

  redirect(`/admin/${gameId}/characters`)
}
