/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { upsertTeamAction, deleteTeamAction } from '../lib/actions/team'
import { Mock } from 'vitest'
import { updateTag } from 'next/cache'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
}))

describe('Team Actions', () => {
  const mockAdmin = { id: 'admin-123', role: 'admin' }
  const mockUser = { id: 'user-123', role: 'user' }
  
  interface MockChain {
    select: Mock;
    eq: Mock;
    single: Mock;
    insert: Mock;
    update: Mock;
    delete: Mock;
    then: Mock;
  }
  
  const chain: MockChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    then: vi.fn(),
  };

  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.single.mockResolvedValue({ data: mockAdmin })
  chain.insert.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  // To handle the thenable for the end of the chain
  chain.then.mockImplementation((onFullfilled) => {
    return Promise.resolve(onFullfilled({ data: { id: 'new-team-id' }, error: null }))
  })

  const mockSupabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAdmin } }) },
    from: vi.fn().mockReturnValue(chain),
  }

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockResolvedValue(mockSupabase)
    
    // Reset defaults
    chain.single.mockResolvedValue({ data: mockAdmin })
    chain.insert.mockReturnValue(chain)
    chain.update.mockReturnValue(chain)
    chain.delete.mockReturnValue(chain)
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.then.mockImplementation((onFullfilled) => {
        return Promise.resolve(onFullfilled({ data: { id: 'new-team-id' }, error: null }))
    })
  })

  it('fails for non-admin users', async () => {
    chain.single.mockResolvedValue({ data: mockUser })
    const result = await upsertTeamAction('s1', null, 'Team 1', [])
    expect(result).toEqual({ error: 'Unauthorized' })
  })

  it('inserts a new team with members', async () => {
    const slots = [
      { members: [{ type: 'entity' as const, id: 'e1' }] }
    ]
    
    chain.single.mockResolvedValueOnce({ data: mockAdmin }) // isAdmin check
    chain.single.mockResolvedValueOnce({ data: { id: 'new-team-id' } }) // team insert select('id')
    
    const result = await upsertTeamAction('s1', null, 'Team 1', slots)
    
    expect(result.success).toBe(true)
    expect(chain.insert).toHaveBeenCalledWith({
      section_id: 's1',
      name: { en: 'Team 1' }
    })
    expect(updateTag).toHaveBeenCalledWith('entity-teams-e1')
  })

  it('updates an existing team and revalidates old/new members', async () => {
    chain.single.mockResolvedValueOnce({ data: mockAdmin }) // isAdmin check
    
    // For old members check
    chain.then.mockImplementationOnce((onFullfilled) => onFullfilled({ data: [{ entity_id: 'old-e1' }] }))

    const slots = [
      { members: [{ type: 'entity' as const, id: 'new-e1' }] }
    ]

    const result = await upsertTeamAction('s1', 'existing-t1', 'Updated Team', slots)
    
    expect(result.success).toBe(true)
    expect(updateTag).toHaveBeenCalledWith('entity-teams-old-e1')
    expect(updateTag).toHaveBeenCalledWith('entity-teams-new-e1')
  })

  it('deletes a team and revalidates members', async () => {
    chain.single.mockResolvedValueOnce({ data: mockAdmin }) // isAdmin check
    
    // For old members check
    chain.then.mockImplementationOnce((onFullfilled) => onFullfilled({ data: [{ entity_id: 'e1' }] }))

    const result = await deleteTeamAction('t1')
    
    expect(result.success).toBe(true)
    expect(updateTag).toHaveBeenCalledWith('entity-teams-e1')
  })
})
