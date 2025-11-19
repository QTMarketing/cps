import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/stores/[id] - Get store by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const store = await prisma.store.findUnique({
      where: { id },
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, address, phone } = body;

    const store = await prisma.store.update({
      where: { id },
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.store.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Store deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete store' }, { status: 500 });
  }
}
