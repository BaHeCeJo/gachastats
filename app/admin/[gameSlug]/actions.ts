'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
    const ext = file.name.split('.').pop()
    coverPath = `covers/${slug}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('games')
      .upload(coverPath, file, {
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }
  }

  const { error } = await supabase
    .from('games')
    .update({
      name,
      description,
      ...(coverPath ? { cover_image: coverPath } : {}),
    })
    .eq('id', gameId)

  if (error) {
    throw error
  }

  redirect(`/admin/${slug}`)
}
