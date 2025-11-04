"use server";

import { typedSupabaseAdmin } from "@/lib/supabase";

export async function listVendors(): Promise<{ id: string; name: string; }[]> {
  const { data, error } = await (typedSupabaseAdmin
    .from('vendors')
    .select('id, vendor_name')
    .order('vendor_name') as any);
  if (error) return [];
  return (data || []).map((v: any) => ({ id: v.id, name: v.vendor_name }));
}

export async function listStores(): Promise<{ id: string; name: string; }[]> {
  const { data, error } = await (typedSupabaseAdmin
    .from('stores')
    .select('id, name')
    .order('name') as any);
  if (error) return [];
  return (data || []).map((s: any) => ({ id: s.id, name: s.name }));
}


