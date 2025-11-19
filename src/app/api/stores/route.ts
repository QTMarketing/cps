import { NextResponse } from 'next/server';

// GET /api/stores - Get all stores (Manager+ only)
export async function GET() {
  // Stores are not part of the current schema; return an empty list for now.
  return NextResponse.json({ stores: [] });
}

// POST /api/stores - Create a new store (Admin only)
export async function POST() {
  return NextResponse.json(
    { error: 'Store management not yet implemented' },
    { status: 501 }
  );
}
