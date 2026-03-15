import { describe, it, expect } from 'vitest'
import { safeGet, getTranslatedField, getTranslation, isMissingTranslation, getMissingLanguages, LocalizedString } from '../lib/localization-utils'

describe('Localization Utilities', () => {
  describe('safeGet', () => {
    it('returns value for valid keys', () => {
      const obj = { name: 'Gacha', nested: { key: 'val' } }
      expect(safeGet(obj as unknown as Record<string, unknown>, 'name')).toBe('Gacha')
    })

    it('returns null for invalid keys or prototype injection attempts', () => {
      const obj = { name: 'Gacha' }
      expect(safeGet(obj as unknown as Record<string, unknown>, '__proto__')).toBeNull()
      expect(safeGet(obj as unknown as Record<string, unknown>, 'constructor')).toBeNull()
      expect(safeGet(null as unknown as Record<string, unknown>, 'name')).toBeNull()
    })

    it('returns null for non-string values', () => {
      const obj = { count: 123 }
      expect(safeGet(obj as unknown as Record<string, unknown>, 'count')).toBeNull()
    })
  })

  describe('getTranslatedField', () => {
    const loc: LocalizedString = { en: 'Hello', fr: 'Bonjour' }

    it('returns preferred language', () => {
      expect(getTranslatedField(loc, 'fr', 'en')).toBe('Bonjour')
    })

    it('falls back to default language', () => {
      expect(getTranslatedField(loc, 'de', 'en')).toBe('Hello')
    })

    it('returns empty string if nothing found', () => {
      expect(getTranslatedField({ de: 'Hallo' } as unknown as LocalizedString, 'fr', 'en')).toBe('')
    })

    it('handles string input (non-localized)', () => {
      expect(getTranslatedField('Static' as unknown as LocalizedString, 'fr', 'en')).toBe('Static')
    })
  })

  describe('isMissingTranslation', () => {
    it('detects missing values', () => {
      const loc: LocalizedString = { en: 'Hello', fr: '' }
      expect(isMissingTranslation(loc, 'fr')).toBe(true)
      expect(isMissingTranslation(loc, 'en')).toBe(false)
      expect(isMissingTranslation(loc, 'de')).toBe(true)
    })
  })

  describe('getTranslation', () => {
    it('returns translation for specific language', () => {
      // Assuming 'home' is a key in translations
      expect(getTranslation('home', 'en')).toBeDefined()
    })

    it('falls back to English if language not found', () => {
      expect(getTranslation('home', 'non-existent')).toBe(getTranslation('home', 'en'))
    })

    it('returns the key itself if not found in any language', () => {
      expect(getTranslation('not-a-key' as unknown as string, 'en')).toBe('not-a-key')
    })
  })

  describe('safeGet extended', () => {
    it('handles long keys by returning null', () => {
      const longKey = 'a'.repeat(65)
      expect(safeGet({ a: 'val' }, longKey)).toBeNull()
    })

    it('rejects keys with invalid characters', () => {
      expect(safeGet({ 'a!': 'val' } as unknown as Record<string, unknown>, 'a!')).toBeNull()
      expect(safeGet({ 'a b': 'val' } as unknown as Record<string, unknown>, 'a b')).toBeNull()
    })

    it('is case-insensitive for forbidden properties', () => {
      expect(safeGet({ Constructor: 'val' } as unknown as Record<string, unknown>, 'Constructor')).toBeNull()
    })
  })

  describe('getMissingLanguages combinations', () => {
    it('returns all languages if value is empty object', () => {
      expect(getMissingLanguages({}, ['en', 'fr'])).toEqual(['en', 'fr'])
    })

    it('returns nothing for string value', () => {
      expect(getMissingLanguages('Static String' as unknown as LocalizedString, ['en', 'fr'])).toEqual([])
    })

    it('detects whitespace-only translations as missing', () => {
      expect(getMissingLanguages({ en: '  ' }, ['en'])).toEqual(['en'])
    })
  })
})
