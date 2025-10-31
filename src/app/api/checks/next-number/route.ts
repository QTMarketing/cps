import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const runtime = 'nodejs';

const START_NUMBER = 1001;

export async function GET(_req: NextRequest) {
  try {
    // Use a single numeric MAX across both columns for reliability
    const rows: Array<{ m: number | null }> = await prisma.$queryRawUnsafe(
      `SELECT GREATEST(
         COALESCE(MAX(NULLIF(reference_number,'')::int),0),
         COALESCE(MAX(NULLIF(check_number,'')::int),0)
       ) AS m FROM checks`
    );
    const last = rows?.[0]?.m ?? 0;
    const next = (last || 0) < START_NUMBER ? START_NUMBER : (last + 1);
    return NextResponse.json({ next: String(next) });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to compute next number', details: e?.message }, { status: 500 });
  }
}


