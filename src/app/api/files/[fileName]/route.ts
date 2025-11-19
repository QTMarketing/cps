import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { hasSupabaseStorage, downloadFromSupabase } from '@/lib/storage';

const UPLOAD_DIR = join(process.cwd(), 'uploads');
const STORAGE_PREFIX = 'files';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileName: string }> }
) {
  try {
    const { fileName } = await context.params;
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'No file specified' },
        { status: 400 }
      );
    }
    
    const filePath = join(UPLOAD_DIR, fileName);
    let fileBuffer: Buffer | null = null;
    
    if (existsSync(filePath)) {
      fileBuffer = await readFile(filePath);
    } else if (hasSupabaseStorage()) {
      try {
        fileBuffer = await downloadFromSupabase(`${STORAGE_PREFIX}/${fileName}`);
      } catch (error) {
        console.error('Supabase download error:', error);
      }
    }
    
    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Determine content type based on file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
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
    
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
    
  } catch (error) {
    console.error('File serving error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
