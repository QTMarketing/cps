"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Printer, Eye, Download } from "lucide-react";
import jsPDF from "jspdf";

interface Check {
  id: string;
  checkNumber?: string;
  referenceNumber?: string;
  paymentMethod: string;
  amount: number;
  memo?: string;
  status: string;
  createdAt: string;
  bankId?: string;
  vendorId?: string;
  bank?: {
    id: string;
    bankName: string;
    accountNumber: string;
    routingNumber: string;
  };
  vendor?: {
    vendorName: string;
  };
  issuedByUser?: {
    username: string;
  };
}

interface CheckPrintProps {
  check: Check;
  onPrint?: () => void;
}

// Simple number to words conversion
const numberToWords = (num: number): string => {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num === 0) return 'zero';
  if (num < 0) return 'negative ' + numberToWords(-num);
  
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  
  return 'number too large';
};

export default function CheckPrint({ check, onPrint }: CheckPrintProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Convert amount to written words
  const amountToWords = (amount: number): string => {
    const dollars = Math.floor(amount);
    const cents = Math.round((amount - dollars) * 100);
    
    let result = numberToWords(dollars) + " dollars";
    if (cents > 0) {
      result += " and " + numberToWords(cents) + " cents";
    }
    
    return result;
  };

  // Format date for check
  const formatCheckDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Generate PDF
  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [8.5, 3.5], // Standard check size
      });

      // Set up fonts and colors
      doc.setFont("helvetica");
      doc.setFontSize(8);

      // Check background border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.01);
      doc.rect(0.25, 0.25, 8, 3);

      // Bank information (top left)
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(check.bank?.bankName || 'Unknown Bank', 0.5, 0.6);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Routing: ${check.bank?.routingNumber || 'N/A'}`, 0.5, 0.8);
      doc.text(`Account: ${check.bank?.accountNumber || 'N/A'}`, 0.5, 1.0);

      // Check number (top right)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`#${check.referenceNumber || check.checkNumber || 'N/A'}`, 7.5, 0.6, { align: "right" });

      // Date (top right, below check number)
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(formatCheckDate(check.createdAt), 7.5, 0.9, { align: "right" });

      // Payee name (left side, middle)
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(check.vendor?.vendorName || 'Unknown Vendor', 0.5, 1.4);

      // Amount in numbers (right side, middle)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const amountText = `$${Number(check.amount).toFixed(2)}`;
      doc.text(amountText, 7.5, 1.4, { align: "right" });

      // Amount in words (bottom left)
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const amountWords = amountToWords(Number(check.amount));
      doc.text(amountWords, 0.5, 1.8);

      // Memo (bottom right)
      if (check.memo) {
        doc.setFontSize(8);
        doc.text(`Memo: ${check.memo}`, 5.5, 1.8);
      }

      // Signature line (bottom)
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.01);
      doc.line(5.5, 2.8, 7.5, 2.8);
      doc.setFontSize(8);
      doc.text("Signature", 5.5, 2.9);

      // Issued by (bottom left)
      doc.setFontSize(7);
      doc.text(`Issued by: ${check.issuedByUser?.username || 'Unknown'}`, 0.5, 2.9);

      // Status badge (top center)
      doc.setFillColor(200, 200, 200);
      doc.rect(4, 0.4, 1, 0.3, "F");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(check.status, 4.5, 0.6, { align: "center" });

      // Save PDF
      const checkNumber = check.referenceNumber || check.checkNumber || 'N/A';
      const vendorName = check.vendor?.vendorName || 'Unknown';
      const fileName = `check-${checkNumber}-${vendorName.replace(/\s+/g, '-')}.pdf`;
      doc.save(fileName);

      if (onPrint) {
        onPrint();
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Print check
  const printCheck = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the check.");
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Check #${check.checkNumber}</title>
          <style>
            @page {
              size: 8.5in 3.5in;
              margin: 0.25in;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              width: 8in;
              height: 3in;
              border: 1px solid #000;
              position: relative;
            }
            .check-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 0.1in 0.2in;
              height: 0.4in;
            }
            .bank-info {
              font-size: 10pt;
              font-weight: bold;
            }
            .bank-details {
              font-size: 8pt;
              margin-top: 0.05in;
            }
            .check-number {
              font-size: 12pt;
              font-weight: bold;
            }
            .check-date {
              font-size: 10pt;
              margin-top: 0.05in;
            }
            .check-body {
              padding: 0.1in 0.2in;
              height: 1.2in;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .payee-name {
              font-size: 12pt;
              font-weight: bold;
            }
            .amount-number {
              font-size: 14pt;
              font-weight: bold;
            }
            .check-footer {
              padding: 0.1in 0.2in;
              height: 0.8in;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .amount-words {
              font-size: 9pt;
              max-width: 4in;
            }
            .memo {
              font-size: 8pt;
              max-width: 2in;
            }
            .signature-line {
              border-bottom: 1px solid #000;
              width: 1.5in;
              margin-top: 0.1in;
            }
            .signature-label {
              font-size: 8pt;
              margin-top: 0.05in;
            }
            .issued-by {
              font-size: 7pt;
              position: absolute;
              bottom: 0.1in;
              left: 0.2in;
            }
            .status-badge {
              position: absolute;
              top: 0.1in;
              left: 50%;
              transform: translateX(-50%);
              background: #f0f0f0;
              padding: 0.05in 0.1in;
              border: 1px solid #ccc;
              font-size: 8pt;
              border-radius: 2px;
            }
          </style>
        </head>
        <body>
          <div class="status-badge">${check.status}</div>
          
          <div class="check-header">
            <div>
              <div class="bank-info">${check.bank?.bankName || 'Unknown Bank'}</div>
              <div class="bank-details">
                Routing: ${check.bank?.routingNumber || 'N/A'}<br>
                Account: ${check.bank?.accountNumber || 'N/A'}
              </div>
            </div>
            <div style="text-align: right;">
              <div class="check-number">#${check.referenceNumber || check.checkNumber || 'N/A'}</div>
              <div class="check-date">${formatCheckDate(check.createdAt)}</div>
            </div>
          </div>
          
          <div class="check-body">
            <div class="payee-name">${check.vendor?.vendorName || 'Unknown Vendor'}</div>
            <div class="amount-number">$${Number(check.amount).toFixed(2)}</div>
          </div>
          
          <div class="check-footer">
            <div class="amount-words">${amountToWords(Number(check.amount))}</div>
            <div>
              ${check.memo ? `<div class="memo">Memo: ${check.memo}</div>` : ''}
              <div class="signature-line"></div>
              <div class="signature-label">Signature</div>
            </div>
          </div>
          
          <div class="issued-by">Issued by: ${check.issuedByUser?.username || 'Unknown'}</div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="flex gap-2">
      {/* Preview Button */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Check Preview - #{check.referenceNumber || check.checkNumber || 'N/A'}
            </DialogTitle>
            <DialogDescription>
              Preview of the check before printing
            </DialogDescription>
          </DialogHeader>
          
          {/* Check Preview */}
          <div className="bg-white border-2 border-gray-300 p-4 mx-auto relative" style={{ width: "8.5in", height: "3.5in" }}>
            {/* Status Badge */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
              <Badge variant="secondary" className="text-xs">
                {check.status}
              </Badge>
            </div>
            
            {/* Header */}
            <div className="flex justify-between items-start h-16">
              <div>
                <div className="text-lg font-bold">{check.bank?.bankName || 'Unknown Bank'}</div>
                <div className="text-sm text-gray-600">
                  Routing: {check.bank?.routingNumber || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  Account: {check.bank?.accountNumber || 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold">#{check.referenceNumber || check.checkNumber || 'N/A'}</div>
                <div className="text-sm">{formatCheckDate(check.createdAt)}</div>
              </div>
            </div>
            
            {/* Body */}
            <div className="flex justify-between items-center h-20">
              <div className="text-xl font-bold">{check.vendor?.vendorName || 'Unknown Vendor'}</div>
              <div className="text-2xl font-bold">${Number(check.amount).toFixed(2)}</div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-end h-16">
              <div className="text-sm max-w-md">
                {amountToWords(Number(check.amount))}
              </div>
              <div className="text-right">
                {check.memo && (
                  <div className="text-sm mb-2">Memo: {check.memo}</div>
                )}
                <div className="border-b border-black w-32 mb-1"></div>
                <div className="text-xs">Signature</div>
              </div>
            </div>
            
            {/* Issued by */}
            <div className="absolute bottom-2 left-4 text-xs text-gray-600">
              Issued by: {check.issuedByUser?.username || 'Unknown'}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 justify-center mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
            <Button onClick={generatePDF} disabled={isGenerating}>
              <Download className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Download PDF"}
            </Button>
            <Button onClick={printCheck}>
              <Printer className="mr-2 h-4 w-4" />
              Print Check
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download PDF Button */}
      <Button variant="outline" size="sm" onClick={generatePDF} disabled={isGenerating}>
        <Download className="mr-2 h-4 w-4" />
        {isGenerating ? "Generating..." : "PDF"}
      </Button>

      {/* Print Button */}
      <Button size="sm" onClick={printCheck}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
