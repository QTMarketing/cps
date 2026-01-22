import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { ChequeViewModel } from "@/lib/cheques/types";
import path from "path";
import { promises as fs } from "fs";
import { Buffer } from "buffer";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const getStoreNumber = (storeName?: string | null) => {
  if (!storeName) return "";
  const match = storeName.match(/\d+/);
  return match ? match[0] : "";
};

const buildMicr = (cheque: ChequeViewModel) => {
  const normalize = (value: string, length: number) =>
    value.replace(/\D/g, "").padStart(length, "0");
  // MICR line format: ⑆ check_number ⑈ routing_number ⑈ account_number ⑈
  // ⑆ = Transit symbol (U+2446)
  // ⑈ = On-us symbol (U+2448)
  const TRANSIT_SYMBOL = String.fromCharCode(0x2446); // ⑆
  const ON_US_SYMBOL = String.fromCharCode(0x2448);   // ⑈
  
  // cheque.number already has the store prefix, so use it directly
  const checkNumberNormalized = normalize(cheque.number || "", 9);
  const routing = normalize(cheque.bank.routingNumber, 9);
  const account = normalize(cheque.bank.accountNumber, 9);
  
  // Format: ⑆ check_number ⑈ routing_number ⑈ account_number ⑈
  return `${TRANSIT_SYMBOL} ${checkNumberNormalized} ${ON_US_SYMBOL} ${routing} ${ON_US_SYMBOL} ${account} ${ON_US_SYMBOL}`;
};

let cachedMicrFontDataUrl: string | null = null;

async function getMicrFontDataUrl(): Promise<string> {
  if (cachedMicrFontDataUrl !== null) {
    return cachedMicrFontDataUrl;
  }
  try {
    const fontPath = path.join(process.cwd(), "public", "micr-encoding.regular.ttf");
    const bytes = await fs.readFile(fontPath);
    cachedMicrFontDataUrl = `data:font/ttf;base64,${bytes.toString("base64")}`;
  } catch (error) {
    console.warn("Unable to load MICR font, falling back to system font:", error);
    cachedMicrFontDataUrl = "";
  }
  return cachedMicrFontDataUrl;
}

