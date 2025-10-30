import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';

// GET /api/checks - Get all checks
export async function GET(request: NextRequest) {
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
    const isAdmin = decoded?.role === 'ADMIN';

    const whereClause = isAdmin ? {} : { issuedBy: decoded.userId };

    const checks = await prisma.check.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        bank: { select: { id: true, bankName: true } },
        vendor: { select: { vendorName: true } },
        issuedByUser: { select: { username: true } },
      }
    });

    return NextResponse.json(checks);
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

    const body = await request.json();
    const { paymentMethod, bankId, vendorId, amount, memo, status, issuedBy } = body;

    // Compute next reference number safely with retry on unique violation
    const createWithAutoNumber = async () => {
      return await prisma.$transaction(async (tx) => {
        const lastByRef = await tx.check.findFirst({
          orderBy: { referenceNumber: 'desc' },
          select: { referenceNumber: true }
        });
        const lastNum = lastByRef?.referenceNumber ? parseInt(String(lastByRef.referenceNumber).replace(/\D/g, ''), 10) : NaN;
        const base = Number.isNaN(lastNum) ? 1000 : lastNum;
        const nextRef = String(base + 1);

        const created = await tx.check.create({
          data: {
            referenceNumber: nextRef,
            paymentMethod,
            bankId,
            vendorId,
            amount,
            memo,
            status: status || 'ISSUED',
            issuedBy,
            payeeName: 'Unknown',
          } as any,
          include: {
            bank: { select: { id: true, bankName: true, balance: true, accountType: true, isActive: true } },
            vendor: { select: { id: true, vendorName: true, vendorType: true, description: true, contactPerson: true, email: true, phone: true, address: true, isActive: true } },
            issuedByUser: { select: { id: true, username: true, email: true, role: true, isActive: true } },
          },
        });
        return created;
      });
    };

    let check;
    try {
      check = await createWithAutoNumber();
    } catch (e: any) {
      // Retry once on unique constraint
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        check = await createWithAutoNumber();
      } else {
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
