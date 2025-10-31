import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.S3_REGION;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const PUBLIC_BASE = process.env.S3_PUBLIC_URL; // optional custom domain/base URL

export const hasS3Config = Boolean(REGION && BUCKET && ACCESS_KEY_ID && SECRET_ACCESS_KEY);

let s3: S3Client | null = null;
export function getS3Client(): S3Client {
  if (!hasS3Config) throw new Error("Missing S3 configuration env vars");
  if (!s3) {
    s3 = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID as string,
        secretAccessKey: SECRET_ACCESS_KEY as string,
      },
    });
  }
  return s3;
}

export async function putObject(params: {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array;
  acl?: "private" | "public-read";
}): Promise<string> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ACL: params.acl || "public-read",
    })
  );
  // Build public URL
  if (PUBLIC_BASE) return `${PUBLIC_BASE.replace(/\/$/, "")}/${params.key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${params.key}`;
}


