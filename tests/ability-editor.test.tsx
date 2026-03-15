/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import EntityAbilityEditor from '../app/admin/games/[gameSlug]/sections/[sectionId]/entities/components/EntityAbilityEditor'
import userEvent from '@testing-library/user-event'

// Mock localization
vi.mock('@/lib/localization', () => ({
  getTranslatedField: (name: { en?: string }) => name.en || 'Unknown',
  useLocalizationParams: () => ({
    displayLang: 'en',
    t: (k: string) => k,
    gameSupportedLanguages: ['en'],
    gameDefaultLang: 'en',
  }),
  LocalizedString: {}
}))

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: 'mock-url' } })
      })
    }
  })
}))

describe('EntityAbilityEditor', () => {
  const mockTemplates = [
    {
      id: 't1',
      name: { en: 'Default Template' },
      is_default: true,
      section_ability_definitions: [
        { id: 'd1', name: { en: 'Basic Attack' }, order_index: 0 }
      ]
    },
    {
      id: 't2',
      name: { en: 'Optional Template' },
      is_default: false,
      section_ability_definitions: [
        { id: 'd2', name: { en: 'Special Skill' }, order_index: 1 }
      ]
    }
  ]

  it('renders default template slots', () => {
    render(
      <EntityAbilityEditor 
        abilityTemplates={mockTemplates as unknown as any} 
        existingAbilities={[]} 
        gameDefaultLang="en" 
        activeLang="en" 
        onChange={() => {}} 
      />
    )

    expect(screen.getByText('Basic Attack')).toBeDefined()
  })

  it('loads optional template when selected', async () => {
    const user = userEvent.setup()
    render(
      <EntityAbilityEditor 
        abilityTemplates={mockTemplates as unknown as any} 
        existingAbilities={[]} 
        gameDefaultLang="en" 
        activeLang="en" 
        onChange={() => {}} 
      />
    )

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 't2')

    expect(screen.getByText('Special Skill')).toBeDefined()
  })

  it('adds and removes alternate forms', async () => {
    const user = userEvent.setup()
    render(
      <EntityAbilityEditor 
        abilityTemplates={mockTemplates as unknown as any} 
        existingAbilities={[]} 
        gameDefaultLang="en" 
        activeLang="en" 
        onChange={() => {}} 
      />
    )

    const addButton = screen.getByText('+ Add Alternate Form')
    await user.click(addButton)

    expect(screen.getByText('Alternate Forms')).toBeDefined()
    expect(screen.getByLabelText(/Form Name/i)).toBeDefined()

    // Find remove button by class as it has no text/aria-label
    const removeButtons = screen.getAllByRole('button').filter(b => b.className.includes('bg-red-500'))
    await user.click(removeButtons[0])

    expect(screen.queryByText('Alternate Forms')).toBeNull()
  })

  it('calls onChange when ability details change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <EntityAbilityEditor 
        abilityTemplates={mockTemplates as unknown as any} 
        existingAbilities={[]} 
        gameDefaultLang="en" 
        activeLang="en" 
        onChange={onChange} 
      />
    )

    const nameInput = screen.getByLabelText(/Ability Name/i)
    await user.type(nameInput, 'Strike')

    expect(onChange).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({
        name: { en: 'Strike' }
      })
    ]))
  })
})
