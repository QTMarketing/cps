import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, Role } from '@/lib/rbac';

export async function GET(req: NextRequest) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  if (response) {
    console.error('Role check failed:', {
      status: response.status,
      statusText: response.statusText,
      url: req.url,
    });
    // Try to get the error message from the response
    try {
      const errorData = await response.clone().json();
      console.error('Error details:', errorData);
    } catch {
      // Response might not be JSON
    }
    return response;
  }

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    // Build where clause - ONLY banks with no assigned user (assigned_to_user_id IS NULL)
    let where: any = {
      assigned_to_user_id: null,
    };

    // Add search filter if provided
    if (q) {
      where = {
        AND: [
          { assigned_to_user_id: null },
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

    // Query only unassigned banks with required fields
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
    const result = banks.map((bank) => ({
      id: bank.id.toString(),
      dbaName: bank.dba || bank.bank_name || '',
      accountType: bank.account_type || 'CHECKING',
      bankName: bank.bank_name || '',
    }));

    return NextResponse.json({ 
      success: true,
      banks: result 
    });
  } catch (e: any) {
    console.error('Error fetching unassigned banks:', e);
    
    // Proper error handling with detailed error information
    const errorMessage = e?.message || 'Unknown error occurred';
    const errorStack = process.env.NODE_ENV === 'development' ? e?.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load unassigned banks',
        message: errorMessage,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

