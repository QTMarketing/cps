"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStores, listVendors, listBanks, createCheck, getNextCheckNumber, updateCheckInvoiceUrl } from "../lib/data";
import { uploadInvoice } from "../lib/upload";
import type { PaymentMethod } from "../lib/types";
import { useDropzone } from "react-dropzone";
import { FileText, Loader2, X } from "lucide-react";

type Props = { onCreated?: (newId: string) => void };

type Option = { id: string; name: string };

const allowedMime = ["application/pdf", "image/png", "image/jpeg"]; // pdf, png, jpg
const maxBytes = 10 * 1024 * 1024; // 10 MB

// superseded by Supabase storage upload in ../lib/upload

export default function MakePaymentForm({ onCreated }: Props) {
  // form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CHECK");
  const [bankId, setBankId] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingCheckNumber, setLoadingCheckNumber] = useState(false);

  // options
  const [vendors, setVendors] = useState<Option[]>([]);
  const [stores, setStores] = useState<Option[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string; storeId: string; }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load options
  useEffect(() => {
    (async () => {
      setLoadingOptions(true);
      try {
        const [v, s, b] = await Promise.all([listVendors(), listStores(), listBanks()]);
        setVendors(v);
        setStores(s);
        setBanks(b);
      } catch (error) {
        console.error("Failed to load options:", error);
      } finally {
        setLoadingOptions(false);
      }
    })()
  }, []);

  // Auto-fetch check number when bank is selected
  useEffect(() => {
    if (!bankId) {
      setCheckNumber("");
      return;
    }
    setLoadingCheckNumber(true);
    getNextCheckNumber(bankId)
      .then(num => setCheckNumber(String(num)))
      .catch(() => setCheckNumber(""))
      .finally(() => setLoadingCheckNumber(false));
  }, [bankId]);

  // file dropzone
  const onDrop = useCallback((accepted: File[]) => {
    if (!accepted?.length) return;
    const f = accepted[0];
    setFile(f);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"], "image/png": [".png"], "image/jpeg": [".jpg", ".jpeg"] },
    maxSize: maxBytes,
  });

  // validation helpers
  const validate = (): string[] => {
    const errs: string[] = [];
    if (!paymentMethod) errs.push("Payment method is required");
    if (!bankId) errs.push("Bank is required");
    if (!vendorId) errs.push("Vendor is required");
    if (!storeId) errs.push("Store is required");
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) errs.push("Amount must be a number > 0");
    // 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) errs.push("Amount must have at most 2 decimals");
    if (memo && memo.length > 256) errs.push("Memo max 256 characters");
    if (file) {
      if (!allowedMime.includes(file.type)) errs.push("File must be PDF, JPG, or PNG");
      if (file.size > maxBytes) errs.push("File size must be <= 10 MB");
    }
    return errs;
  };

  const onSubmit = async () => {
    setError(null);
    const errs = validate();
    if (errs.length) { setError(errs.join("\n")); return; }

    try {
      setSubmitting(true);
      
      // Create check first (server will auto-assign checkNumber)
      const res = await createCheck({
        paymentMethod,
        bankId,
        // checkNumber omitted - server will auto-assign via getNextCheckNumber
        vendorId,
        storeId,
        amount: Number(amount),
        memo: memo || undefined,
      });
      if (!res.ok || !res.id || !res.checkNumber) throw new Error(res.error || "Create failed");

      // Upload file after check creation using the assigned check number
      if (file && res.checkNumber) {
        const invoiceUrl = await uploadInvoice(file, { checkNumber: String(res.checkNumber) });
        // Update check with invoice URL
        await updateCheckInvoiceUrl(res.id!, invoiceUrl);
      }

      // reset
      setPaymentMethod("CHECK");
      setBankId("");
      setCheckNumber("");
      setVendorId("");
      setStoreId("");
      setAmount("");
      setMemo("");
      setFile(null);

      // basic toast replacement
      alert("Check created");
      onCreated?.(res.id);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  // currency mask on blur
  const formatAmount = () => {
    if (!amount) return;
    const n = Number(amount);
    if (!isNaN(n)) setAmount(n.toFixed(2));
  };

  const paymentOptions: { label: string; value: PaymentMethod }[] = useMemo(() => ([
    { label: "Check", value: "CHECK" },
    { label: "EDI", value: "EDI" },
    { label: "MO", value: "MO" },
    { label: "Cash", value: "CASH" },
  ]), []);

  return (
    <Card className="bg-background">
      <CardHeader>
        <CardTitle>Make a Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-300 p-3 whitespace-pre-line">
            {error}
          </div>
        )}

        {/* Payment method (radio) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Payment Method</label>
          <div className="grid grid-cols-4 gap-2">
            {paymentOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMethod(opt.value)}
                className={`px-3 py-2 rounded-md border text-sm ${paymentMethod === opt.value ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground border-border'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bank */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Bank *</label>
          <Select value={bankId} onValueChange={setBankId} disabled={loadingOptions}>
            <SelectTrigger>
              <SelectValue placeholder={loadingOptions ? "Loading banks..." : "Select a bank"} />
            </SelectTrigger>
            <SelectContent>
              {banks.length === 0 && !loadingOptions ? (
                <SelectItem value="no-banks" disabled>No banks available</SelectItem>
              ) : (
                banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)
              )}
            </SelectContent>
          </Select>
          {banks.length === 0 && !loadingOptions && (
            <p className="text-xs text-muted-foreground">Please add banks in the Add Bank section first.</p>
          )}
        </div>

        {/* Check Number (auto-assigned, read-only) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Check Number</label>
          <Input 
            placeholder={loadingCheckNumber ? "Loading..." : "Auto-assigned"} 
            value={checkNumber} 
            readOnly 
            disabled={loadingCheckNumber || !bankId}
            className="bg-muted"
          />
          {bankId && !loadingCheckNumber && checkNumber && (
            <p className="text-xs text-muted-foreground">Next check number for selected bank</p>
          )}
        </div>

        {/* Vendor */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Vendor</label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Store */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Store</label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Amount</label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={formatAmount}
          />
        </div>

        {/* Memo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Memo (optional)</label>
          <Textarea rows={3} placeholder="Optional memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>

        {/* File drag-drop */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">File (PDF/JPG/PNG, max 10MB)</label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer ${isDragActive ? 'border-primary' : 'border-border'}`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              {isDragActive ? 'Drop the file here...' : 'Drag & drop file here, or click to select'}
            </div>
          </div>
          {file && (
            <div className="inline-flex items-center gap-2 mt-2 px-2 py-1 rounded-full bg-muted text-foreground text-sm">
              <span className="truncate max-w-[220px]">{file.name}</span>
              <button type="button" className="hover:text-red-500" onClick={() => setFile(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>) : 'Submit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


