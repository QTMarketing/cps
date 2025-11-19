"use client";

import { cn } from "@/lib/utils";
import { ChequeViewModel } from "@/lib/cheques/types";
import { useState } from "react";

interface Props {
  cheque: ChequeViewModel;
  className?: string;
}

// Helper function to normalize signature URL
function normalizeSignatureUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If already an absolute URL (starts with http:// or https://), return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  // If it's a relative URL starting with /, convert to absolute using current origin
  if (url.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${url}`;
    }
    // Server-side: use environment variable or default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
    return `${baseUrl}${url}`;
  }
  
  // If it's a Supabase Storage path without full URL, construct it
  if (url.includes("/storage/") && !url.startsWith("http")) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    if (supabaseUrl) {
      // If URL already has /storage/, just prepend the base URL
      if (url.startsWith("/storage/")) {
        return `${supabaseUrl}${url}`;
      }
      // Otherwise construct the full public URL
      return `${supabaseUrl}/storage/v1/object/public/${url}`;
    }
  }
  
  return url;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatDate = (input: string) =>
  new Date(input).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const normalizeDigits = (value: string, length: number) =>
  value.replace(/\D/g, "").padStart(length, "0");

export const buildMicrFromCheque = (cheque: ChequeViewModel) => {
  const number = normalizeDigits(cheque.number, 6);
  const routing = normalizeDigits(cheque.bank.routingNumber, 9);
  const account = normalizeDigits(cheque.bank.accountNumber, 9);
  return `⛓ ${number}     ${routing}     ${account}`;
};

export function ChequeLayout({ cheque, className }: Props) {
  const [signatureError, setSignatureError] = useState(false);
  const normalizedSignatureUrl = normalizeSignatureUrl(cheque.bank.signatureUrl);
  
  return (
    <div className={cn("cheque-container", className)}>
      <span className="cheque-status">ISSUED</span>

      <div className="cheque-section items-start">
        <div className="bank-block space-y-1">
          {cheque.bank.accountName && (
            <p className="bank-account-line bank-account-name">{cheque.bank.accountName}</p>
          )}
          {cheque.bank.dba && <p className="bank-account-line bank-dba">{cheque.bank.dba}</p>}
          {cheque.bank.addressLine1 && (
            <p className="bank-account-line">{cheque.bank.addressLine1}</p>
          )}
          {cheque.bank.cityStateZip && (
            <p className="bank-account-line">{cheque.bank.cityStateZip}</p>
          )}
        </div>
        <div className="flex-1 text-center">
          <h3 className="bank-center-name">{cheque.bank.name}</h3>
        </div>
        <div className="cheque-meta text-right">
          <div>Cheque #{cheque.number || "N/A"}</div>
          <div>{formatDate(cheque.createdAt)}</div>
        </div>
      </div>

      <div className="cheque-section">
        <div className="payee-line">
          <label className="payee-label">Pay to the Order of</label>
          <div className="payee-name">{cheque.payee.name}</div>
          <div className="payee-rule" />
        </div>
        <div className="amount-box">{currency.format(cheque.amount)}</div>
      </div>

      <div className="amount-words">{cheque.amountWords}</div>

      <div className="cheque-footer">
        <div className="cheque-memo">
          Memo:
          <span>{cheque.memo || "\u00A0"}</span>
        </div>
        <div className="signature-container">
          {normalizedSignatureUrl && !signatureError && (
            <img 
              src={normalizedSignatureUrl} 
              alt="Authorized signature"
              onError={() => {
                console.error("Failed to load signature image from:", normalizedSignatureUrl);
                setSignatureError(true);
              }}
              onLoad={() => setSignatureError(false)}
              style={{ maxWidth: "100%", height: "auto" }}
            />
          )}
          <div className="signature-line" />
          <div className="signature-label">Signature</div>
        </div>
      </div>

      <div className="micr-line">{buildMicrFromCheque(cheque)}</div>
    </div>
  );
}

