"use client";

import { useState } from "react";

type Props = {
  name: string;
  initialUrl?: string | null;
  multiple?: boolean;
};

export default function ImageInput({ name, initialUrl, multiple }: Props) {
  const [previews, setPreviews] = useState<string[]>(initialUrl ? [initialUrl] : []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newPreviews: string[] = [];
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          if (newPreviews.length === files.length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    } else {
      setPreviews([]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {previews.map((preview, idx) => (
          <img
            key={idx}
            src={preview}
            alt="Preview"
            className="w-24 h-24 object-cover border rounded"
          />
        ))}
      </div>
      <input
        type="file"
        name={name}
        accept="image/*"
        multiple={multiple}
        onChange={handleChange}
        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
      />
    </div>
  );
}
