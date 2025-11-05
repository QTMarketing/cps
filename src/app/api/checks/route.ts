import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
export const runtime = 'nodejs';

// GET /api/checks - Get all checks
export async function GET(request: NextRequest) {
  try {
    // Accept JWT from Authorization header OR auth-token cookie
    const authHeader = request.headers.get('authorization');
    let bearerToken = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : '';

    if (!bearerToken) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.split('; ').find((c) => c.startsWith('auth-token='));
      if (match) bearerToken = match.split('=')[1] || '';
    }

    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(bearerToken, process.env.JWT_SECRET as string);
    const isAdmin = decoded?.role === 'ADMIN';

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const vendorId = searchParams.get('vendorId');
    const storeId = searchParams.get('storeId');

    const where: any = isAdmin ? {} : { issuedBy: decoded.userId };

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (storeId) {
      where.vendor = { storeId };
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { checkNumber: { contains: search, mode: 'insensitive' } },
        { memo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [checks, total] = await Promise.all([
      prisma.check.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bank: { select: { id: true, bankName: true, store: { select: { name: true } } } },
          vendor: { select: { vendorName: true, store: { select: { id: true, name: true } } } },
          issuedByUser: { select: { username: true } },
        }
      }),
      prisma.check.count({ where })
    ]);

    return NextResponse.json({ checks, total });
  } catch (error) {
    console.error('Error fetching checks:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch checks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/checks - Create a new check
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication token missing' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const userId = decoded?.userId || decoded?.id;

    const body = await request.json();
    const { paymentMethod, bankId, vendorId, amount, memo, status, invoiceUrl } = body;

    // Map frontend enum values to Prisma enum values
    const paymentMethodMap: Record<string, string> = {
      'Cheque': 'CHECK',
      'EDI': 'EDI',
      'MO': 'MO',
      'Cash': 'CASH'
    };

    const statusMap: Record<string, string> = {
      'Draft': 'DRAFT',
      'Issued': 'ISSUED',
      'Cleared': 'CLEARED',
      'Void': 'VOID',
      'Cancelled': 'CANCELLED'
    };

    const mappedPaymentMethod = paymentMethodMap[paymentMethod] || paymentMethod;
    const mappedStatus = statusMap[status] || status || 'DRAFT';

    // Compute next check number using SystemCounter in a transaction to avoid race conditions
    let checkNumber: string | undefined = undefined;
    const assignedNum = await prisma.$transaction(async (tx) => {
      let counter = await tx.systemCounter.findUnique({ where: { key: 'global_check' } });
      if (!counter) {
        const rows = await tx.$queryRawUnsafe(
          "SELECT COALESCE(MAX(GREATEST(NULLIF(regexp_replace(check_number, '\\D','','g'), '')::int, NULLIF(regexp_replace(reference_number, '\\D','','g'), '')::int)), 0) AS maxn FROM checks"
        );
        const maxn = Array.isArray(rows) && rows.length ? Number((rows as any)[0].maxn || 0) : 0;
        const seed = Math.max(1000, maxn + 1);
        counter = await tx.systemCounter.create({ data: { key: 'global_check', nextNumber: seed } });
      }
      const toAssign = counter.nextNumber;
      await tx.systemCounter.update({ where: { key: 'global_check' }, data: { nextNumber: { increment: 1 } } });
      return toAssign;
    });
    checkNumber = String(assignedNum);

    // Compute next reference number without interactive transaction
    // Retry up to 3 times if unique constraint occurs under race
    let attempts = 0;
    let check;
    // Normalize reference as numeric sequence starting at 1000
    while (attempts < 3) {
      attempts++;
      const lastByRef = await prisma.check.findFirst({
        orderBy: { referenceNumber: 'desc' },
        select: { referenceNumber: true }
      });
      const lastNum = lastByRef?.referenceNumber ? parseInt(String(lastByRef.referenceNumber).replace(/\D/g, ''), 10) : NaN;
      const base = Number.isNaN(lastNum) ? 1000 : lastNum;
      const nextRef = String(base + 1);

      try {
        check = await prisma.check.create({
          data: {
            referenceNumber: nextRef,
            checkNumber: checkNumber || nextRef,
            paymentMethod: mappedPaymentMethod as any,
            bankId,
            vendorId,
            amount,
            memo,
            invoiceUrl,
            status: mappedStatus as any,
            issuedBy: userId,
            payeeName: 'Unknown',
          } as any,
          include: {
            bank: { select: { id: true, bankName: true, balance: true, accountType: true, isActive: true } },
            vendor: { select: { id: true, vendorName: true, vendorType: true, description: true, contactPerson: true, email: true, phone: true, address: true, isActive: true } },
            issuedByUser: { select: { id: true, username: true, email: true, role: true, isActive: true } },
          },
        });
        break; // success
      } catch (e: any) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          // loop to try again with next number
          continue;
        }
        throw e;
      }
    }

    return NextResponse.json(check, { status: 201 });
  } catch (error) {
    console.error('Error creating check:', error);
    return NextResponse.json({ 
      error: 'Failed to create check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
