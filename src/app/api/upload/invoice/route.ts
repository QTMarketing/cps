import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { hasS3Config, putObject } from '@/lib/s3';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'File missing' }, { status: 400 });

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
    const filename = `invoice-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Prefer S3 when configured (Vercel/prod). Fallback to local for dev.
    if (hasS3Config) {
      try {
        const key = `invoices/${filename}`;
        // Prefer bucket policy over ACLs (handles buckets with ACLs disabled)
        const url = await putObject({ key, contentType: file.type, body: buffer });
        return NextResponse.json({ url });
      } catch (err: any) {
        return NextResponse.json({ error: 'S3 upload failed', details: err?.message || String(err) }, { status: 500 });
      }
    }

    // Local filesystem fallback (development only)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'invoices');
    await fs.mkdir(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    const publicUrl = `/uploads/invoices/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: 'Upload failed', details: e?.message || String(e) }, { status: 500 });
  }
}


