"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./skins/actions";

type Props = {
  entityId: string;
  skinId: string;
  gameSlug: string;
  sectionId: string;
  imageType: "icon" | "full_art";
  existingImageUrl?: string | null;
};

export default function SkinImageInput({
  entityId,
  skinId,
  gameSlug,
  sectionId,
  imageType,
  existingImageUrl,
}: Props) {
  const [preview, setPreview] = useState<string | null>(existingImageUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await uploadImage(
      formData,
      entityId,
      skinId,
      gameSlug,
      sectionId
    );
    if (result?.error) {
      setError(result.error);
    } else {
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setError(null);
    }
  }

  // If there's an existing image, we don't show the upload form, just the image.
  // The user must delete it first before uploading a new one.
  if (existingImageUrl) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input type="hidden" name="imageType" value={imageType} />
      <div className="flex items-center gap-4">
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-24 h-24 object-cover border rounded"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        />
      </div>
      <button
        type="submit"
        className="bg-indigo-600 text-white px-3 py-1 rounded w-fit text-sm"
        disabled={!preview}
      >
        Upload
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  );
}
