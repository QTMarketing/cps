import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bankId = searchParams.get('bankId') || '';
    if (!bankId) {
      return NextResponse.json({ error: 'bankId is required' }, { status: 400 });
    }

    // Read from global SystemCounter; if missing, seed from DB with floor 1000
    let counter = await prisma.systemCounter.findUnique({ where: { key: 'global_check' } });
    if (!counter) {
      const rows = await prisma.$queryRawUnsafe(
        "SELECT COALESCE(MAX(GREATEST(NULLIF(regexp_replace(check_number, '\\D','','g'), '')::int, NULLIF(regexp_replace(reference_number, '\\D','','g'), '')::int)), 0) AS maxn FROM checks"
      );
      const maxn = Array.isArray(rows) && rows.length ? Number((rows as any)[0].maxn || 0) : 0;
      const seed = Math.max(1000, maxn + 1);
      counter = await prisma.systemCounter.create({ data: { key: 'global_check', nextNumber: seed } });
    }
    const next = counter.nextNumber;

    return NextResponse.json({ next });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to compute next check number' }, { status: 500 });
  }
}


