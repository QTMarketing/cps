import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const START_NUMBER = 1001;

export async function GET(_req: NextRequest) {
  try {
    const lastByRef = await prisma.check.findFirst({
      where: { referenceNumber: { not: null as any } },
      orderBy: { referenceNumber: 'desc' },
      select: { referenceNumber: true }
    });

    const lastByLegacy = await prisma.check.findFirst({
      where: { checkNumber: { not: null as any } },
      orderBy: { checkNumber: 'desc' },
      select: { checkNumber: true }
    });

    const nums: number[] = [];
    if (lastByRef?.referenceNumber) {
      const n = parseInt(String(lastByRef.referenceNumber).replace(/\D/g, ''), 10);
      if (!Number.isNaN(n)) nums.push(n);
    }
    if (lastByLegacy?.checkNumber) {
      const n = parseInt(String(lastByLegacy.checkNumber).replace(/\D/g, ''), 10);
      if (!Number.isNaN(n)) nums.push(n);
    }

    const last = nums.length ? Math.max(...nums) : START_NUMBER - 1;
    const next = last + 1;
    return NextResponse.json({ next: String(next) });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to compute next number', details: e?.message }, { status: 500 });
  }
}


