'use client'

export default function ConfirmButton({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      className="text-red-600 text-sm"
      onClick={(e) => {
        if (!confirm('Delete this item permanently?')) {
          e.preventDefault()
        }
      }}
    >
      {children}
    </button>
  )
}
