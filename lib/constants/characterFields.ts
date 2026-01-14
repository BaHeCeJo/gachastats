export const CHARACTER_FIELDS = [
  'name',
  'element',
  'path',
  'weapon_category',
  'faction',
  'rarity',
] as const

export type CharacterFieldKey = typeof CHARACTER_FIELDS[number]
