import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, Role } from '@/lib/rbac';
import { z } from 'zod';

const schema = z.object({
  bankIds: z.array(z.string().min(1)).min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  if (response) return response;

  try {
    const userId = parseInt(params.id, 10);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { bankIds } = schema.parse(body);

    // Convert bankIds to numbers
    const bankIdNumbers = bankIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));

    if (bankIdNumbers.length === 0) {
      return NextResponse.json({ error: 'No valid bank IDs provided' }, { status: 400 });
    }

    // Update banks to assign them to the user
    await prisma.bank.updateMany({
      where: {
        id: { in: bankIdNumbers },
      },
      data: {
        assigned_to_user_id: userId,
      },
    });

    return NextResponse.json({ ok: true, assigned: bankIdNumbers.length });
  } catch (e: any) {
    console.error('Error assigning banks:', e);
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to assign banks', details: e?.message },
      { status: 500 }
    );
  }
}

