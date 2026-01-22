import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonGuardError, requireAuth } from "@/lib/guards";
import { generateChequePDF } from "@/lib/pdf/generateChequePDF";
import { chequeSelect, mapChequeRecord } from "@/lib/cheques/transformers";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
    const { id } = await context.params;
    const idParam = id;
    const checkId = parseInt(idParam, 10);
    if (Number.isNaN(checkId)) {
      return NextResponse.json({ error: "Invalid cheque id" }, { status: 400 });
    }

    const check = await prisma.check.findUnique({
      where: { id: checkId },
      select: chequeSelect,
    });

    if (!check) {
      return NextResponse.json({ error: "Cheque not found" }, { status: 404 });
    }

    // Attempt to find the store name associated with the user who issued the check
    let storeName: string | null = null;
    if (check.issued_by_username) {
      try {
        const userWithStore = await prisma.user.findUnique({
          where: { username: check.issued_by_username },
          select: {
            managedStores: {
              select: { name: true },
              take: 1,
            },
          },
        });
        if (userWithStore?.managedStores?.[0]) {
          storeName = userWithStore.managedStores[0].name;
        }
      } catch (e) {
        console.warn("Failed to fetch store for check issued by:", check.issued_by_username, e);
      }
    }

    const cheque = mapChequeRecord({ ...check, store_name: storeName } as any);
    const pdfBytes = await generateChequePDF(cheque);

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cheque-${cheque.number || checkId}.pdf"`,
      },
    });
  } catch (error) {
    if (typeof (error as any)?.status === "number") {
      return jsonGuardError(error);
    }
    console.error("Failed to render cheque PDF:", error);
    return NextResponse.json(
      { error: "Failed to render cheque PDF" },
      { status: 500 }
    );
  }
}

