import { NextRequest, NextResponse } from 'next/server';
import { readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { supabase } from '@/lib/supabase';
import {
  hasSupabaseStorage,
  deleteFromSupabase,
  getSupabaseBucket,
} from '@/lib/storage';

export const runtime = 'nodejs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const STORAGE_PREFIX = 'files';

interface FileInfo {
  id: string;
  fileName: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

// List all uploaded files
export async function GET() {
  try {
    if (hasSupabaseStorage() && supabase) {
      const bucket = getSupabaseBucket();
      const storage = supabase.storage.from(bucket);
      const { data, error } = await storage.list(STORAGE_PREFIX, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) {
        throw new Error(error.message);
      }
      const fileInfos: FileInfo[] = (data || [])
        .filter((item) => item.name && !item.name.endsWith('/'))
        .map((item) => {
          const file = item.name!;
          const parts = file.split('.');
          const extension = parts.pop();
          const nameWithoutExt = parts.join('.');
          const nameParts = nameWithoutExt.split('-');
          const originalName =
            nameParts.slice(2).join('-') + (extension ? `.${extension}` : '');

          let contentType = 'application/octet-stream';
          switch (extension?.toLowerCase()) {
            case 'pdf':
              contentType = 'application/pdf';
              break;
            case 'jpg':
            case 'jpeg':
              contentType = 'image/jpeg';
              break;
            case 'png':
              contentType = 'image/png';
              break;
            case 'gif':
              contentType = 'image/gif';
              break;
            case 'webp':
              contentType = 'image/webp';
              break;
          }

          const { data: publicUrlData } = storage.getPublicUrl(
            `${STORAGE_PREFIX}/${file}`,
          );

          return {
            id: item.id ?? `${nameParts[0]}-${nameParts[1]}`,
            fileName: file,
            originalName: originalName || file,
            size: item.metadata?.size ?? 0,
            type: contentType,
            url: publicUrlData.publicUrl,
            uploadedAt: item.created_at || new Date().toISOString(),
          };
        });

      return NextResponse.json(fileInfos);
    }

    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json([]);
    }
    
    const files = await readdir(UPLOAD_DIR);
    const fileInfos: FileInfo[] = [];
    
    for (const file of files) {
      const filePath = join(UPLOAD_DIR, file);
      const stats = await stat(filePath);
      
      if (stats.isDirectory()) continue;
      
      const parts = file.split('.');
      const extension = parts.pop();
      const nameWithoutExt = parts.join('.');
      const nameParts = nameWithoutExt.split('-');
      const originalName = nameParts.slice(2).join('-') + (extension ? `.${extension}` : '');
      
      let contentType = 'application/octet-stream';
      switch (extension?.toLowerCase()) {
        case 'pdf':
          contentType = 'application/pdf';
          break;
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
      }
      
      fileInfos.push({
        id: nameParts[0] + '-' + nameParts[1],
        fileName: file,
        originalName: originalName || file,
        size: stats.size,
        type: contentType,
        url: `/api/files/${file}`,
        uploadedAt: stats.birthtime.toISOString()
      });
    }
    
    fileInfos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    return NextResponse.json(fileInfos);
    
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    );
  }
}

// Delete a file
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'No file specified' },
        { status: 400 }
      );
    }
    
    if (hasSupabaseStorage()) {
      const storagePath = fileName.includes('/')
        ? fileName
        : `${STORAGE_PREFIX}/${fileName}`;
      await deleteFromSupabase(storagePath);
      return NextResponse.json({ success: true });
    }
    
    const filePath = join(UPLOAD_DIR, fileName);
    
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    await unlink(filePath);
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}





