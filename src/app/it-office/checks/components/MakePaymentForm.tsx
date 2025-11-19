"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listVendors, listBanks, createCheck, getNextCheckNumber, updateCheckInvoiceUrl } from "../lib/client-data";
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
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loadingCheckNumber, setLoadingCheckNumber] = useState(false);

  // options
  const [vendors, setVendors] = useState<Option[]>([]);
  const [banks, setBanks] = useState<{ id: string; name: string; storeId: string; }[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // load options
  useEffect(() => {
    (async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [vRes, bRes] = await Promise.allSettled([
          listVendors(),
          listBanks(),
        ]);

        const v = vRes.status === 'fulfilled' ? (vRes.value as { id: string; name: string }[]) : [];
        const b = bRes.status === 'fulfilled' ? (bRes.value as { id: string; name: string; storeId: string }[]) : [];

        setVendors(v);
        setBanks(b);

        if (vRes.status === 'rejected' || bRes.status === 'rejected') {
          console.warn('Some dropdowns failed to load');
        }
      } catch (error) {
        console.error("Failed to load options:", error);
        setOptionsError('Failed to load dropdown options. Please reload.');
      } finally {
        setLoadingOptions(false);
      }
    })()
  }, []);

  // Maintain bank on non-CASH; clear bank on CASH
  useEffect(() => {
    if (paymentMethod === 'CASH') {
      setBankId("");
    }
  }, [paymentMethod]);

  // Auto-fetch check number: for CASH use global, otherwise use bank-scoped
  useEffect(() => {
    const fetchNext = async () => {
      // For non-cash, require bankId
      if (paymentMethod !== 'CASH' && !bankId) {
        setCheckNumber("");
        return;
      }
      setLoadingCheckNumber(true);
      try {
        const num = await getNextCheckNumber(paymentMethod === 'CASH' ? undefined : bankId);
        setCheckNumber(String(num));
      } catch {
        setCheckNumber("");
      } finally {
        setLoadingCheckNumber(false);
      }
    };
    fetchNext();
  }, [paymentMethod, bankId]);

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
    if (paymentMethod !== 'CASH' && !bankId) errs.push("Bank is required");
    if (paymentMethod !== 'CASH' && !checkNumber) errs.push("Check Number is required");
    if (!vendorId) errs.push("Vendor is required");
    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) errs.push("Amount must be a number > 0");
    // 2 decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(amount)) errs.push("Amount must have at most 2 decimals");
    if (!file) errs.push("Invoice file is required");
    if (file) {
      if (!allowedMime.includes(file.type)) errs.push("File must be PDF, JPG, or PNG");
      if (file.size > maxBytes) errs.push("File size must be <= 10 MB");
    }
    if (memo && memo.length > 256) errs.push("Memo max 256 characters");
    return errs;
  };

  const onSubmit = async () => {
    setError(null);
    const errs = validate();
    if (errs.length) { setError(errs.join("\n")); return; }

    try {
      setSubmitting(true);
      
      // For CASH payments, use first available bank as placeholder (bankId is required in schema)
      // UI hides bank field for CASH, but we need a valid bankId for the database
      const effectiveBankId = paymentMethod === 'CASH' 
        ? (banks.length > 0 ? banks[0].id : bankId)
        : bankId;
      
      if (!effectiveBankId) {
        throw new Error("Bank is required. Please add a bank first.");
      }

      // Create check first
      const selectedVendor = vendors.find(v => v.id === vendorId);

      const res = await createCheck({
        paymentMethod,
        bankId: effectiveBankId,
        vendorId,
        payeeName: selectedVendor?.name,
        amount: Number(amount),
        memo: memo || undefined,
      });
      if (!res.ok || !res.id) {
        throw new Error(res.error || "Failed to create check");
      }

      // Upload file after check creation (use referenceNumber or checkNumber from response)
      if (!file) {
        throw new Error("Invoice file is required");
      }
      
      // Use referenceNumber from API response or fallback to checkNumber
      const checkNum = (res as any).referenceNumber || String(res.checkNumber || checkNumber || 'unknown');
      const invoiceUrl = await uploadInvoice(file, { checkNumber: checkNum });
      
      // Update check with invoice URL
      const updateRes = await updateCheckInvoiceUrl(res.id!, invoiceUrl);
      if (!updateRes.ok) {
        console.warn("Failed to update invoice URL:", updateRes.error);
        // Don't fail the whole operation, just warn
      }

      // reset
      setPaymentMethod("CHECK");
      setBankId("");
      setCheckNumber("");
      setVendorId("");
      setAmount("");
      setMemo("");
      setFile(null);

      // basic toast replacement
      alert("Check created successfully");
      // signal RecentChecks to refresh after a short delay to ensure DB is updated
      setTimeout(() => {
        try { window.dispatchEvent(new CustomEvent('checks:refresh')); } catch {}
      }, 500);
      onCreated?.(res.id);
    } catch (e: any) {
      console.error("Check creation error:", e);
      const message = e?.message || String(e) || "Failed to create check. Please try again.";
      setError(message);
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
        {(error || optionsError) && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-300 p-3 whitespace-pre-line">
            {error || optionsError}
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

        {/* Bank (hidden for CASH) */}
        {paymentMethod !== 'CASH' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bank *</label>
            <Select value={bankId} onValueChange={setBankId} disabled={loadingOptions}>
              <SelectTrigger>
                <SelectValue placeholder={loadingOptions ? "Loading banks..." : (banks.length ? "Select a bank" : "No banks available")} />
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
        )}

        {/* Check Number (auto-assigned, read-only). Always show; disabled unless ready. */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Check Number</label>
          <Input 
            placeholder={loadingCheckNumber ? "Loading..." : "Auto-assigned"} 
            value={checkNumber} 
            readOnly 
            disabled={loadingCheckNumber || (paymentMethod !== 'CASH' && !bankId)}
            className="bg-muted"
          />
          {paymentMethod !== 'CASH' && bankId && !loadingCheckNumber && checkNumber && (
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
          <label className="text-sm font-medium text-foreground">Invoice File * (PDF/JPG/PNG, max 10MB)</label>
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
          <Button onClick={onSubmit} disabled={submitting || (!bankId && paymentMethod !== 'CASH' && banks.length === 0) || (!checkNumber && paymentMethod !== 'CASH') || !vendorId || !amount || !file}>
            {submitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>) : 'Submit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


