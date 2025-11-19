import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, Role } from '@/lib/rbac';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().min(1),
  accountIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  const roleCheck = requireRole(Role.ADMIN);
  const response = await roleCheck(req);
  if (response) return response;

  try {
    const body = await req.json();
    const { userId, accountIds } = schema.parse(body);

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Convert accountIds to numbers
    const bankIdNumbers = accountIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));

    if (bankIdNumbers.length === 0) {
      return NextResponse.json({ error: 'No valid bank IDs provided' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userIdNum },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Unassign banks by setting assigned_to_user_id to null
    // Only unassign banks that are currently assigned to this user
    const result = await prisma.bank.updateMany({
      where: {
        id: { in: bankIdNumbers },
        assigned_to_user_id: userIdNum, // Only unassign if currently assigned to this user
      },
      data: {
        assigned_to_user_id: null,
      },
    });

    return NextResponse.json({ 
      ok: true, 
      unassigned: result.count,
      message: `Successfully unassigned ${result.count} bank(s)`
    });
  } catch (e: any) {
    console.error('Error unassigning account:', e);
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: e.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to unassign accounts', details: e?.message },
      { status: 500 }
    );
  }
}
