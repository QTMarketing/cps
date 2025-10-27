import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/banks/[id] - Get bank by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const bank = await prisma.bank.findUnique({
      where: { id: (await params).id },
      include: {
        store: true,
      },
    });

    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }

    return NextResponse.json(bank);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bank' }, { status: 500 });
  }
}

// PUT /api/banks/[id] - Update bank
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { bankName, accountNumber, routingNumber, storeId, balance } = body;

    const bank = await prisma.bank.update({
      where: { id: (await params).id },
      data: {
        bankName,
        accountNumber,
        routingNumber,
        storeId,
        balance,
      },
      include: {
        store: true,
      },
    });

    return NextResponse.json(bank);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bank' }, { status: 500 });
  }
}

// DELETE /api/banks/[id] - Delete bank
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.bank.delete({
      where: { id: (await params).id },
    });

    return NextResponse.json({ message: 'Bank deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete bank' }, { status: 500 });
  }
}
