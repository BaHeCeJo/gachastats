import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { toggleCollectionEntityAction, updateEntityDupesAction } from '../lib/actions/collection'
import { Mock } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

describe('Collection Actions', () => {
  const mockUser = { id: 'user-123' }
  
  // Use a proper mock type instead of any
  interface MockChain {
    eq: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    select: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
    then?: (onFullfilled: (v: { error: null | string }) => unknown) => unknown;
  }

  const chain: MockChain = {
    eq: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    rpc: vi.fn(),
  }
  
  chain.eq.mockImplementation(() => chain)
  chain.delete.mockImplementation(() => chain)
  chain.update.mockImplementation(() => chain)
  chain.insert.mockImplementation(() => chain)
  chain.select.mockImplementation(() => chain)
  chain.rpc.mockImplementation(() => Promise.resolve({ error: null }))

  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn().mockImplementation(() => chain),
    rpc: chain.rpc
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockResolvedValue(mockSupabase)
    
    // Reset the final chain result for each test
    chain.eq.mockImplementation(() => chain)
    chain.rpc.mockImplementation(() => Promise.resolve({ error: null }))
    
    // Default resolve for the end of a chain
    chain.then = (onFullfilled: (v: { error: null | string }) => unknown) => onFullfilled({ error: null })
  })

  describe('toggleCollectionEntityAction', () => {
    const validId = '12345678-1234-1234-1234-123456789012'

    it('returns error for invalid UUID', async () => {
      const result = await toggleCollectionEntityAction('invalid-id', false)
      expect(result).toEqual({ error: 'Invalid Entity ID format' })
    })

    it('calls delete when isOwned is true', async () => {
      await toggleCollectionEntityAction(validId, true)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_entities')
      expect(chain.delete).toHaveBeenCalled()
      expect(chain.eq).toHaveBeenCalledWith('user_id', mockUser.id)
      expect(chain.eq).toHaveBeenCalledWith('entity_id', validId)
    })

    it('calls rpc when isOwned is false', async () => {
      await toggleCollectionEntityAction(validId, false)
      expect(chain.rpc).toHaveBeenCalledWith('add_entity_to_user', {
        p_user_id: mockUser.id,
        p_entity_id: validId
      })
    })
  })

  describe('updateEntityDupesAction', () => {
    const validId = '12345678-1234-1234-1234-123456789012'

    it('rejects negative dupe counts', async () => {
      const result = await updateEntityDupesAction(validId, -1)
      expect(result).toEqual({ error: 'Invalid duplicate count' })
    })

    it('successfully updates valid counts', async () => {
      const result = await updateEntityDupesAction(validId, 5)
      expect(result).toEqual({ success: true })
      expect(chain.update).toHaveBeenCalledWith({ dupes: 5 })
      expect(chain.eq).toHaveBeenCalledWith('id', validId)
    })
  })
})
