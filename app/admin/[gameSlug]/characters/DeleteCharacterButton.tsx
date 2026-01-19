'use client'

export function DeleteCharacterButton() {
  return (
    <button
      type="submit"
      className="text-red-600 text-sm"
      onClick={e => {
        if (!confirm('Delete this character permanently?')) {
          e.preventDefault()
        }
      }}
    >
      Delete
    </button>
  )
}
