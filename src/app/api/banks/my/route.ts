import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Role } from '@/lib/roles';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

type DecodedToken = {
  userId?: number;
  role?: Role;
};

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const tokenCookie = cookieHeader.split('; ').find((chunk) => chunk.startsWith('auth-token='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1] ?? null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication token missing' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    if (!decoded?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const role = decoded.role ?? Role.USER;
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');

    let targetUserId: number | null = null;
    let includeAllBanks = false;

    if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
      if (userIdParam) {
        const parsed = parseInt(userIdParam, 10);
        targetUserId = Number.isFinite(parsed) ? parsed : null;
      } else {
        includeAllBanks = true;
      }
    } else {
      targetUserId = decoded.userId;
    }

    const banks = await prisma.bank.findMany({
      where: includeAllBanks
        ? undefined
        : {
            assigned_to_user_id: targetUserId ?? decoded.userId,
          },
      orderBy: { bank_name: 'asc' },
      select: {
        id: true,
        bank_name: true,
        account_name: true,
        account_type: true,
        assigned_to_user_id: true,
      },
    });

    const payload = banks.map((bank) => ({
      id: bank.id.toString(),
      bank_name: bank.bank_name,
      bankName: bank.bank_name,
      accountName: bank.account_name,
      accountType: bank.account_type,
      assignedToUserId: bank.assigned_to_user_id
        ? bank.assigned_to_user_id.toString()
        : null,
    }));

    return NextResponse.json({ success: true, banks: payload });
  } catch (error) {
    console.error('Error fetching banks for user:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to load banks', message },
      { status: 500 }
    );
  }
}

