'use client'

import { useEffect, useState } from 'react'

type Props = {
  name: string
  label: string
  initialUrl?: string
}

export default function ImageInputWithPreview({
  name,
  label,
  initialUrl,
}: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null)

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  return (
    <div className="space-y-2">
      <label className="font-semibold">{label}</label>

      {preview && (
        <img
          src={preview}
          className="h-24 rounded border"
        />
      )}

      <input
        type="file"
        name={name}
        accept="image/*"
        onChange={onChange}
      />
    </div>
  )
}
