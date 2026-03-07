import { createClient } from "@/lib/supabase/server";
import { uploadImage, extractPathFromUrl } from "@/lib/supabase/storage-utils";

/**
 * Orchestrates the update of an image asset in Supabase Storage.
 * Handles three scenarios:
 * 1. New File: Uploads new, deletes old if exists.
 * 2. Path String: Retains existing image (no-op).
 * 3. Null/Empty: Deletes old image if exists.
 */
export async function smartUpdateImage(
  newAsset: File | string | null | undefined,
  oldPath: string | null | undefined,
  bucket: string,
  folder: string
): Promise<string | null> {
  const supabase = await createClient();
  const normalizedOldPath = oldPath ? extractPathFromUrl(oldPath, bucket) : null;

  // 1. New file uploaded
  if (newAsset instanceof File && newAsset.size > 0) {
    const newPath = await uploadImage(newAsset, bucket, folder);
    
    // Cleanup old asset
    if (normalizedOldPath) {
      await supabase.storage.from(bucket).remove([normalizedOldPath]);
    }
    return newPath;
  }

  // 2. Existing path retained
  if (typeof newAsset === "string" && newAsset.length > 0) {
    return extractPathFromUrl(newAsset, bucket);
  }

  // 3. Asset removed or never existed
  if (normalizedOldPath) {
    await supabase.storage.from(bucket).remove([normalizedOldPath]);
  }
  return null;
}

/**
 * Bulk delete assets from storage.
 */
export async function deleteAssets(paths: (string | null | undefined)[], bucket: string) {
  const supabase = await createClient();
  const validPaths = paths
    .filter((p): p is string => !!p)
    .map(p => extractPathFromUrl(p, bucket))
    .filter(p => p.length > 0);

  if (validPaths.length > 0) {
    const { error } = await supabase.storage.from(bucket).remove(validPaths);
    if (error) console.error(`Failed to delete assets from ${bucket}:`, error.message);
  }
}
