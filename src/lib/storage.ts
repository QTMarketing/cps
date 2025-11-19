import { promises as fs } from "fs";
import { supabase } from "./supabase";

const DEFAULT_SUPABASE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || "sign";

function getStorageClient(bucket = DEFAULT_SUPABASE_BUCKET) {
  if (!bucket || !supabase) {
    return null;
  }
  return supabase.storage.from(bucket);
}

export function hasSupabaseStorage(bucket?: string) {
  return Boolean(getStorageClient(bucket));
}

export async function uploadBufferToSupabase(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
  bucket?: string
) {
  const storage = getStorageClient(bucket);
  if (!storage) {
    throw new Error("Supabase storage is not configured");
  }
  
  // Convert Buffer to Uint8Array (which Supabase accepts)
  // Buffer extends Uint8Array, but we need to ensure it's in the right format
  const uint8Array = new Uint8Array(buffer);
  
  const { error } = await storage.upload(storagePath, uint8Array, {
    cacheControl: "3600",
    upsert: true,
    contentType,
  });
  
  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }
  
  const { data } = storage.getPublicUrl(storagePath);
  return {
    path: storagePath,
    publicUrl: data.publicUrl,
  };
}

export async function downloadFromSupabase(storagePath: string, bucket?: string) {
  const storage = getStorageClient(bucket);
  if (!storage) {
    throw new Error("Supabase storage is not configured");
  }
  const { data, error } = await storage.download(storagePath);
  if (error) {
    throw new Error(`Supabase download failed: ${error.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function deleteFromSupabase(storagePath: string, bucket?: string) {
  const storage = getStorageClient(bucket);
  if (!storage) {
    throw new Error("Supabase storage is not configured");
  }
  const { error } = await storage.remove([storagePath]);
  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}

export async function ensureLocalDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function getSupabaseBucket() {
  return DEFAULT_SUPABASE_BUCKET;
}

