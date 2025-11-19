import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// GET: return a fake array of corporations for now
export async function GET() {
  try {
    const fake = [
      { id: 1, name: 'Acme Holdings' },
      { id: 2, name: 'Global Retail Corp' },
      { id: 3, name: 'Northwest Foods LLC' },
    ];
    return NextResponse.json({ corporations: fake });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load corporations' }, { status: 500 });
  }
}

// POST: accept { name, owner, ein } and return mock id/name
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || '').trim();
    const owner = body?.owner ? String(body.owner) : null;
    const ein = body?.ein ? String(body.ein) : null;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Mock insert and id generation
    const id = Math.floor(Math.random() * 1_000_000) + 1;
    return NextResponse.json({ id, name, owner, ein }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to create corporation' }, { status: 500 });
  }
}



