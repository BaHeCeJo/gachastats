/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CollectionGridManager from '../app/components/CollectionGridManager'
import userEvent from '@testing-library/user-event'
import { toggleCollectionEntityAction, updateEntityDupesAction } from '../lib/actions/collection'

// Mock localization
vi.mock('@/lib/localization', () => ({
  getTranslatedField: (name: { en?: string }) => name?.en || 'Unknown',
  useLocalizationParams: () => ({
    displayLang: 'en',
    t: (k: string) => k,
    gameSupportedLanguages: ['en'],
    gameDefaultLang: 'en',
  }),
  LocalizedString: {}
}))

// Mock server actions
vi.mock('@/lib/actions/collection', () => ({
  toggleCollectionEntityAction: vi.fn().mockResolvedValue({ success: true }),
  updateEntityDupesAction: vi.fn().mockResolvedValue({ success: true }),
  removeUserEntityAction: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

describe('CollectionGridManager', () => {
  const mockEntities = [
    { 
      id: 'e1', 
      name: { en: 'Entity 1' }, 
      publicIconUrl: '/e1.png', 
      fieldValuesMap: {}, 
      allValues: {} 
    }
  ]
  const mockSection = { 
    id: 's1', 
    is_unique: true, 
    max_dupes: 6, 
    min_dupes: 0, 
    dupe_name: { en: 'Constellation' }, 
    is_collectible: true 
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders entities and handles toggle', async () => {
    const user = userEvent.setup()
    render(
      <CollectionGridManager 
        entities={mockEntities as unknown as any} 
        initialOwnedEntities={[]} 
        section={mockSection as unknown as any} 
        displaySettings={null} 
        filterFields={[]} 
        gameDefaultLang="en" 
        currentLang="en" 
      />
    )

    const card = screen.getByText('Entity 1')
    expect(card).toBeDefined()

    await user.click(card)
    expect(toggleCollectionEntityAction).toHaveBeenCalledWith('e1', false)
  })

  it('shows duplicate slider for unique owned entities', async () => {
    const ownedEntities = [{ id: 'o1', entity_id: 'e1', dupes: 0 }]
    render(
      <CollectionGridManager 
        entities={mockEntities as unknown as any} 
        initialOwnedEntities={ownedEntities as unknown as any} 
        section={mockSection as unknown as any} 
        displaySettings={null} 
        filterFields={[]} 
        gameDefaultLang="en" 
        currentLang="en" 
      />
    )

    expect(screen.getByText('Constellation 0')).toBeDefined()
  })

  it('updates duplicates optimistically', async () => {
    const ownedEntities = [{ id: 'o1', entity_id: 'e1', dupes: 0 }]
    render(
      <CollectionGridManager 
        entities={mockEntities as unknown as any} 
        initialOwnedEntities={ownedEntities as unknown as any} 
        section={mockSection as unknown as any} 
        displaySettings={null} 
        filterFields={[]} 
        gameDefaultLang="en" 
        currentLang="en" 
      />
    )

    const slider = screen.getByRole('slider')
    
    // Using fireEvent for simplicity with ranges in JSDOM
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(slider, { target: { value: '3' } })

    expect(updateEntityDupesAction).toHaveBeenCalledWith('o1', 3)
    // The UI should show the new value (optimistic)
    expect(screen.getByText('Constellation 3')).toBeDefined()
  })
})
