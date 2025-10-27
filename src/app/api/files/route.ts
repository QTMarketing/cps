import { NextRequest, NextResponse } from 'next/server';
import { readdir, unlink, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

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
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json([]);
    }
    
    const files = await readdir(UPLOAD_DIR);
    const fileInfos: FileInfo[] = [];
    
    for (const file of files) {
      const filePath = join(UPLOAD_DIR, file);
      const stats = await stat(filePath);
      
      // Skip directories
      if (stats.isDirectory()) continue;
      
      // Extract original name from filename (remove timestamp and random part)
      const parts = file.split('.');
      const extension = parts.pop();
      const nameWithoutExt = parts.join('.');
      const nameParts = nameWithoutExt.split('-');
      const originalName = nameParts.slice(2).join('-') + (extension ? `.${extension}` : '');
      
      // Determine content type
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
    
    // Sort by upload date (newest first)
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


