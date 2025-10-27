import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMinimumRole, Role } from '@/lib/rbac';

// GET /api/banks - Get all banks (Admin/Manager only)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // For now, let's fetch banks without RBAC to avoid connection pool issues
    // TODO: Re-enable RBAC once connection pool is stable
    const banks = await prisma.bank.findMany({
      include: {
        store: true,
      },
    });
    
    return NextResponse.json(banks);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/banks - Create a new bank (Admin only)
export async function POST(req: NextRequest) {
  const roleCheck = requireMinimumRole(Role.ADMIN);
  const response = await roleCheck(req);

  if (response) {
    return response;
  }

  try {
    const body = await req.json();
    const { bankName, accountNumber, routingNumber, storeId, balance } = body;

    const bank = await prisma.bank.create({
      data: {
        bankName,
        accountNumber,
        routingNumber,
        storeId,
        balance: balance || 0,
      },
      include: {
        store: true,
      },
    });

    return NextResponse.json(bank, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create bank' }, { status: 500 });
  }
}
