import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  hasSupabaseStorage,
  uploadBufferToSupabase,
  downloadFromSupabase,
} from '@/lib/storage';

export const runtime = 'nodejs';

// Configure multer-like functionality
const UPLOAD_DIR = join(process.cwd(), 'uploads');
const STORAGE_PREFIX = 'files';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp'
];

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// Generate unique filename
function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
}

// Validate file
function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }
  
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const fileName = generateFileName(file.name);
    const storageKey = `${STORAGE_PREFIX}/${fileName}`;
    const filePath = join(UPLOAD_DIR, fileName);
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let fileUrl: string;
    let storedPath = fileName;

    if (hasSupabaseStorage()) {
      const { publicUrl, path } = await uploadBufferToSupabase(
        storageKey,
        buffer,
        file.type || 'application/octet-stream',
      );
      fileUrl = publicUrl;
      storedPath = path;
    } else {
      await ensureUploadDir();
      await writeFile(filePath, buffer);
      fileUrl = `/api/files/${fileName}`;
    }
    
    return NextResponse.json({
      id: fileName.split('.')[0],
      fileName: file.name,
      filePath: storedPath,
      url: fileUrl,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Handle file serving
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const fileName = url.pathname.split('/').pop();
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'No file specified' },
        { status: 400 }
      );
    }
    
    const filePath = join(UPLOAD_DIR, fileName);
    let fileBuffer: Buffer | null = null;
    
    if (existsSync(filePath)) {
      fileBuffer = await import('fs').then(fs => fs.promises.readFile(filePath));
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





