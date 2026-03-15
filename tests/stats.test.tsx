import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import EntityStatsEditor from '../app/admin/games/[gameSlug]/sections/[sectionId]/entities/components/EntityStatsEditor'

// Mock localization
vi.mock('@/lib/localization', () => ({
  getTranslatedField: vi.fn((name) => name.en || 'Unknown'),
  LocalizedString: {}
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
  getPublicUrl: vi.fn(() => 'mock-url')
}))

describe('EntityStatsEditor', () => {
  const mockSectionStats = [
    { id: 'stat-1', section_id: 'sec-1', key: 'hp', name: { en: 'HP' }, order_index: 0 },
    { id: 'stat-2', section_id: 'sec-1', key: 'atk', name: { en: 'ATK' }, order_index: 1 },
  ]

  it('renders boundary levels when ascension is disabled', () => {
    const section = { has_stats: true, has_ascension: false, max_level: 5 }
    render(
      <EntityStatsEditor 
        section={section} 
        sectionStats={mockSectionStats} 
        sectionAscensions={[]} 
        entityStats={[]} 
        activeLang="en" 
        gameDefaultLang="en" 
        onChange={() => {}} 
      />
    )

    expect(screen.getByText('Lv. 1')).toBeDefined()
    expect(screen.queryByText('Lv. 2')).toBeNull()
    expect(screen.queryByText('Lv. 3')).toBeNull()
    expect(screen.queryByText('Lv. 4')).toBeNull()
    expect(screen.getByText('Lv. 5')).toBeDefined()
  })

  it('renders dual boundaries when ascension is enabled', () => {
    const section = { has_stats: true, has_ascension: true, max_level: 90 }
    const ascensions = [
      { id: 'a1', section_id: 'sec-1', phase_index: 0, min_level: 1, max_level: 20 },
      { id: 'a2', section_id: 'sec-1', phase_index: 1, min_level: 20, max_level: 40 },
    ]
    render(
      <EntityStatsEditor 
        section={section} 
        sectionStats={mockSectionStats} 
        sectionAscensions={ascensions} 
        entityStats={[]} 
        activeLang="en" 
        gameDefaultLang="en" 
        onChange={() => {}} 
      />
    )

    // Should have 4 rows total
    const lv20s = screen.getAllByText(/Lv. 20/)
    expect(lv20s).toHaveLength(2)
    
    expect(screen.getByLabelText('HP Phase 0 Level 20')).toBeDefined()
    expect(screen.getByLabelText('HP Phase 1 Level 20')).toBeDefined()
  })

  it('pre-fills values from entityStats prop including phase_index', () => {
    const section = { has_stats: true, has_ascension: true, max_level: 20 }
    const entityStats = [
      { id: 'v1', entity_id: 'e1', stat_id: 'stat-1', level: 20, phase_index: 0, value: 500 },
      { id: 'v2', entity_id: 'e1', stat_id: 'stat-1', level: 20, phase_index: 1, value: 700 }
    ]
    render(
      <EntityStatsEditor 
        section={section} 
        sectionStats={mockSectionStats} 
        sectionAscensions={[
          { id: 'a1', section_id: 'sec-1', phase_index: 0, min_level: 1, max_level: 20 },
          { id: 'a2', section_id: 'sec-1', phase_index: 1, min_level: 20, max_level: 40 }
        ]} 
        entityStats={entityStats} 
        activeLang="en" 
        gameDefaultLang="en" 
        onChange={() => {}} 
      />
    )

    const inputP0 = screen.getByLabelText('HP Phase 0 Level 20') as HTMLInputElement
    const inputP1 = screen.getByLabelText('HP Phase 1 Level 20') as HTMLInputElement
    expect(inputP0.value).toBe('500')
    expect(inputP1.value).toBe('700')
  })

  it('triggers onChange with correct structure when value is edited', async () => {
    const section = { has_stats: true, has_ascension: false, max_level: 1 }
    const onChange = vi.fn()
    render(
      <EntityStatsEditor 
        section={section} 
        sectionStats={[{ id: 'hp-id', section_id: 's1', key: 'hp', name: { en: 'HP' }, order_index: 0 }]} 
        sectionAscensions={[]} 
        entityStats={[]} 
        activeLang="en" 
        gameDefaultLang="en" 
        onChange={onChange} 
      />
    )

    const input = screen.getByLabelText('HP Phase 0 Level 1')
    const userEvent = (await import('@testing-library/user-event')).default.setup()
    
    await userEvent.type(input, '150')
    
    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ stat_id: 'hp-id', level: 1, value: 150 })
    ]))
  })

    it('returns null if stats are disabled', () => {
    const section = { has_stats: false, has_ascension: false, max_level: 5 }
    const { container } = render(
      <EntityStatsEditor 
        section={section} 
        sectionStats={mockSectionStats} 
        sectionAscensions={[]} 
        entityStats={[]} 
        activeLang="en" 
        gameDefaultLang="en" 
        onChange={() => {}} 
      />
    )
    expect(container.firstChild).toBeNull()
    })
    })

