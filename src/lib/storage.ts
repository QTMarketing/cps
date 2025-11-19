import { promises as fs } from "fs";
import { getSupabaseAdminClient } from "./supabase";

const SUPABASE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || "sign";

function getStorageClient() {
  const admin = getSupabaseAdminClient();
  if (!admin || !SUPABASE_BUCKET) {
    return null;
  }
  return admin.storage.from(SUPABASE_BUCKET);
}

export function hasSupabaseStorage() {
  return Boolean(getStorageClient());
}

export async function uploadBufferToSupabase(
  storagePath: string,
  buffer: Buffer,
  contentType: string
) {
  const storage = getStorageClient();
  if (!storage) {
    throw new Error("Supabase storage is not configured");
  }
  const { error } = await storage.upload(storagePath, buffer, {
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

export async function downloadFromSupabase(storagePath: string) {
  const storage = getStorageClient();
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

export async function deleteFromSupabase(storagePath: string) {
  if (!getStorageClient()) {
    throw new Error("Supabase storage is not configured");
  }
  const storage = getStorageClient()!;
  const { error } = await storage.remove([storagePath]);
  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
}

export async function ensureLocalDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function getSupabaseBucket() {
  return SUPABASE_BUCKET;
}

