"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLocalizationParams } from "@/lib/localization";

type Props = {
  name: string; // The name for the file input in case it's directly used in a form
  onFileChange: (file: File | null) => void;
  existingImageUrl: string | null; // Full public URL of the existing image
  onRemoveExisting?: () => void; // Callback when existing image is explicitly removed
  className?: string;
  label?: string;
};

export default function ImageInput({
  name,
  onFileChange,
  existingImageUrl,
  onRemoveExisting,
  className,
  label,
}: Props) {
  const { t } = useLocalizationParams() as any;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayLabel = label || t('upload');

  // Effect to handle existing image URL changes
  useEffect(() => {
    if (existingImageUrl) {
      setPreviewUrl(existingImageUrl);
      setFile(null); // Clear any pending new file if an existing one is set
    } else {
      setPreviewUrl(null);
    }
  }, [existingImageUrl]);

  // Effect to create and revoke object URLs for new file previews
  useEffect(() => {
    if (!file) {
      if (!existingImageUrl) setPreviewUrl(null); // Only clear preview if no existing URL
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Free memory when ever this component is unmounted
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, existingImageUrl]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;
      setFile(selectedFile);
      onFileChange(selectedFile);
    },
    [onFileChange]
  );

  const handleRemoveClick = useCallback(() => {
    setFile(null); // Clear selected file
    setPreviewUrl(null); // Clear preview
    onFileChange(null); // Notify parent no new file
    if (onRemoveExisting) {
      onRemoveExisting(); // Notify parent to remove existing image
    }
  }, [onFileChange, onRemoveExisting]);

  return (
    <div className={className}>
      <label htmlFor={`${name}-input`} className="block text-sm font-medium text-zinc-500 mb-2">
        {displayLabel}
      </label>
      <div className="mt-1 flex items-center space-x-4">
        {(previewUrl && !file) && ( // Display existing image or previous file preview
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 flex-shrink-0">
            <Image src={previewUrl} alt="Preview" layout="fill" objectFit="cover" />
            <button
              type="button"
              onClick={handleRemoveClick}
              className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-colors z-10"
              title="Remove existing image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        {(file && previewUrl && existingImageUrl !== previewUrl) && ( // Display new file preview
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800 flex-shrink-0">
            <Image src={previewUrl} alt="New Preview" layout="fill" objectFit="cover" />
            <button
              type="button"
              onClick={handleRemoveClick}
              className="absolute top-1 right-1 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-colors z-10"
              title="Remove new image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        <label className="flex items-center px-4 py-2 bg-zinc-800 text-green-500 rounded-lg shadow-lg tracking-wide uppercase border border-green-600 cursor-pointer hover:bg-green-600 hover:text-black transition-colors">
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M16.88 9.1A4 4 0 0116 17H5a5 5 0 01-1-9.9V7a3 3 0 014.52-2.59A4.98 4.98 0 0117 8c0 .38-.04.74-.12 1.1zM11 11v3h-1v-3H8l3-3 3 3h-2z" />
          </svg>
          <span className="mt-1 text-base leading-normal">
            {previewUrl ? t('changeImage') : t('selectImage')}
          </span>
          <input
            id={`${name}-input`}
            type="file"
            name={name}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      </div>
      {(previewUrl && !file) && existingImageUrl && (
          <p className="text-xs text-zinc-500 mt-2">{t('usingExistingImage')}</p>
      )}
      {(!previewUrl && !file) && (
          <p className="text-xs text-zinc-500 mt-2">{t('noImageSelected')}</p>
      )}
    </div>
  );
}