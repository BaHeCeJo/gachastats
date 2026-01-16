'use server'

import { createClient } from '@/lib/supabase/server'

export async function uploadCharacterImage(
  characterId: string,
  gameId: string,
  formData: FormData
) {
  const supabase = await createClient()

  const file = formData.get('file') as File
  const imageType = formData.get('image_type')?.toString()
  const label = formData.get('label')?.toString() || null

  if (!file || !imageType) throw new Error('Invalid upload')

  const path = `${gameId}/characters/${characterId}/${crypto.randomUUID()}.webp`

  await supabase.storage
    .from('game-assets')
    .upload(path, file, { upsert: false })

  await supabase.from('image_assets').insert({
    game_id: gameId,
    owner_type: 'character',
    owner_id: characterId,
    image_type: imageType,
    label,
    image_path: path
  })
}
export async function deleteImage(imageId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('image_assets')
    .select('image_path')
    .eq('id', imageId)
    .single()

  if (!data) return

  await supabase.storage
    .from('game-assets')
    .remove([data.image_path])

  await supabase
    .from('image_assets')
    .delete()
    .eq('id', imageId)
}
