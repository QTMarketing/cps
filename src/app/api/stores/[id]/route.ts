import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stores/[id] - Get store by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const store = await prisma.store.findUnique({
      where: { id: (await params).id },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 });
  }
}

// PUT /api/stores/[id] - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, address, phone } = body;

    const store = await prisma.store.update({
      where: { id: (await params).id },
      data: {
        name,
        address,
        phone,
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}

// DELETE /api/stores/[id] - Delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.store.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ message: 'Store deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 });
  }
}
