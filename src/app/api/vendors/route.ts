import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/vendors - Get all vendors
export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        store: true,
      },
    });
    return NextResponse.json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendors', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/vendors - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vendorName, vendorType, description, contact, storeId } = body;

    const vendor = await prisma.vendor.create({
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

    return NextResponse.json(vendor, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
