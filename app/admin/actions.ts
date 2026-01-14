'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function addGameAction(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name')?.toString()
  const description = formData.get('description')?.toString()

  if (!name) return

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const { data, error } = await supabase
    .from('games')
    .insert({ name, slug, description })
    .select()
    .single()

  if (error) {
    console.error('ADD GAME ERROR:', error)
    throw new Error(error.message)
  }

  redirect(`/admin/${data.slug}`)
}
