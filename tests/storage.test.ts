import { describe, it, expect } from 'vitest'
import { extractPathFromUrl } from '../lib/supabase/storage-utils'

describe('Storage Utilities', () => {
  describe('extractPathFromUrl', () => {
    const bucket = 'games'
    const baseUrl = 'https://xyz.supabase.co/storage/v1/object/public/games'

    it('extracts path from valid full URL', () => {
      const url = `${baseUrl}/folder/image.png`
      expect(extractPathFromUrl(url, bucket)).toBe('folder/image.png')
    })

    it('returns original string if it is already a relative path', () => {
      const path = 'folder/image.png'
      expect(extractPathFromUrl(path, bucket)).toBe(path)
    })

    it('returns empty string for invalid URL or bucket mismatch', () => {
      expect(extractPathFromUrl('https://google.com', bucket)).toBe('')
      expect(extractPathFromUrl('', bucket)).toBe('')
    })

    it('handles URLs with multiple occurrences of bucket name', () => {
      const url = `https://xyz.supabase.co/storage/v1/object/public/${bucket}/sub/${bucket}/img.png`
      expect(extractPathFromUrl(url, bucket)).toBe(`sub/${bucket}/img.png`)
    })
  })
})
