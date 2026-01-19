import { createClient } from '@/lib/supabase/server'

type UploadArgs = {
  characterId: string
  file: File
  type: string
  key?: string
}

export async function uploadCharacterImage({
  characterId,
  file,
  type,
  key = 'default',
}: UploadArgs) {
  const supabase = await createClient()

  const ext = file.name.split('.').pop()
  if (!ext) throw new Error('Invalid file')

  const path = `characters/${characterId}/${type}/${key}.${ext}`

  /** 1. Upload to storage (overwrite allowed) */
  const { error: uploadError } = await supabase.storage
    .from('character_images')
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) throw uploadError

  /** 2. Upsert DB row */
  const { error: dbError } = await supabase
    .from('character_images')
    .upsert(
      {
        character_id: characterId,
        type,
        key,
        image_path: path,
      },
      {
        onConflict: 'character_id,type,key',
      }
    )

  if (dbError) throw dbError
}

export async function deleteCharacterImages(characterId: string) {
  const supabase = await createClient()

  const { data: images } = await supabase
    .from('character_images')
    .select('image_path')
    .eq('character_id', characterId)

  if (images?.length) {
    await supabase.storage
      .from('character_images')
      .remove(images.map(i => i.image_path))
  }

  await supabase
    .from('character_images')
    .delete()
    .eq('character_id', characterId)
}
