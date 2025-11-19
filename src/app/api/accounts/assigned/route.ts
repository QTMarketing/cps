import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, Role } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '';
    const q = (searchParams.get('q') || '').trim();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    // Build where clause - ONLY banks assigned to this user
    let where: any = {
      assigned_to_user_id: parseInt(userId, 10),
    };

    // Add search filter if provided
    if (q) {
      where = {
        AND: [
          { assigned_to_user_id: parseInt(userId, 10) },
          {
            OR: [
              { bank_name: { contains: q, mode: 'insensitive' } },
              { dba: { contains: q, mode: 'insensitive' } },
              { account_name: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      };
    }

    // Query banks assigned to this user
    const banks = await prisma.bank.findMany({
      where,
      orderBy: { bank_name: 'asc' },
      select: {
        id: true,
        bank_name: true,
        dba: true,
        account_type: true,
      },
    });

    // Format response to match frontend expectations
    // Returns: id, dbaName, accountType, bankName
    const accounts = banks.map((bank) => ({
      id: bank.id.toString(),
      dbaName: bank.dba || bank.bank_name || '',
      accountType: bank.account_type || 'CHECKING',
      bankName: bank.bank_name || '',
    }));

    return NextResponse.json({ 
      success: true,
      accounts 
    });
  } catch (e: any) {
    console.error('Error fetching assigned accounts:', e);
    const errorMessage = e?.message || 'Unknown error occurred';
    const errorStack = process.env.NODE_ENV === 'development' ? e?.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load assigned accounts',
        message: errorMessage,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}
