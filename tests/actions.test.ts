import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'

// We need to mock the entire module to access the internal resolveSectionIcon if it were exported, 
// but since it's not, we test the public upsertSectionAction and mock the dependencies it uses.

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('@/lib/supabase/storage-utils', () => ({
  uploadImage: vi.fn().mockResolvedValue('new-path.png'),
  extractPathFromUrl: vi.fn((url) => url.replace('https://mock/', '')),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { upsertSectionAction } from '../app/admin/games/[gameSlug]/sections/actions'
import { Mock } from 'vitest'

describe('Section Actions', () => {
  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin' } } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {} }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(), // Return this for chained eq()
    delete: vi.fn().mockReturnThis(), // Return this for chained eq()
    storage: {
      from: vi.fn().mockReturnThis(),
      remove: vi.fn().mockResolvedValue({}),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockResolvedValue(mockSupabase)
  })

  it('fails if default language key is missing', async () => {
    const formData = new FormData()
    formData.set('key', JSON.stringify({ fr: 'Persos' }))
    const result = await upsertSectionAction('g1', 'game-1', 'en', formData)
    expect(result).toEqual({ error: 'Key for default language is required.' })
  })

  it('successfully inserts a new section', async () => {
    const formData = new FormData()
    formData.set('key', JSON.stringify({ en: 'Characters' }))
    formData.set('color', '#000000')
    formData.set('order_index', '1')
    
    await upsertSectionAction('g1', 'game-1', 'en', formData)
    
    expect(mockSupabase.from).toHaveBeenCalledWith('game_sections')
    expect(mockSupabase.insert).toHaveBeenCalled()
  })

  it('handles existing icon path correctly during update', async () => {
    const formData = new FormData()
    formData.set('id', 's1')
    formData.set('key', JSON.stringify({ en: 'Characters' }))
    formData.set('existing_icon_path', 'old-path.png')
    
    await upsertSectionAction('g1', 'game-1', 'en', formData)
    
    expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
      icon_path: 'old-path.png'
    }))
  })
})
