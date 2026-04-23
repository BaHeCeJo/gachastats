import { createClient } from "./server";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const ALLOWED_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function extractPathFromUrl(url: string, bucket: string): string {
  if (!url) return "";
  if (!url.startsWith("http")) return url;

  const searchStr = `/storage/v1/object/public/${bucket}/`;
  if (!url.includes(searchStr)) return "";

  const parts = url.split(searchStr);
  return parts.slice(1).join(searchStr);
}

export async function uploadImage(file: File, bucket: string, folder: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Invalid file type. Allowed types: JPG, PNG, WEBP, GIF, AVIF.`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is 5MB.`);
  }

  // Use MIME-derived extension, never trust the filename
  const fileExtension = ALLOWED_EXTENSIONS[file.type as keyof typeof ALLOWED_EXTENSIONS];
  const path = `${folder}/${uuidv4()}.${fileExtension}`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.error("Error uploading image:", error);
    throw new Error(`Failed to upload image.`);
  }

  return path;
}
