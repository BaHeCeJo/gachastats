/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, Mock } from 'vitest'
import LocalizedTextInput from '../app/components/fields/LocalizedTextInput'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/localization', () => ({
  useLocalizationParams: vi.fn(() => ({
    gameSupportedLanguages: ['en', 'fr'],
    gameDefaultLang: 'en',
  })),
}))

import { useLocalizationParams } from '@/lib/localization'

describe('LocalizedTextInput', () => {
  it('renders single input when only one language supported', () => {
    (useLocalizationParams as Mock).mockReturnValue({
      gameSupportedLanguages: ['en'],
      gameDefaultLang: 'en',
    })
    
    const onChange = vi.fn()
    render(
      <LocalizedTextInput 
        id="test" 
        label="Name" 
        value={{ en: 'Hello' }} 
        onChange={onChange} 
      />
    )

    expect(screen.getByLabelText('Name (EN)')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'EN' })).toBeNull()
  })

  it('renders tabs when multiple languages supported', () => {
    (useLocalizationParams as unknown as any).mockReturnValue({
        gameSupportedLanguages: ['en', 'fr'],
        gameDefaultLang: 'en',
    })
    
    const onChange = vi.fn()
    render(
      <LocalizedTextInput 
        id="test" 
        label="Name" 
        value={{ en: 'Hello', fr: 'Bonjour' }} 
        onChange={onChange} 
      />
    )

    expect(screen.getByRole('button', { name: 'EN' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'FR' })).toBeDefined()
  })

  it('switches tabs and updates correct language', async () => {
    const user = userEvent.setup({ delay: null })
    const onChange = vi.fn()
    render(
      <LocalizedTextInput 
        id="test" 
        label="Name" 
        value={{ en: 'Hello', fr: '' }} 
        onChange={onChange} 
      />
    )

    // Switch to FR
    await user.click(screen.getByRole('button', { name: 'FR' }))
    
    const input = screen.getByLabelText('Name (FR)')
    
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input, { target: { value: 'Salut' } })

    expect(onChange).toHaveBeenCalledWith({ en: 'Hello', fr: 'Salut' })
  })

  it('initializes with empty string for default lang if value is null', () => {
    const onChange = vi.fn()
    render(
      <LocalizedTextInput 
        id="test" 
        label="Name" 
        value={null} 
        onChange={onChange} 
      />
    )

    expect(onChange).toHaveBeenCalledWith({ en: '' })
  })
})
