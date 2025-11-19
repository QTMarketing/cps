import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { storeSchema } from "./schema";
import { prisma } from "@/lib/prisma";
import { uploadBufferToSupabase } from "@/lib/storage";
import { SUPABASE_STORES_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const readString = (key: string, required = false) => {
      const value = formData.get(key);
      if (typeof value !== "string") {
        return required ? "" : undefined;
      }
      const trimmed = value.trim();
      return required ? trimmed : trimmed || undefined;
    };

    const payload = {
      name: readString("name", true),
      address: readString("address", true),
      email: readString("email"),
      phone: readString("phone"),
      region: readString("region"),
      storeType: readString("storeType"),
      managerId: formData.get("managerId"),
    };

    const parsed = storeSchema.parse(payload);

    let photoUrl: string | null = null;
    const photo = formData.get("photo");

    if (photo instanceof File && photo.size > 0) {
      const photoBuffer = Buffer.from(await photo.arrayBuffer());
      const sanitizedName = photo.name.replace(/\s+/g, "-");
      const filePath = `stores/${Date.now()}-${sanitizedName}`;

      const { publicUrl } = await uploadBufferToSupabase(
        filePath,
        photoBuffer,
        photo.type || "application/octet-stream",
        SUPABASE_STORES_BUCKET
      );

      photoUrl = publicUrl;
    }

    const store = await prisma.store.create({
      data: {
        name: parsed.name,
        address: parsed.address,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        region: parsed.region ?? null,
        storeType: parsed.storeType ?? null,
        managerId: parsed.managerId ?? null,
        photoUrl,
      },
    });

    const accept = req.headers.get("accept") || "";
    if (accept.includes("application/json")) {
      return NextResponse.json({ ok: true, store }, { status: 201 });
    }

    return NextResponse.redirect(new URL("/stores", req.url), {
      status: 303,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Store creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create store" },
      { status: 500 }
    );
  }
}

