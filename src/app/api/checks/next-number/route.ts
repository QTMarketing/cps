import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';

const START_NUMBER = 1000;

export async function GET(_req: NextRequest) {
  try {
    // Prefer SystemCounter; seed from DB if missing
    let counter = await prisma.systemCounter.findUnique({ where: { key: 'global_check' } });
    if (!counter) {
      const rows: Array<{ maxn: number | null }> = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(MAX(GREATEST(
            NULLIF(regexp_replace(check_number, '\\D','','g'), '')::int,
            NULLIF(regexp_replace(reference_number, '\\D','','g'), '')::int
          )), 0) AS maxn FROM checks`
      );
      const maxn = rows?.[0]?.maxn ? Number(rows[0].maxn) : 0;
      const seed = Math.max(START_NUMBER, maxn + 1);
      counter = await prisma.systemCounter.create({ data: { key: 'global_check', nextNumber: seed } });
    }
    return NextResponse.json({ next: String(counter.nextNumber) });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to compute next number', details: e?.message }, { status: 500 });
  }
}


