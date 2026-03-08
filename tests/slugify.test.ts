import { describe, it, expect } from 'vitest'
import { slugify } from '@/lib/utils/slugify'

describe('slugify utility', () => {
  it('converts to lowercase and replaces non-alphanumeric with dashes', () => {
    expect(slugify('Zenless Zone Zero')).toBe('zenless-zone-zero')
  })

  it('removes multiple dashes and leading/trailing dashes', () => {
    expect(slugify('---Hello @ World!!!---')).toBe('hello-world')
  })

  it('handles non-English characters appropriately (if configured)', () => {
    // Currently your slugify just removes them via [^a-z0-9]
    // If you add transliteration later, update this test
    expect(slugify('HSR: Penacony')).toBe('hsr-penacony')
  })
})
