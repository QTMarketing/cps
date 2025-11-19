import { promises as fs } from "fs";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { supabase } from "./supabase";

const DEFAULT_SUPABASE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || "sign";

// S3-compatible configuration for Supabase Storage
const SUPABASE_S3_ENDPOINT = process.env.SUPABASE_S3_ENDPOINT || "https://mejlgwbmimqjzurecpji.storage.supabase.co/storage/v1/s3";
const SUPABASE_S3_REGION = process.env.SUPABASE_S3_REGION || "ap-northeast-2";
const SUPABASE_S3_ACCESS_KEY = process.env.SUPABASE_S3_ACCESS_KEY;
const SUPABASE_S3_SECRET_KEY = process.env.SUPABASE_S3_SECRET_KEY;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) {
    return s3Client;
  }
  
  if (!SUPABASE_S3_ACCESS_KEY || !SUPABASE_S3_SECRET_KEY) {
    return null;
  }
  
  s3Client = new S3Client({
    endpoint: SUPABASE_S3_ENDPOINT,
    region: SUPABASE_S3_REGION,
    credentials: {
      accessKeyId: SUPABASE_S3_ACCESS_KEY,
      secretAccessKey: SUPABASE_S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for Supabase S3-compatible API
  });
  
  return s3Client;
}

function getStorageClient(bucket = DEFAULT_SUPABASE_BUCKET) {
  if (!bucket || !supabase) {
    return null;
  }
  return supabase.storage.from(bucket);
}

export function hasSupabaseStorage(bucket?: string) {
  // Check if S3-compatible API is available
  if (getS3Client()) {
    return true;
  }
  // Fall back to Supabase JS client
  return Boolean(getStorageClient(bucket));
}

export async function uploadBufferToSupabase(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
  bucket?: string
) {
  const targetBucket = bucket || DEFAULT_SUPABASE_BUCKET;
  
  // Try S3-compatible API first
  const s3 = getS3Client();
  if (s3) {
    try {
      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: storagePath,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "3600",
      });
      
      await s3.send(command);
      
      // Construct public URL from Supabase project URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_S3_ENDPOINT.replace('/storage/v1/s3', '');
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${targetBucket}/${storagePath}`;
      
      return {
        path: storagePath,
        publicUrl,
      };
    } catch (error) {
      console.error("S3 upload failed, falling back to Supabase JS client:", error);
      // Fall through to Supabase JS client
    }
  }
  
  // Fall back to Supabase JS client
  const storage = getStorageClient(targetBucket);
  if (!storage) {
    throw new Error("Supabase storage is not configured");
  }
  
  // Use Uint8Array for Supabase JS client
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
  const targetBucket = bucket || DEFAULT_SUPABASE_BUCKET;
  
  // Try S3-compatible API first
  const s3 = getS3Client();
  if (s3) {
    try {
      const command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: storagePath,
      });
      
      const response = await s3.send(command);
      if (!response.Body) {
        throw new Error("Empty response body");
      }
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error("S3 download failed, falling back to Supabase JS client:", error);
      // Fall through to Supabase JS client
    }
  }
  
  // Fall back to Supabase JS client
  const storage = getStorageClient(targetBucket);
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
  const targetBucket = bucket || DEFAULT_SUPABASE_BUCKET;
  
  // Try S3-compatible API first
  const s3 = getS3Client();
  if (s3) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: storagePath,
      });
      
      await s3.send(command);
      return;
    } catch (error) {
      console.error("S3 delete failed, falling back to Supabase JS client:", error);
      // Fall through to Supabase JS client
    }
  }
  
  // Fall back to Supabase JS client
  const storage = getStorageClient(targetBucket);
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

