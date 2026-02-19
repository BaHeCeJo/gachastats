// lib/utils/slugify.ts
import { createClient } from '@/lib/supabase/server'

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // spaces and special chars → dash
    .replace(/^-+|-+$/g, '')     // remove leading/trailing dash
}

export async function generateUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string
) {
  let slug = slugify(base)
  let i = 1

  while (true) {
    const { data } = await supabase
      .from('games')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!data) return slug

    i++
    slug = `${slugify(base)}-${i}`
  }
}
