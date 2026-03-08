// lib/utils/slugify.ts
import { createClient } from '@/lib/supabase/server'

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Convert non-alphanumeric chars to dashes
    .replace(/^-+/, '')          // Remove leading dashes (safe)
    // eslint-disable-next-line sonarjs/slow-regex
    .replace(/-+$/, '');         // Remove trailing dashes (safe)
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
