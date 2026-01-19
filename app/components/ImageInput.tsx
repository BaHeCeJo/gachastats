'use client'

import { useState } from 'react'

export default function ImageInput({
  name,
  initialUrl,
}: {
  name: string
  initialUrl?: string | null
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null)

  return (
    <div className="flex flex-col gap-2">
      {preview && (
        <img
          src={preview}
          className="rounded object-cover h-40"
          alt="Preview"
        />
      )}

      <input
        type="file"
        name={name}
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            setPreview(URL.createObjectURL(file))
          }
        }}
      />
    </div>
  )
}
