import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractPathFromUrl, uploadImage } from '../lib/supabase/storage-utils'
import { createClient } from '@/lib/supabase/server'
import { Mock } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('uuid', () => ({
  v4: () => 'fixed-uuid'
}))

describe('Storage Utils', () => {
  describe('extractPathFromUrl', () => {
    const bucket = 'games'
    const baseUrl = 'https://abc.supabase.co/storage/v1/object/public/games/'

    it('extracts relative path from a full Supabase public URL', () => {
      const url = `${baseUrl}folder/image.png`
      expect(extractPathFromUrl(url, bucket)).toBe('folder/image.png')
    })

    it('returns the same string if it is already a relative path', () => {
      const path = 'folder/image.png'
      expect(extractPathFromUrl(path, bucket)).toBe(path)
    })

    it('returns empty string if the URL does not match the bucket pattern', () => {
      const url = 'https://other.com/image.png'
      expect(extractPathFromUrl(url, bucket)).toBe('')
    })

    it('handles nested paths correctly', () => {
        const url = `${baseUrl}users/123/avatars/pic.jpg`
        expect(extractPathFromUrl(url, bucket)).toBe('users/123/avatars/pic.jpg')
    })
  })

  describe('uploadImage', () => {
    const mockSupabase = {
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({ error: null }),
      }
    }

    beforeEach(() => {
      vi.clearAllMocks();
      (createClient as Mock).mockResolvedValue(mockSupabase)
    })

    it('uploads a file to the correct path', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' })
      const path = await uploadImage(file, 'bucket', 'folder')

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('bucket')
      expect(mockSupabase.storage.upload).toHaveBeenCalledWith(
        'folder/fixed-uuid.png',
        file,
        expect.any(Object)
      )
      expect(path).toBe('folder/fixed-uuid.png')
    })

    it('throws error if upload fails', async () => {
      mockSupabase.storage.upload.mockResolvedValueOnce({ error: { message: 'Fail' } })
      const file = new File([''], 'test.png', { type: 'image/png' })
      
      await expect(uploadImage(file, 'bucket', 'folder')).rejects.toThrow('Failed to upload image: Fail')
    })
  })
})
