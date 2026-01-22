import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { hasS3Config, putObject } from '@/lib/s3';
import { hasSupabaseStorage, uploadBufferToSupabase, ensureLocalDir } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const checkNumber = String(formData.get('checkNumber') || 'unknown');
    
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
    
    // Use checkNumber in filename for better organization
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const ts = now.getTime();
    const filename = `${checkNumber}-${ts}.${ext}`;
    const key = `invoices/${yyyy}/${mm}/${filename}`;

    // Prefer S3 when configured (Vercel/prod). Fallback to local for dev.
    if (hasS3Config) {
      try {
        // Prefer bucket policy over ACLs (handles buckets with ACLs disabled)
        const url = await putObject({ key, contentType: file.type, body: buffer });
        return NextResponse.json({ url });
      } catch (err: any) {
        return NextResponse.json({ error: 'S3 upload failed', details: err?.message || String(err) }, { status: 500 });
      }
    }

    // Try Supabase storage if available
    if (hasSupabaseStorage()) {
      try {
        // Use 'invoices' bucket if available, otherwise use default bucket
        const invoiceBucket = process.env.SUPABASE_INVOICES_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || 'sign';
        const { publicUrl } = await uploadBufferToSupabase(key, buffer, file.type, invoiceBucket);
        return NextResponse.json({ url: publicUrl });
      } catch (err: any) {
        console.error('Supabase upload failed, falling back to local storage:', err?.message || err);
        // Fall through to local storage fallback instead of failing
      }
    }

    // Local filesystem fallback (development only)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'invoices', yyyy, mm);
    await ensureLocalDir(uploadsDir);
    const filePath = path.join(uploadsDir, filename);
    await fs.writeFile(filePath, buffer);
    const publicUrl = `/uploads/invoices/${yyyy}/${mm}/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: 'Upload failed', details: e?.message || String(e) }, { status: 500 });
  }
}


