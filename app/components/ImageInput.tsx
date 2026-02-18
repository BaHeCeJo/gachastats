"use client";

import { useState } from "react";

type Props = {
  name: string;
  initialUrl?: string | null;
};

export default function ImageInput({ name, initialUrl }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview && (
        <img
          src={preview}
          alt="Preview"
          className="w-24 h-24 object-cover border rounded"
        />
      )}
      <input
        type="file"
        name={name}
        accept="image/*"
        onChange={handleChange}
        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
      />
    </div>
  );
}
