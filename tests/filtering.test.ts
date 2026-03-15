import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useEntityFiltering } from '../lib/hooks/useEntityFiltering'
import { LocalizedString } from '@/lib/localization'

// Mock localization
vi.mock('@/lib/localization', () => ({
  getTranslatedField: (name: LocalizedString, lang: string) => {
    const lookup = new Map(Object.entries(name as Record<string, string>));
    return lookup.get(lang) || lookup.get('en') || '';
  },
}))

describe('useEntityFiltering', () => {
  const mockEntities = [
    { id: '1', name: { en: 'Zebra', fr: 'Zèbre' }, allValues: { color: ['black', 'white'] } },
    { id: '2', name: { en: 'Apple', fr: 'Pomme' }, allValues: { color: ['red'] } },
    { id: '3', name: { en: 'Banana', fr: 'Banane' }, allValues: { color: ['yellow'] } },
  ]

  it('filters entities by search term', () => {
    const { result } = renderHook(() => useEntityFiltering(mockEntities, 'en', 'en'))
    
    act(() => {
      result.current.setSearchTerm('ba')
    })

    expect(result.current.filteredEntities).toHaveLength(1)
    expect(result.current.filteredEntities[0].id).toBe('3')
  })

  it('filters entities by active filters', () => {
    const { result } = renderHook(() => useEntityFiltering(mockEntities, 'en', 'en'))
    
    act(() => {
      result.current.toggleFilter('color', 'red')
    })

    expect(result.current.filteredEntities).toHaveLength(1)
    expect(result.current.filteredEntities[0].id).toBe('2')
  })

  it('sorts entities alphabetically by name', () => {
    const { result } = renderHook(() => useEntityFiltering(mockEntities, 'en', 'en'))
    
    // Default sort should be Apple, Banana, Zebra
    expect(result.current.filteredEntities[0].id).toBe('2')
    expect(result.current.filteredEntities[1].id).toBe('3')
    expect(result.current.filteredEntities[2].id).toBe('1')
  })

  it('removes filter when toggled again', () => {
    const { result } = renderHook(() => useEntityFiltering(mockEntities, 'en', 'en'))
    
    act(() => {
      result.current.toggleFilter('color', 'red')
    })
    expect(result.current.filteredEntities).toHaveLength(1)

    act(() => {
      result.current.toggleFilter('color', 'red')
    })
    expect(result.current.filteredEntities).toHaveLength(3)
  })
})
