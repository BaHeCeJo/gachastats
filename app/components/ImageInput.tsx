// app/components/ImageInput.tsx
'use client'

import { useState, useEffect } from 'react'

type Props = {
  name: string
  initialUrl?: string | null
}

export default function ImageInput({ name, initialUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  return (
    <div className="flex flex-col gap-2">
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-32 h-32 object-cover border rounded"
        />
      )}
      <input type="file" name={name} accept="image/*" onChange={handleChange} />
    </div>
  )
}
