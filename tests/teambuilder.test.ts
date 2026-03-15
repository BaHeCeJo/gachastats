/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useTeamBuilder } from '../app/components/teambuilder/useTeamBuilder'
import { TeamEntity } from '../app/components/teambuilder/types'

import { LocalizedString } from '@/lib/localization'

// Mock localization
vi.mock('@/lib/localization', () => ({
  getTranslatedField: (name: LocalizedString, lang: string) => name[lang] || name['en'] || '',
}))

describe('useTeamBuilder', () => {
  const mockEntities: TeamEntity[] = [
    { id: '1', name: { en: 'Entity 1' }, icon_path: null },
    { id: '2', name: { en: 'Entity 2' }, icon_path: null },
  ]

  it('initializes with default values', () => {
    const { result } = renderHook(() => useTeamBuilder({
      sectionEntities: mockEntities,
      currentLang: 'en',
      gameDefaultLang: 'en'
    }))

    expect(result.current.isAddingTeam).toBe(false)
    expect(result.current.currentSlots).toEqual([])
  })

  it('starts adding a team and sets initial slots if entity ID provided', () => {
    const { result } = renderHook(() => useTeamBuilder({
      sectionEntities: mockEntities,
      currentLang: 'en',
      gameDefaultLang: 'en',
      currentEntityId: '1'
    }))

    act(() => {
      result.current.handleStartAddTeam()
    })

    expect(result.current.isAddingTeam).toBe(true)
    expect(result.current.currentSlots).toHaveLength(1)
    expect(result.current.currentSlots[0].members[0].id).toBe('1')
  })

  it('adds a member to a slot', () => {
    const { result } = renderHook(() => useTeamBuilder({
      sectionEntities: mockEntities,
      currentLang: 'en',
      gameDefaultLang: 'en'
    }))

    act(() => {
      result.current.handleStartAddTeam()
      result.current.openSelection(0)
    })

    const newMember = { type: 'entity' as const, id: '2', name: 'Entity 2', icon_path: null }
    act(() => {
      result.current.addMemberToSlot(newMember)
    })

    expect(result.current.currentSlots[0].members).toContainEqual(newMember)
  })

  it('prevents adding duplicate members to the same slot', () => {
    const { result } = renderHook(() => useTeamBuilder({
      sectionEntities: mockEntities,
      currentLang: 'en',
      gameDefaultLang: 'en'
    }))

    act(() => {
      result.current.handleStartAddTeam()
      result.current.openSelection(0)
    })

    const member = { type: 'entity' as const, id: '1', name: 'Entity 1', icon_path: null }
    act(() => {
      result.current.addMemberToSlot(member)
    })
    
    act(() => {
      result.current.openSelection(0)
      result.current.addMemberToSlot(member)
    })

    expect(result.current.currentSlots[0].members).toHaveLength(1)
  })

  it('removes a member and clears the slot if empty', () => {
    const { result } = renderHook(() => useTeamBuilder({
      sectionEntities: mockEntities,
      currentLang: 'en',
      gameDefaultLang: 'en',
      currentEntityId: '1'
    }))

    act(() => {
      result.current.handleStartAddTeam()
    })

    expect(result.current.currentSlots).toHaveLength(1)

    act(() => {
      result.current.removeMemberFromSlot(0, 0)
    })

    expect(result.current.currentSlots).toHaveLength(0)
  })

  it('sorts slots correctly', () => {
    const { result } = renderHook(() => useTeamBuilder({
      sectionEntities: mockEntities,
      currentLang: 'en',
      gameDefaultLang: 'en'
    }))

    act(() => {
      result.current.handleStartAddTeam()
      // Manually set two slots
      result.current.setCurrentSlots([
        { members: [{ type: 'entity', id: '1', name: 'E1', icon_path: null }] },
        { members: [{ type: 'entity', id: '2', name: 'E2', icon_path: null }] }
      ])
    })

    act(() => {
      result.current.dragItemRef.current = 0
      result.current.dragOverItemRef.current = 1
      result.current.handleSort()
    })

    expect(result.current.currentSlots[0].members[0].id).toBe('2')
    expect(result.current.currentSlots[1].members[0].id).toBe('1')
  })

  it('filters entities by search term and excludes already selected members', () => {
    const { result } = renderHook(() => useTeamBuilder({
      sectionEntities: mockEntities,
      currentLang: 'en',
      gameDefaultLang: 'en',
      currentEntityId: '1'
    }))

    act(() => {
      result.current.handleStartAddTeam()
    })

    // '1' is already in slots, so only '2' should be in filteredEntities
    expect(result.current.filteredEntities).toHaveLength(1)
    expect(result.current.filteredEntities[0].id).toBe('2')

    act(() => {
      result.current.setEntitySearchTerm('Entity 2')
    })
    expect(result.current.filteredEntities).toHaveLength(1)

    act(() => {
      result.current.setEntitySearchTerm('Non-existent')
    })
    expect(result.current.filteredEntities).toHaveLength(0)
  })
})
