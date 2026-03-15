import { describe, it, expect, vi, Mock } from 'vitest'
import { generateBreadcrumbs } from '../lib/breadcrumbs'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn()
}))

describe('generateBreadcrumbs', () => {
  it('returns base crumbs when no slug provided', async () => {
    (createClient as Mock).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null })
    })

    const crumbs = await generateBreadcrumbs({})
    expect(crumbs).toHaveLength(2)
    expect(crumbs[0].label).toBe('Admin')
    expect(crumbs[1].label).toBe('Games')
  })

  it('builds full path for an entity', async () => {
    const tableData: Record<string, { name?: string; key?: string; id?: string }> = {
      games: { name: 'Game 1' },
      game_sections: { key: 'Chars' },
      section_entities: { id: 'e1', name: 'Entity 1' }
    };

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({
            data: Object.hasOwn(tableData, table) ? tableData[table as keyof typeof tableData] : null
          })
        }))
      }))
    };
    (createClient as Mock).mockReturnValue(mockSupabase)

    const crumbs = await generateBreadcrumbs({ gameSlug: 'g1', sectionId: 's1', entityId: 'e1' })
    
    // Expect: Admin -> Games -> Game 1 -> Sections -> Chars -> Entities -> Entity 1
    expect(crumbs).toHaveLength(7)
    expect(crumbs[2].label).toBe('Game 1')
    expect(crumbs[4].label).toBe('Chars')
    expect(crumbs[6].label).toBe('Entity 1')
  })
})
