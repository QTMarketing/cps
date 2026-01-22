"use client";

import { cn } from "@/lib/utils";
import { ChequeViewModel } from "@/lib/cheques/types";
import { useEffect, useState, useMemo } from "react";

interface Props {
  cheque: ChequeViewModel;
  className?: string;
}

// Helper function to normalize signature URL
function normalizeSignatureUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // If already an absolute URL (starts with http:// or https://), check if it needs API route conversion
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // For .tif files, convert to API route
    // Check if URL contains /uploads/signatures/ and ends with .tif or .tiff (or has query params)
    if (url.includes("/uploads/signatures/") && (url.includes(".tif") || url.includes(".tiff"))) {
      // Extract filename - handle query parameters and fragments
      const urlWithoutQuery = url.split("?")[0].split("#")[0];
      const fileName = urlWithoutQuery.split("/uploads/signatures/")[1];
      if (typeof window !== "undefined") {
        return `${window.location.origin}/api/uploads/signatures/${fileName}`;
      }
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
      return `${baseUrl}/api/uploads/signatures/${fileName}`;
    }
    return url;
  }
  
  // If it's a relative URL starting with /, convert to absolute using current origin
  if (url.startsWith("/")) {
    // For signature files in /uploads/signatures/, use the API route for .tif files
    // since browsers may not display .tif files directly from public folder
    if (url.includes("/uploads/signatures/") && (url.endsWith(".tif") || url.endsWith(".tiff"))) {
      // Convert /uploads/signatures/filename.tif to /api/uploads/signatures/filename.tif
      const fileName = url.replace("/uploads/signatures/", "");
      if (typeof window !== "undefined") {
        return `${window.location.origin}/api/uploads/signatures/${fileName}`;
      }
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
      return `${baseUrl}/api/uploads/signatures/${fileName}`;
    }
    
    if (typeof window !== "undefined") {
      return `${window.location.origin}${url}`;
    }
    // Server-side: use environment variable or default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
    return `${baseUrl}${url}`;
  }
  
  // If it starts with "uploads/" or contains "signatures/", prepend "/"
  if (url.startsWith("uploads/") || url.includes("signatures/")) {
    const normalizedPath = url.startsWith("/") ? url : `/${url}`;
    // For .tif files, use API route
    if (normalizedPath.includes("/uploads/signatures/") && (normalizedPath.endsWith(".tif") || normalizedPath.endsWith(".tiff"))) {
      const fileName = normalizedPath.replace("/uploads/signatures/", "");
      if (typeof window !== "undefined") {
        return `${window.location.origin}/api/uploads/signatures/${fileName}`;
      }
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
      return `${baseUrl}/api/uploads/signatures/${fileName}`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}${normalizedPath}`;
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
    return `${baseUrl}${normalizedPath}`;
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
  
  // If it's just a filename, assume it's in /uploads/signatures/
  if (!url.includes("/") && url.includes(".")) {
    // For .tif files, use API route
    if (url.endsWith(".tif") || url.endsWith(".tiff")) {
      if (typeof window !== "undefined") {
        return `${window.location.origin}/api/uploads/signatures/${url}`;
      }
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
      return `${baseUrl}/api/uploads/signatures/${url}`;
    }
    const normalizedPath = `/uploads/signatures/${url}`;
    if (typeof window !== "undefined") {
      return `${window.location.origin}${normalizedPath}`;
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000";
    return `${baseUrl}${normalizedPath}`;
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

const getStoreNumber = (storeName?: string | null) => {
  if (!storeName) return "";
  const match = storeName.match(/\d+/);
  return match ? match[0] : "";
};

export const buildMicrFromCheque = (cheque: ChequeViewModel) => {
  // MICR line format: ⑆ check_number ⑈ routing_number ⑈ account_number ⑈
  // ⑆ = Transit symbol (U+2446)
  // ⑈ = On-us symbol (U+2448)
  const TRANSIT_SYMBOL = String.fromCharCode(0x2446); // ⑆
  const ON_US_SYMBOL = String.fromCharCode(0x2448);   // ⑈
  
  // cheque.number already has the store prefix, so use it directly
  const checkNumberNormalized = normalizeDigits(cheque.number || "", 9);
  const routing = normalizeDigits(cheque.bank.routingNumber, 9);
  const account = normalizeDigits(cheque.bank.accountNumber, 9);
  
  // Format: ⑆ check_number ⑈ routing_number ⑈ account_number ⑈
  return `${TRANSIT_SYMBOL} ${checkNumberNormalized} ${ON_US_SYMBOL} ${routing} ${ON_US_SYMBOL} ${account} ${ON_US_SYMBOL}`;
};

export function ChequeLayout({ cheque, className }: Props) {
  const [signatureError, setSignatureError] = useState(false);
  const normalizedSignatureUrl = useMemo(
    () => normalizeSignatureUrl(cheque.bank.signatureUrl),
    [cheque.bank.signatureUrl]
  );
  const corporation = cheque.bank.corporation;
  
  useEffect(() => {
    setSignatureError(false);
    if (cheque.bank.signatureUrl) {
      console.log('Cheque signature URL:', cheque.bank.signatureUrl);
      console.log('Normalized signature URL:', normalizedSignatureUrl);
    } else {
      console.warn('No signature URL found for cheque:', cheque.id);
    }
  }, [normalizedSignatureUrl, cheque.bank.signatureUrl, cheque.id]);
  
  const formattedDate = new Date(cheque.createdAt).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
  
  // cheque.number already has the store prefix from formatCheckNumber, so use it directly
  const checkNumber = cheque.number || "N/A";
  
  return (
    <div className={cn("cheque-container", className)}>
      {/* Top Section: Business Info (Left), Bank Name (Center), Date/Check Number (Right) */}
      <div className="cheque-header">
        <div className="cheque-header-left">
          {corporation ? (
            <>
              <div className="business-name">{corporation.name}</div>
              {cheque.bank.dba && <div className="business-dba">{cheque.bank.dba}</div>}
            </>
          ) : (
            <>
              {cheque.bank.accountName && (
                <div className="business-name">{cheque.bank.accountName}</div>
              )}
              {cheque.bank.dba && <div className="business-dba">{cheque.bank.dba}</div>}
            </>
          )}
          {cheque.bank.addressLine1 && (
            <div className="business-address">{cheque.bank.addressLine1}</div>
          )}
          {cheque.bank.cityStateZip && (
            <div className="business-address">{cheque.bank.cityStateZip}</div>
          )}
        </div>
        <div className="cheque-header-center">
          <div className="bank-name-header">{cheque.bank.name}</div>
        </div>
        <div className="cheque-header-right">
          <div className="cheque-date">Date: {formattedDate}</div>
          <div className="cheque-number">No. {checkNumber}</div>
        </div>
      </div>

      {/* Center Section: Payee and Amount */}
      <div className="cheque-payee-section">
        <div className="payee-container">
          <div className="pay-to-label">PAY TO THE ORDER OF</div>
          <div className="payee-name">{cheque.payee.name || 'N/A'}</div>
          <div className="payee-line" />
        </div>
        <div className="amount-container">
          <div className="amount-value">{currency.format(cheque.amount)}</div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="amount-words-section">
        <div className="amount-words-text">{cheque.amountWords}</div>
        <div className="amount-words-line" />
      </div>

      {/* Bottom Section: Memo (Left) and Signature (Right) */}
      <div className="cheque-footer">
        <div className="memo-section">
          <div className="memo-label">Memo:</div>
          <div className="memo-value">{cheque.memo || "\u00A0"}</div>
        </div>
        <div className="signature-section">
          {normalizedSignatureUrl && !signatureError && (
            <img 
              src={normalizedSignatureUrl} 
              alt="Authorized signature"
              className="signature-image"
              onError={(e) => {
                console.error('Signature image failed to load:', normalizedSignatureUrl, e);
                setSignatureError(true);
              }}
              onLoad={() => {
                console.log('Signature image loaded successfully:', normalizedSignatureUrl);
                setSignatureError(false);
              }}
            />
          )}
          <div className="signature-line" />
          <div className="signature-label">AUTHORIZED SIGNATURE</div>
        </div>
      </div>

      {/* MICR Line Footer */}
      <div className="micr-section">
      <div className="micr-line">{buildMicrFromCheque(cheque)}</div>
      </div>

      {/* Detachable Stub */}
      <div className="cheque-stub">
        <div className="stub-perforation">
          <div className="perforation-line"></div>
          <div className="perforation-label">DETACH HERE</div>
          <div className="perforation-line"></div>
        </div>
        <div className="stub-content">
          <div className="stub-header">PAYMENT SUMMARY</div>
          <div className="stub-details">
            <div className="stub-row">
              <span className="stub-label">Payee:</span>
              <span className="stub-value">{cheque.payee.name || 'N/A'}</span>
            </div>
            <div className="stub-row">
              <span className="stub-label">Amount:</span>
              <span className="stub-value">{currency.format(cheque.amount)}</span>
            </div>
            <div className="stub-row">
              <span className="stub-label">Date:</span>
              <span className="stub-value">{formattedDate}</span>
            </div>
            {cheque.memo && (
              <div className="stub-row">
                <span className="stub-label">Memo:</span>
                <span className="stub-value">{cheque.memo}</span>
              </div>
            )}
            <div className="stub-row">
              <span className="stub-label">Bank:</span>
              <span className="stub-value">{cheque.bank.name}</span>
            </div>
            <div className="stub-row">
              <span className="stub-label">Account Number:</span>
              <span className="stub-value">{cheque.bank.accountNumber}</span>
            </div>
            <div className="stub-row">
              <span className="stub-label">Check Number:</span>
              <span className="stub-value">{checkNumber}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

