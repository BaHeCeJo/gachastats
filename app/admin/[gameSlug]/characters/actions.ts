'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteCharacterAction(
  characterId: string,
  gameSlug: string
) {
  const supabase = await createClient()

  // 1️⃣ Fetch all images for this character
  const { data: images } = await supabase
    .from('character_images')
    .select('image_path')
    .eq('character_id', characterId)

  // 2️⃣ Remove the files from Supabase storage
  if (images?.length) {
    await supabase.storage
      .from('character_images')   // ✅ correct bucket
      .remove(images.map(i => i.image_path))
  }

  // 3️⃣ Delete DB rows
  await supabase.from('character_images').delete().eq('character_id', characterId)
  await supabase.from('character_field_values').delete().eq('character_id', characterId)
  await supabase.from('characters').delete().eq('id', characterId)

  // 4️⃣ Redirect
  redirect(`/admin/${gameSlug}/characters`)
}
