"use client";

import { supabase, supabaseHelpers } from "@/lib/supabase";

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"] as const;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function getExt(type: string, fallback = "bin"): string {
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return fallback;
}

export async function uploadInvoice(file: File, { checkNumber }: { checkNumber: string }) {
  if (!ALLOWED.includes(file.type as any)) {
    throw new Error("Invalid file type. Only PDF, PNG, JPG allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File too large. Max 10 MB.");
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const ts = now.getTime();
  const ext = getExt(file.type);

  const path = `invoices/${yyyy}/${mm}/${checkNumber}-${ts}.${ext}`;

  const { error } = await supabase.storage.from("invoices").upload(path, file, {
    upsert: false,
    cacheControl: "3600",
    contentType: file.type,
  });
  if (error) {
    throw new Error(error.message);
  }

  const publicUrl = supabaseHelpers.getPublicUrl("invoices", path);
  return publicUrl;
}


