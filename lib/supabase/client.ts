import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

/**
 * Manual URL construction for Supabase Storage to avoid library overhead in loops.
 * Client-safe version.
 */
export function getPublicUrl(bucket: string, path: string | null, transform?: { width?: number; height?: number; quality?: number; resize?: 'cover' | 'contain' | 'fill' }) {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;

  if (transform) {
    const params = new URLSearchParams();
    if (transform.width) params.set('width', transform.width.toString());
    if (transform.height) params.set('height', transform.height.toString());
    if (transform.quality) params.set('quality', transform.quality.toString());
    if (transform.resize) params.set('resize', transform.resize);
    url += `?${params.toString()}`;
  }

  return url;
}