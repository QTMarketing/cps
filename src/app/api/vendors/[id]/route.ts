import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/vendors/[id] - Get vendor by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: (await params).id },
      include: {
        store: true,
      },
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    return NextResponse.json(vendor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 });
  }
}

// PUT /api/vendors/[id] - Update vendor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { vendorName, vendorType, description, contact, storeId } = body;

    const vendor = await prisma.vendor.update({
      where: { id: (await params).id },
      data: {
        vendorName,
        vendorType,
        description,
        contact,
        storeId,
      },
      include: {
        store: true,
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

// DELETE /api/vendors/[id] - Delete vendor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.vendor.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
