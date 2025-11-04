export interface ReportCheck {
  id: string;
  createdAt: string;
  checkNumber: number;
  vendorName: string;
  storeName: string;
  amount: number;
  memo?: string;
  userName: string;
  invoiceUrl?: string;
  status: 'PENDING' | 'CLEARED' | 'VOIDED';
}


