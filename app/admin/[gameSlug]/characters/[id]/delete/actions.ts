'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteCharacterAction(
  characterId: string,
  gameSlug: string
) {
  const supabase = await createClient()

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

  await supabase.from('image_assets').delete().eq('owner_id', characterId)
  await supabase.from('character_field_values').delete().eq('character_id', characterId)
  await supabase.from('characters').delete().eq('id', characterId)

  redirect(`/admin/${gameSlug}/characters`)
}
