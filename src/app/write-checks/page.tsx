"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, CreditCard, DollarSign, Calendar, User, Building2, Zap, Receipt, Banknote } from "lucide-react";
import InvoiceUpload from "@/components/invoices/InvoiceUpload";

// Validation schema (number auto-assigned on backend)
const paymentSchema = z.object({
  bankId: z.string().min(1, "Please select a bank"),
  paymentMethod: z.enum(["Cheque", "EDI", "MO", "Cash"]),
  vendorId: z.string().min(1, "Please select a vendor"),
  amount: z.string().min(1, "Amount is required"),
  memo: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface Bank {
  id: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  balance: string;
}

interface Vendor {
  id: string;
  vendorName: string;
  vendorType: string;
  description?: string;
  contact?: string;
}

interface Cheque {
  id: string;
  checkNumber?: string; // Keep for backward compatibility
  referenceNumber?: string; // New field
  paymentMethod: string;
  amount: string;
  memo?: string;
  status: string;
  createdAt: string;
  payeeName: string;
  bankId: string;
  vendorId: string;
  // Optional nested objects (may not be present in simplified API response)
  vendor?: Vendor;
  bank?: Bank;
}

export default function WriteChecksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [recentChecks, setRecentChecks] = useState<Cheque[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: "Cheque",
    },
  });

  const watchedBankId = watch("bankId");
  const watchedAmount = watch("amount");
  const watchedPaymentMethod = watch("paymentMethod");
  const [nextNumber, setNextNumber] = useState<string>("...");

  // No-op effect retained for future paymentMethod side-effects
  useEffect(() => {
    const subscription = watch(() => {});
    return () => subscription.unsubscribe();
  }, [watch]);

  // Helper functions
  const getPaymentIcon = () => {
    switch (watchedPaymentMethod) {
      case "Cheque":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "EDI":
        return <Zap className="h-4 w-4 text-muted-foreground" />;
      case "MO":
        return <Receipt className="h-4 w-4 text-muted-foreground" />;
      case "Cash":
        return <Banknote className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getVendorName = (check: Cheque) => {
    if (check.vendor?.vendorName) {
      return check.vendor.vendorName;
    }
    // If vendor data is not nested, find it from the vendors array
    const vendor = vendors.find(v => v.id === check.vendorId);
    return vendor?.vendorName || 'Unknown Vendor';
  };

  const getBankName = (check: Cheque) => {
    if (check.bank?.bankName) {
      return check.bank.bankName;
    }
    // If bank data is not nested, find it from the banks array
    const bank = banks.find(b => b.id === check.bankId);
    return bank?.bankName || 'Unknown Bank';
  };

  // Fetch next check number on mount and after submit
  useEffect(() => {
    const loadNext = async () => {
      try {
        const res = await fetch('/api/checks/next-number');
        if (res.ok) {
          const data = await res.json();
          setNextNumber(data.next);
        }
      } catch {}
    };
    loadNext();
  }, []);

  // Refresh next number when bank changes (and when form relevant fields change)
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch('/api/checks/next-number');
        if (res.ok) {
          const data = await res.json();
          setNextNumber(data.next);
        }
      } catch {}
    };
    if (watchedBankId) {
      void refresh();
    }
  }, [watchedBankId]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get authentication token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        console.log("No authentication token found - redirecting to login");
        // Wait a moment before redirecting to allow any pending login to complete
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
        setIsLoading(false);
        return;
      }

      console.log("Token found, making API requests...");

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Make sequential requests with error handling for each
      try {
        const banksRes = await fetch("/api/banks", { headers });
        if (banksRes.ok) {
          const banksData = await banksRes.json();
          console.log("Banks fetched successfully:", banksData.length, "banks");
          setBanks(banksData);
        } else if (banksRes.status === 401) {
          console.log("Authentication expired, redirecting to login");
          window.location.href = '/login';
          return;
        } else {
          console.error("Failed to fetch banks:", banksRes.status, await banksRes.text());
        }
      } catch (error) {
        console.error("Error fetching banks:", error);
      }

      try {
        const vendorsRes = await fetch("/api/vendors", { headers });
        if (vendorsRes.ok) {
          const vendorsData = await vendorsRes.json();
          console.log("Vendors fetched successfully:", vendorsData.length, "vendors");
          setVendors(vendorsData);
        } else if (vendorsRes.status === 401) {
          console.log("Authentication expired, redirecting to login");
          window.location.href = '/login';
          return;
        } else {
          console.error("Failed to fetch vendors:", vendorsRes.status);
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }

      try {
        const checksRes = await fetch("/api/checks", { headers });
        if (checksRes.ok) {
          const checksData = await checksRes.json();
          console.log("Checks fetched successfully:", checksData.length, "checks");
          setRecentChecks(checksData.slice(0, 10)); // Get last 10 checks
        } else if (checksRes.status === 401) {
          console.log("Authentication expired, redirecting to login");
          window.location.href = '/login';
          return;
        } else {
          console.error("Failed to fetch checks:", checksRes.status);
        }
      } catch (error) {
        console.error("Error fetching checks:", error);
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvoiceUploaded = (url: string) => {
    setInvoiceUrl(url);
  };

  // Generate unique check number
  const generateUniqueCheckNumber = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        console.error("No authentication token found");
        return "1001";
      }

      const response = await fetch('/api/checks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const checks = await response.json();
        const existingNumbers = checks.map((check: Cheque) => parseInt(check.checkNumber)).filter(n => !isNaN(n));
        const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 1000;
        return (maxNumber + 1).toString();
      }
    } catch (error) {
      console.error('Error generating check number:', error);
    }
    return (Math.floor(Math.random() * 9000) + 1000).toString(); // Fallback random number
  };

  // Form submission
  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      // Get authentication token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        alert("Authentication required. Please log in.");
        setIsSubmitting(false);
        return;
      }

      // Check bank balance
      const selectedBank = banks.find((bank) => bank.id === data.bankId);
      if (selectedBank && parseFloat(data.amount) > parseFloat(selectedBank.balance)) {
        alert("Amount exceeds bank balance!");
        setIsSubmitting(false);
        return;
      }

      // Require invoice URL before creating check
      if (!invoiceUrl) {
        alert("Invoice is required. Please upload via desktop or phone.");
        setIsSubmitting(false);
        return;
      }

      // Create check
      const checkData = {
        ...data,
        amount: parseFloat(data.amount),
        status: "Draft",
        invoiceUrl,
      };

      const response = await fetch("/api/checks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(checkData),
      });

      if (response.ok) {
        // Reset form
        reset();
        setInvoiceUrl(null);
        
        // Refresh next number and recent checks
        fetchData();
        try {
          const r = await fetch('/api/checks/next-number');
          if (r.ok) { const d = await r.json(); setNextNumber(d.next); }
        } catch {}
        
        alert("Cheque created successfully!");
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.details || errorData.error || "Failed to create cheque";
        alert(`Failed to create cheque: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error creating cheque:", error);
      alert("An error occurred while creating the cheque");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Draft":
        return "outline";
      case "Pending":
        return "secondary";
      case "Approved":
        return "default";
      case "Printed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getBankBalance = () => {
    if (watchedBankId) {
      const bank = banks.find((b) => b.id === watchedBankId);
      if (bank) {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(parseFloat(bank.balance));
      }
    }
    return "$0.00";
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Write Cheques</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Make a Payment Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Make a Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Bank Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Bank <span className="text-red-500">*</span>
                </label>
                <Select onValueChange={(value) => setValue("bankId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Bank..." />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank.id} value={bank.id}>
                        {bank.bankName} (Acc: {bank.accountNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bankId && (
                  <p className="text-sm text-red-500">{errors.bankId.message}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Current Balance: {getBankBalance()}
                </p>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Payment method
                </label>
                <Tabs
                  defaultValue="Cheque"
                  onValueChange={(value) => setValue("paymentMethod", value as any)}
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="Cheque">Cheque</TabsTrigger>
                    <TabsTrigger value="EDI">EDI</TabsTrigger>
                    <TabsTrigger value="MO">MO</TabsTrigger>
                    <TabsTrigger value="Cash">Cash</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Next Check Number (Read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Next Check Number</label>
                <Input value={nextNumber} readOnly disabled />
                <p className="text-xs text-muted-foreground">Automatically assigned by system</p>
              </div>

              {/* Vendor Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Vendor <span className="text-red-500">*</span>
                </label>
                <Select onValueChange={(value) => setValue("vendorId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payee Name..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendorName} ({vendor.vendorType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendorId && (
                  <p className="text-sm text-red-500">{errors.vendorId.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    {...register("amount")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>

              {/* Memo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Memo <span className="text-red-500">*</span>
                </label>
                <Textarea
                  {...register("memo")}
                  placeholder="Enter memo"
                  rows={3}
                />
                {errors.memo && (
                  <p className="text-sm text-red-500">{errors.memo.message}</p>
                )}
              </div>

              {/* Invoice Upload (Required) */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Invoice <span className="text-red-500">*</span></label>
                <InvoiceUpload required onUploaded={handleInvoiceUploaded} />
                {!invoiceUrl && (
                  <p className="text-xs text-muted-foreground">An invoice is required to submit the check.</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => { reset(); setInvoiceUrl(null); }}>
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting || !invoiceUrl}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Right Panel: Recent Checks Table */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Recent Cheques</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : recentChecks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="mx-auto h-12 w-12 mb-4" />
                <p>No data</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ref #</TableHead>
                      <TableHead>Dba</TableHead>
                      <TableHead>Payee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Memo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentChecks.map((check) => (
                      <TableRow key={check.id}>
                        <TableCell>
                          {new Date(check.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{check.referenceNumber || check.checkNumber || 'N/A'}</TableCell>
                        <TableCell>{check.paymentMethod}</TableCell>
                        <TableCell>{getVendorName(check)}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(parseFloat(check.amount))}
                        </TableCell>
                        <TableCell>{check.memo || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(check.status)}>
                            {check.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}