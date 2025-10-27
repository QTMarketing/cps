import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/checks/[id] - Get check by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await prisma.check.findUnique({
      where: { id: (await params).id },
      include: {
        bank: {
          include: {
            store: true,
          },
        },
        vendor: {
          include: {
            store: true,
          },
        },
        issuedByUser: {
          include: {
            store: true,
          },
        },
      },
    });

    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 });
    }

    return NextResponse.json(check);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch check' }, { status: 500 });
  }
}

// PUT /api/checks/[id] - Update check
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { checkNumber, paymentMethod, bankId, vendorId, amount, memo, status, issuedBy } = body;

    const check = await prisma.check.update({
      where: { id: (await params).id },
      data: {
        checkNumber,
        paymentMethod,
        bankId,
        vendorId,
        amount,
        memo,
        status,
        issuedBy,
      },
      include: {
        bank: {
          include: {
            store: true,
          },
        },
        vendor: {
          include: {
            store: true,
          },
        },
        issuedByUser: {
          include: {
            store: true,
          },
        },
      },
    });

    return NextResponse.json(check);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update check' }, { status: 500 });
  }
}

// DELETE /api/checks/[id] - Delete check
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.check.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ message: 'Check deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete check' }, { status: 500 });
  }
}
