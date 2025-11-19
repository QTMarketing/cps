import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { chequeSelect, mapChequeRecord } from '@/lib/cheques/transformers';
import { jsonGuardError, requireAuth } from '@/lib/guards';

// GET /api/checks/[id] - Get check by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);
    const check = await prisma.check.findUnique({
      where: { id: parseInt((await params).id, 10) },
      select: chequeSelect,
    });

    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 });
    }

    const payload = mapChequeRecord(check as any);

    return NextResponse.json(payload);
  } catch (error) {
    if (typeof (error as any)?.status === 'number') {
      return jsonGuardError(error);
    }
    console.error('Error fetching check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined;
    
    return NextResponse.json({ 
      error: 'Failed to fetch check',
      message: errorMessage,
      ...(errorStack && { stack: errorStack })
    }, { status: 500 });
  }
}

// PUT /api/checks/[id] - Update check
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { amount, memo, payeeName, bankId, invoiceUrl } = body;

    // Build update data with only fields that exist in the schema
    const updateData: any = {};
    
    if (amount !== undefined) {
      updateData.amount = new Prisma.Decimal(amount);
    }
    if (memo !== undefined) {
      updateData.memo = memo;
    }
    if (payeeName !== undefined) {
      updateData.payee_name = payeeName;
    }
    if (bankId !== undefined) {
      updateData.bank_id = parseInt(bankId, 10);
    }
    if (invoiceUrl !== undefined) {
      updateData.invoice_url = invoiceUrl;
    }

    const check = await prisma.check.update({
      where: { id: parseInt((await params).id, 10) },
      data: updateData,
      select: {
        id: true,
        check_number: true,
        bank_id: true,
        amount: true,
        payee_name: true,
        memo: true,
        invoice_url: true,
        created_at: true,
        Bank: {
          select: {
            id: true,
            bank_name: true,
            dba: true,
            account_type: true,
            account_number: true,
            routing_number: true,
          },
        },
      },
    });

    // Format response
    const payload = {
      id: check.id.toString(),
      createdAt: check.created_at,
      checkNumber: Number(check.check_number),
      bank: {
        id: check.Bank.id.toString(),
        bankName: check.Bank.bank_name,
        dba: check.Bank.dba,
        accountType: check.Bank.account_type,
      },
      amount: check.amount ? Number(check.amount) : 0,
      memo: check.memo ?? null,
      payeeName: check.payee_name ?? null,
      invoiceUrl: check.invoice_url ?? null,
      status: 'ISSUED',
      paymentMethod: 'CHECK',
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error updating check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to update check',
      message: errorMessage
    }, { status: 500 });
  }
}

// DELETE /api/checks/[id] - Delete check
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.check.delete({
      where: { id: parseInt((await params).id, 10) },
    });

    return NextResponse.json({ message: 'Check deleted successfully' });
  } catch (error) {
    console.error('Error deleting check:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to delete check',
      message: errorMessage
    }, { status: 500 });
  }
}