const renderChequeHtml = (cheque: ChequeViewModel, micrFontDataUrl: string) => {
  const amount = currency.format(cheque.amount);
  const micr = buildMicr(cheque);
  const signature = cheque.bank.signatureUrl
    ? `<img src="${cheque.bank.signatureUrl}" alt="Signature" />`
    : "";
  const micrFontFace = micrFontDataUrl
    ? `@font-face { font-family: "MICR"; src: url('${micrFontDataUrl}') format("truetype"); font-weight: normal; font-style: normal; }`
    : "";

  const corporationBlock = cheque.bank.corporation
    ? `
        <p class="bank-account-line bank-account-name">${cheque.bank.corporation.name}</p>
        ${
          cheque.bank.dba
            ? `<p class="bank-account-line bank-dba">${cheque.bank.dba}</p>`
            : ""
        }
        ${
          cheque.bank.corporation.owner
            ? `<p class="bank-account-line">Owner: ${cheque.bank.corporation.owner}</p>`
            : ""
        }
        ${
          cheque.bank.corporation.ein
            ? `<p class="bank-account-line">EIN: ${cheque.bank.corporation.ein}</p>`
            : ""
        }
      `
    : `
        ${
          cheque.bank.accountName
            ? `<p class="bank-account-line bank-account-name">${cheque.bank.accountName}</p>`
            : ""
        }
        ${
          cheque.bank.dba
            ? `<p class="bank-account-line bank-dba">${cheque.bank.dba}</p>`
            : ""
        }
      `;

  const addressBlock = `
    ${
      cheque.bank.addressLine1
        ? `<p class="bank-account-line">${cheque.bank.addressLine1}</p>`
        : ""
    }
    ${
      cheque.bank.cityStateZip
        ? `<p class="bank-account-line">${cheque.bank.cityStateZip}</p>`
        : ""
    }
  `;

  const formattedDate = new Date(cheque.createdAt).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
  
  // cheque.number already has the store prefix from formatCheckNumber, so use it directly
  const checkNumber = cheque.number || "N/A";

  const businessName = cheque.bank.corporation?.name || cheque.bank.accountName || '';
  const businessDba = cheque.bank.dba || '';
  const businessAddress1 = cheque.bank.addressLine1 || '';
  const businessAddress2 = cheque.bank.cityStateZip || '';

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        ${micrFontFace}
        @page {
          size: Letter;
          margin: 0.5in;
        }
        body {
          font-family: "Helvetica Neue", Arial, sans-serif;
          background: #fff;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
        }
        .cheque-wrapper {
          width: 816px; /* 8.5 inches at 96 DPI */
          min-height: 1056px; /* 11 inches at 96 DPI */
          padding: 40px 50px;
          box-sizing: border-box;
        }
        .cheque {
          background: #fff;
          border: 2px solid #000;
          padding: 40px 50px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-sizing: border-box;
        }
        .cheque-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 20px;
        }
        .cheque-header-center {
          flex: 1;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bank-name-header {
          font-size: 18px;
          font-weight: 700;
          color: #000;
          text-align: center;
        }
        .cheque-header-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .business-name {
          font-size: 16px;
          font-weight: 700;
          color: #000;
          line-height: 1.4;
        }
        .business-dba {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          line-height: 1.4;
        }
        .business-address {
          font-size: 12px;
          color: #333;
          line-height: 1.4;
        }
        .cheque-header-right {
          text-align: right;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cheque-date {
          font-size: 14px;
          font-weight: 500;
          color: #000;
        }
        .cheque-number {
          font-size: 16px;
          font-weight: 700;
          color: #000;
        }
        .cheque-payee-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin: 30px 0;
          gap: 40px;
        }
        .payee-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pay-to-label {
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #000;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .payee-name {
          font-size: 18px;
          font-weight: 600;
          color: #000;
          min-height: 24px;
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
          margin-bottom: 4px;
        }
        .amount-container {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .amount-value {
          font-size: 18px;
          font-weight: 700;
          color: #000;
          min-width: 140px;
          text-align: right;
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
        }
        .amount-words-section {
          margin: 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .amount-words-text {
          font-size: 14px;
          font-weight: 500;
          color: #000;
          flex: 1;
        }
        .amount-words-line {
          flex: 1;
          height: 1px;
          background: #000;
          margin-left: 8px;
        }
        .cheque-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 40px;
          gap: 40px;
        }
        .memo-section {
          flex: 1;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .memo-label {
          font-size: 12px;
          font-weight: 600;
          color: #000;
          white-space: nowrap;
        }
        .memo-value {
          font-size: 12px;
          color: #000;
          flex: 1;
          border-bottom: 1px solid #000;
          min-height: 16px;
          padding-bottom: 2px;
        }
        .signature-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          min-width: 200px;
        }
        .signature-section img {
          max-height: 50px;
          max-width: 180px;
          object-fit: contain;
          margin-bottom: 4px;
        }
        .signature-line {
          width: 200px;
          height: 1px;
          background: #000;
          margin-top: 4px;
        }
        .signature-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #000;
          font-weight: 500;
          margin-top: 2px;
        }
        .micr-section {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
        }
        .micr-line {
          font-family: "MICR", "Courier New", monospace !important;
          font-size: 16px;
          letter-spacing: 0.1em;
          color: #000;
          text-align: center;
          line-height: 1.8;
          font-weight: normal;
          white-space: pre;
          font-variant-numeric: tabular-nums;
        }
        .cheque-stub {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px dashed #999;
        }
        .stub-perforation {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 8px 0;
        }
        .perforation-line {
          flex: 1;
          height: 1px;
          border-top: 1px dashed #999;
        }
        .perforation-label {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          white-space: nowrap;
        }
        .stub-content {
          padding: 12px;
          background: #f9f9f9;
          border: 1px solid #ddd;
        }
        .stub-header {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #000;
          margin-bottom: 12px;
          padding-bottom: 6px;
          border-bottom: 1px solid #ccc;
        }
        .stub-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .stub-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 11px;
          line-height: 1.4;
        }
        .stub-label {
          font-weight: 600;
          color: #333;
          min-width: 100px;
        }
        .stub-value {
          color: #000;
          text-align: right;
          flex: 1;
          margin-left: 12px;
        }
      </style>
    </head>
    <body>
      <div class="cheque-wrapper">
        <div class="cheque">
          <!-- Header: Business Info (Left), Bank Name (Center), Date/Check Number (Right) -->
          <div class="cheque-header">
            <div class="cheque-header-left">
              ${businessName ? `<div class="business-name">${businessName}</div>` : ''}
              ${businessDba ? `<div class="business-dba">${businessDba}</div>` : ''}
              ${businessAddress1 ? `<div class="business-address">${businessAddress1}</div>` : ''}
              ${businessAddress2 ? `<div class="business-address">${businessAddress2}</div>` : ''}
            </div>
            <div class="cheque-header-center">
              <div class="bank-name-header">${cheque.bank.name}</div>
            </div>
            <div class="cheque-header-right">
              <div class="cheque-date">Date: ${formattedDate}</div>
              <div class="cheque-number">No. ${checkNumber}</div>
            </div>
          </div>

          <!-- Payee Section: "PAY TO THE ORDER OF" + Payee (Left), Amount (Right) -->
          <div class="cheque-payee-section">
            <div class="payee-container">
              <div class="pay-to-label">PAY TO THE ORDER OF</div>
              <div class="payee-name">${cheque.payee.name || 'N/A'}</div>
            </div>
            <div class="amount-container">
              <div class="amount-value">${amount}</div>
            </div>
          </div>

          <!-- Amount in Words -->
          <div class="amount-words-section">
            <div class="amount-words-text">${cheque.amountWords}</div>
            <div class="amount-words-line"></div>
          </div>

          <!-- Footer: Memo (Left) and Signature (Right) -->
          <div class="cheque-footer">
            <div class="memo-section">
              <div class="memo-label">Memo:</div>
              <div class="memo-value">${cheque.memo || "&nbsp;"}</div>
            </div>
            <div class="signature-section">
              ${signature}
              <div class="signature-line"></div>
              <div class="signature-label">AUTHORIZED SIGNATURE</div>
            </div>
          </div>

          <!-- MICR Line Footer -->
          <div class="micr-section">
            <div class="micr-line">${micr}</div>
          </div>

          <!-- Detachable Stub -->
          <div class="cheque-stub">
            <div class="stub-perforation">
              <div class="perforation-line"></div>
              <div class="perforation-label">DETACH HERE</div>
              <div class="perforation-line"></div>
            </div>
            <div class="stub-content">
              <div class="stub-header">PAYMENT SUMMARY</div>
              <div class="stub-details">
                <div class="stub-row">
                  <span class="stub-label">Payee:</span>
                  <span class="stub-value">${cheque.payee.name || 'N/A'}</span>
                </div>
                <div class="stub-row">
                  <span class="stub-label">Amount:</span>
                  <span class="stub-value">${amount}</span>
                </div>
                <div class="stub-row">
                  <span class="stub-label">Date:</span>
                  <span class="stub-value">${formattedDate}</span>
                </div>
                ${cheque.memo ? `
                <div class="stub-row">
                  <span class="stub-label">Memo:</span>
                  <span class="stub-value">${cheque.memo}</span>
                </div>
                ` : ''}
                <div class="stub-row">
                  <span class="stub-label">Bank:</span>
                  <span class="stub-value">${cheque.bank.name}</span>
                </div>
                <div class="stub-row">
                  <span class="stub-label">Account Number:</span>
                  <span class="stub-value">${cheque.bank.accountNumber}</span>
                </div>
                <div class="stub-row">
                  <span class="stub-label">Check Number:</span>
                  <span class="stub-value">${checkNumber}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>`;
};

export async function generateChequePDF(cheque: ChequeViewModel): Promise<Buffer> {
  const executablePath = await chromium.executablePath();
  const micrFont = await getMicrFontDataUrl();
  const html = renderChequeHtml(cheque, micrFont);

  const chromiumAny = chromium as any;
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromiumAny.defaultViewport ?? null,
    executablePath: executablePath || undefined,
    headless: chromiumAny.headless ?? true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      width: "8.5in",
      height: "11in",
      printBackground: true,
      margin: {
        top: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
        right: "0.5in",
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}


