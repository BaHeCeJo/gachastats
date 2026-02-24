"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { XCircleIcon } from "@heroicons/react/24/solid";
import { upsertSkinImage } from "./skins/actions";
import { getTranslatedField } from "@/lib/localization";
import { useActionState } from "react";

type Props = {
  entityId: string;
  skinId: string;
  gameSlug: string;
  sectionId: string;
  imageType: "icon" | "splashart";
  existingImageUrl: string | null; // Public URL of existing image
  gameDefaultLang: string;
  currentLang: string;
};

type FormState = {
  error?: string;
};

export default function SkinImageInput({
  entityId,
  skinId,
  gameSlug,
  sectionId,
  imageType,
  existingImageUrl,
  gameDefaultLang,
  currentLang,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UseActionState for form submission
  const [state, formAction] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      formData.set("entityId", entityId);
      formData.set("skinId", skinId);
      formData.set("gameSlug", gameSlug);
      formData.set("sectionId", sectionId);
      formData.set("imageType", imageType);
      formData.set("existing_image_path", existingImageUrl || ""); // Pass existing path for potential deletion

      const result = await upsertSkinImage(gameSlug, sectionId, entityId, skinId, formData);

      if (result?.error) {
        return { ...prevState, error: result.error };
      }
      setFile(null); // Clear file input
      if (fileInputRef.current) fileInputRef.current.value = "";
      return { ...prevState, error: undefined };
    },
    {} as FormState
  );

  // Effect to update preview when existingImageUrl changes
  useEffect(() => {
    setPreviewUrl(existingImageUrl);
  }, [existingImageUrl]);

  // Effect to create and revoke object URLs for new file previews
  useEffect(() => {
    if (!file) {
      if (!existingImageUrl) setPreviewUrl(null); // Only clear preview if no existing URL
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file, existingImageUrl]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;
      setFile(selectedFile);
    },
    []
  );

  const handleRemoveExisting = useCallback(async () => {
    // This action should delete the image from storage and database
    // For now, it's just clearing the preview, the action needs to be implemented.
    // This would likely involve a separate deleteImage action from server.
    // As per current SkinManager, deleteImage is already available.
    // Need to get the image ID to delete it.

    // This part is tricky. The SkinManager already has a deleteImage that deletes by ID.
    // We need to pass that image's ID to this component.
    // For now, we will rely on a new upload overwriting or a manual delete button on the image itself.
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // OnRemoveExisting from main ImageInput would trigger a server action directly.
    // Here, we're not passing onRemoveExisting prop, so the parent would handle image removal logic.
    // This input is for UPLOADING an image, not managing its presence.
  }, []);


  const inputLabel = imageType === "icon" ? "Upload Icon" : "Upload Full Art";

  return (
    <div className="space-y-2">
      {state?.error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-2 rounded-lg">
          {state.error}
        </div>
      )}

      {previewUrl ? (
        <div className="relative w-full h-auto max-h-64 overflow-hidden rounded-md border border-zinc-700 bg-zinc-800">
          <Image
            src={previewUrl}
            alt={`${imageType} preview`}
            layout="responsive"
            width={imageType === "icon" ? 96 : 800} // Adjust based on imageType
            height={imageType === "icon" ? 96 : 450} // Adjust based on imageType
            objectFit="contain"
            className={imageType === "icon" ? "p-2" : "p-0"}
          />
          {/* We assume deletion is handled by a separate button in SkinManager,
              but if this component were to also delete, logic would go here.
              For now, this component is focused on uploading a new image. */}
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 w-24 md:h-32 md:w-32 rounded-md bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-sm">
          No {imageType}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">
          {inputLabel}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          name="image_file" // Name of the file input for formData
          accept="image/*"
          onChange={handleFileChange}
          className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-green-500/20 file:text-green-700 hover:file:bg-green-500/30 dark:file:bg-green-500/20 dark:file:text-green-300 dark:hover:file:bg-green-500/30 transition-colors"
        />
        <button
          type="submit"
          className="bg-green-600 text-black font-bold px-4 py-2 rounded-xl hover:bg-green-500 transition-colors mt-2"
          disabled={!file} // Disable if no file is selected
        >
          {previewUrl && existingImageUrl ? `Update ${imageType}` : `Upload ${imageType}`}
        </button>
      </form>
    </div>
  );
}