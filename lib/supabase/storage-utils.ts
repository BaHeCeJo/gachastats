import { createClient } from "./server";
import { v4 as uuidv4 } from "uuid";

/**
 * Extracts the storage path from a public URL.
 * Supabase URLs are typically: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
 */
export function extractPathFromUrl(url: string, bucket: string): string {
  if (!url) return "";
  // If it's already a relative path (doesn't start with http), return as is
  if (!url.startsWith("http")) return url;

  const searchStr = `/${bucket}/`;
  if (!url.includes(searchStr)) return "";

  const parts = url.split(searchStr);
  return parts[parts.length - 1];
}

/**
 * Handles uploading an image file to Supabase storage.
 * @param file The image file to upload.
 * @param bucket The storage bucket name.
 * @param folder The folder within the bucket.
 * @returns The path to the uploaded file within the bucket/folder.
 */
export async function uploadImage(file: File, bucket: string, folder: string): Promise<string> {
  const supabase = await createClient();
  const fileExtension = file.name.split(".").pop();
  const path = `${folder}/${uuidv4()}.${fileExtension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Error uploading image:", error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  return path;
}
