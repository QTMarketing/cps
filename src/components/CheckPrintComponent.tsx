"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Printer, Eye, Download } from "lucide-react";
import ChequePreview from "@/components/cheques/ChequePreview";
import { ChequeViewModel } from "@/lib/cheques/types";

interface CheckSummary {
  id: string;
  referenceNumber?: string | number | null;
  checkNumber?: string | number | null;
}

interface CheckPrintProps {
  check: CheckSummary;
  onPrint?: () => void;
}

export default function CheckPrint({ check, onPrint }: CheckPrintProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [detail, setDetail] = useState<ChequeViewModel | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setIsDetailLoading(true);
      setDetailError(null);
      const res = await fetch(`/api/checks/${check.id}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Unable to load cheque details");
      }
      const data = await res.json();
      setDetail(data);
    } catch (err) {
      console.error(err);
      setDetailError(err instanceof Error ? err.message : "Failed to load cheque");
    } finally {
      setIsDetailLoading(false);
    }
  }, [check.id]);

  useEffect(() => {
    if (isPreviewOpen) {
      fetchDetail();
    }
  }, [isPreviewOpen, fetchDetail]);

  useEffect(() => {
    setDetail(null);
    setDetailError(null);
  }, [check.id]);

  const fetchPdfBlob = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/checks/${check.id}/pdf`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to generate cheque PDF");
      }
      return await res.blob();
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadPdf = async () => {
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const chequeNumber = detail?.number || check.referenceNumber || check.checkNumber || "cheque";
      link.href = url;
      link.download = `cheque-${chequeNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      onPrint?.();
    } catch (error) {
      console.error(error);
      alert("Unable to download cheque PDF. Please try again.");
    }
  };

  const printCheck = async () => {
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
      document.body.appendChild(iframe);
      onPrint?.();
    } catch (error) {
      console.error(error);
      alert("Unable to print cheque. Please try again.");
    }
  };

  const chequeLabel = detail?.number || check.referenceNumber || check.checkNumber || "N/A";

  return (
    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Cheque Preview #{chequeLabel}</DialogTitle>
          <DialogDescription>
            Review the cheque layout. Use the actions below to print or download a PDF copy.
          </DialogDescription>
        </DialogHeader>

        <ChequePreview cheque={detail} isLoading={isDetailLoading} error={detailError} />

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
            Close Preview
          </Button>
          <Button onClick={downloadPdf} disabled={isDownloading}>
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "Generating..." : "Download PDF"}
          </Button>
          <Button onClick={printCheck} disabled={isDownloading}>
            <Printer className="mr-2 h-4 w-4" />
            Print Check
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

