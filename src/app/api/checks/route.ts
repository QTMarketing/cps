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

    const decoded: any = jwt.verify(
      bearerToken,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    const isAdmin = decoded?.role === 'ADMIN';

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const storeId = searchParams.get('storeId');

    // Build where clause
    let where: Prisma.CheckWhereInput = {};

    // For non-admin users, only show checks for banks assigned to them
    const requiresUserFilter = !isAdmin && decoded?.userId;

    // Build search terms for check-level fields
    const checkLevelSearchTerms: Prisma.CheckWhereInput[] = [];
    if (search) {
      // Check-level search terms (memo, payee_name, check_number)
      checkLevelSearchTerms.push({ memo: { contains: search, mode: 'insensitive' } });
      checkLevelSearchTerms.push({ payee_name: { contains: search, mode: 'insensitive' } });

      const numericSearch = Number(search);
      if (!Number.isNaN(numericSearch)) {
        checkLevelSearchTerms.push({ check_number: BigInt(Math.trunc(numericSearch)) });
      }
    }

    // Build bank filter conditions
    let bankFilter: any = {};
    if (requiresUserFilter) {
      bankFilter.assigned_to_user_id = decoded!.userId;
    }

    // Add bank search conditions if search is provided
    if (search) {
      // Combine user filter with bank search
      if (requiresUserFilter) {
        // When user filter exists, combine it with bank search using AND
        bankFilter.AND = [
          { assigned_to_user_id: decoded!.userId },
          {
            OR: [
              { dba: { contains: search, mode: 'insensitive' } },
              { bank_name: { contains: search, mode: 'insensitive' } },
            ],
          },
        ];
        // Remove the top-level assigned_to_user_id since we're using AND
        delete bankFilter.assigned_to_user_id;
      } else {
        // No user filter, just search by DBA and bank name
        bankFilter.OR = [
          { dba: { contains: search, mode: 'insensitive' } },
          { bank_name: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    // Combine all conditions
    const allSearchTerms: Prisma.CheckWhereInput[] = [...checkLevelSearchTerms];
    
    // Add bank filter if it has conditions
    if (Object.keys(bankFilter).length > 0) {
      allSearchTerms.push({ Bank: bankFilter });
    }

    if (allSearchTerms.length > 0) {
      if (allSearchTerms.length === 1) {
        where = allSearchTerms[0];
      } else {
        where = { OR: allSearchTerms };
      }
    }

    // Status, vendorId, and storeId filters are not supported in current schema
    // Note: The Check model doesn't have status, vendor, or store fields
    // These filters are ignored for now

    const [checks, total] = await Promise.all([
      prisma.check.findMany({
        where,
        skip: page * limit,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          created_at: true,
          check_number: true,
          amount: true,
          memo: true,
          payee_name: true,
          invoice_url: true,
          Vendor: {
            select: {
              id: true,
              vendor_name: true,
              vendor_type: true,
            },
          },
          issued_by_username: true,
          Bank: {
            select: {
              id: true,
              bank_name: true,
              dba: true,
              account_type: true,
              routing_number: true,
              account_number: true,
              signature_url: true,
              BankSigner: {
                where: { is_default: true },
                select: {
                  Signer: {
                    select: {
                      Signature: {
                        where: { is_active: true },
                        orderBy: { uploaded_at: 'desc' },
                        take: 1,
                        select: { url: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.check.count({ where })
    ]);

    const payload = checks.map((check) => ({
      id: check.id.toString(),
      createdAt: check.created_at,
      created_at: check.created_at, // Include both formats for compatibility
      checkNumber: Number(check.check_number),
      check_number: Number(check.check_number), // Include both formats for compatibility
      bank: {
        id: check.Bank.id.toString(),
        bankName: check.Bank.bank_name,
        dba: check.Bank.dba,
        accountType: check.Bank.account_type,
        routingNumber: check.Bank.routing_number?.toString() || null,
        accountNumber: check.Bank.account_number?.toString() || null,
        signatureUrl:
          check.Bank.signature_url ||
          check.Bank.BankSigner?.[0]?.Signer?.Signature?.[0]?.url ||
          null,
      },
      dba: check.Bank.dba ?? null, // DBA at top level for easy access
      amount: check.amount ? Number(check.amount) : 0,
      memo: check.memo ?? null,
      payeeName: check.Vendor?.vendor_name ?? check.payee_name ?? null,
      payee_name: check.Vendor?.vendor_name ?? check.payee_name ?? null, // Include both formats for compatibility
      status: 'ISSUED', // Default status since Check model doesn't have status field
      paymentMethod: 'CHECK', // Default payment method
      payment_method: 'CHECK', // Include both formats for compatibility
      invoiceUrl: check.invoice_url ?? null,
      invoice_url: check.invoice_url ?? null,
      vendor: check.Vendor
        ? {
            id: check.Vendor.id.toString(),
            vendorName: check.Vendor.vendor_name,
            vendorType: check.Vendor.vendor_type,
          }
        : check.payee_name
        ? {
            vendorName: check.payee_name,
          }
        : null,
      store: null,
      issuedByUser: {
        username: check.issued_by_username ?? 'Unknown',
      },
      userName: check.issued_by_username ?? 'Unknown',
    }));

    return NextResponse.json({ checks: payload, total });
  } catch (error) {
    console.error('Error fetching checks:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined;
    const errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(errorStack && { stack: errorStack })
    } : { error: String(error) };
    
    return NextResponse.json({ 
      error: 'Failed to fetch checks',
      message: errorMessage,
      details: errorDetails
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
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    const issuedByUsername = decoded?.username || decoded?.userName || 'Unknown';

    const body = await request.json();
    const {
      bankId,
      amount,
      memo,
      payeeName,
      vendorId,
    } = body || {};

    const vendorIdInt = vendorId ? parseInt(vendorId, 10) : null;
    if (vendorId && Number.isNaN(vendorIdInt)) {
      return NextResponse.json({ error: 'Invalid vendorId' }, { status: 400 });
    }

    if (!bankId) {
      return NextResponse.json({ error: 'bankId is required' }, { status: 400 });
    }

    const numericAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (Number.isNaN(numericAmount) || numericAmount == null) {
      return NextResponse.json({ error: 'amount is required' }, { status: 400 });
    }

    // Fetch vendor name if vendorId is provided
    let finalPayeeName = payeeName;
    if (vendorIdInt && !payeeName) {
      try {
        const vendor = await prisma.vendor.findUnique({
          where: { id: vendorIdInt },
          select: { vendor_name: true },
        });
        if (vendor) {
          finalPayeeName = vendor.vendor_name;
        }
      } catch (e) {
        console.warn('Failed to fetch vendor name:', e);
      }
    }

    const created = await prisma.check.create({
      data: {
        bank_id: Number(bankId),
        vendor_id: vendorIdInt,
        amount: new Prisma.Decimal(numericAmount),
        memo: memo ?? null,
        payee_name: finalPayeeName ?? null,
        issued_by_username: issuedByUsername,
      },
      include: {
        Bank: {
          select: {
            id: true,
            bank_name: true,
            dba: true,
            account_type: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: created.id.toString(),
        checkNumber: Number(created.check_number),
        bankId: created.Bank.id.toString(),
        amount: created.amount ? Number(created.amount) : 0,
        memo: created.memo ?? null,
        payeeName: created.payee_name ?? null,
        invoiceUrl: created.invoice_url ?? null,
        paymentMethod: 'CHECK',
        createdAt: created.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating check:', error);
    return NextResponse.json({ 
      error: 'Failed to create check',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
