"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FileText, 
  BarChart3, 
  UserPlus, 
  Building2, 
  Printer,
  DollarSign,
  CheckCircle,
  Clock,
  Users
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Zap, Receipt, Banknote } from "lucide-react";
import FileUpload from "@/components/FileUpload";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalChecks: 0,
    pendingChecks: 0,
    totalVendors: 0,
    totalBanks: 0,
    totalAmount: 0,
    printedChecks: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check authentication first
    const checkAuth = async () => {
      try {
        const savedToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1];

        if (!savedToken) {
          router.push('/login');
          return;
        }

        // Verify token
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (response.ok) {
          setIsAuthenticated(true);
          await fetchStats(savedToken);
        } else {
          router.push('/login');
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const fetchStats = async (token: string) => {
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [checksRes, vendorsRes, banksRes] = await Promise.all([
        fetch("/api/checks", { headers }),
        fetch("/api/vendors", { headers }),
        fetch("/api/banks", { headers })
      ]);

      if (checksRes.ok) {
        const checks = await checksRes.json();
        const totalAmount = checks.reduce((sum: number, check: any) => sum + parseFloat(check.amount), 0);
        const pendingChecks = checks.filter((check: any) => check.status === "Pending").length;
        const printedChecks = checks.filter((check: any) => check.status === "Printed").length;

        setStats(prev => ({
          ...prev,
          totalChecks: checks.length,
          pendingChecks,
          printedChecks,
          totalAmount
        }));
      }

      if (vendorsRes.ok) {
        const vendors = await vendorsRes.json();
        setStats(prev => ({ ...prev, totalVendors: vendors.length }));
      }

      if (banksRes.ok) {
        const banks = await banksRes.json();
        setStats(prev => ({ ...prev, totalBanks: banks.length }));
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const quickActions = [
    {
      title: "Write Checks",
      description: "Create new payment checks",
      href: "/write-checks",
      icon: FileText,
      color: "bg-blue-500"
    },
    {
      title: "View Reports",
      description: "Check transaction reports",
      href: "/reports",
      icon: BarChart3,
      color: "bg-green-500"
    },
    {
      title: "Manage Vendors",
      description: "Add and manage vendors",
      href: "/vendors",
      icon: UserPlus,
      color: "bg-purple-500"
    },
    {
      title: "Print Checks",
      description: "Print and manage checks",
      href: "/check-print",
      icon: Printer,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      ) : !isAuthenticated ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Redirecting to login...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome to QT Office Check Printing System
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                <CheckCircle className="w-3 h-3 mr-1 inline" />
                System Online
              </span>
            </div>
          </div>

          {/* Write Checks Content */}
          <WriteChecksContent />
        </>
      )}
    </div>
  );
}

// Payment schema
const paymentSchema = z.object({
  bankId: z.string().min(1, "Please select a bank"),
  paymentMethod: z.enum(["Cheque", "EDI", "MO", "Cash"]),
  referenceNumber: z.string().optional(),
  vendorId: z.string().min(1, "Please select a vendor"),
  amount: z.string().min(1, "Amount is required"),
  memo: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === "Cheque") {
    if (!data.referenceNumber || data.referenceNumber.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check number is required for check payments",
        path: ["referenceNumber"],
      });
    }
  }
  
  if (data.paymentMethod === "MO") {
    if (!data.referenceNumber || data.referenceNumber.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Money order number is required",
        path: ["referenceNumber"],
      });
    }
  }
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
  checkNumber?: string;
  referenceNumber?: string;
  paymentMethod: string;
  amount: string;
  memo?: string;
  status: string;
  createdAt: string;
  payeeName: string;
  bankId: string;
  vendorId: string;
  vendor?: Vendor;
  bank?: Bank;
}

function WriteChecksContent() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [recentChecks, setRecentChecks] = useState<Cheque[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const watchedPaymentMethod = watch("paymentMethod");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) return;

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [banksRes, vendorsRes, checksRes] = await Promise.all([
        fetch("/api/banks", { headers }),
        fetch("/api/vendors", { headers }),
        fetch("/api/checks", { headers })
      ]);

      if (banksRes.ok) {
        setBanks(await banksRes.json());
      }
      if (vendorsRes.ok) {
        setVendors(await vendorsRes.json());
      }
      if (checksRes.ok) {
        const checksData = await checksRes.json();
        setRecentChecks(checksData.slice(0, 10));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        alert("Authentication required. Please log in.");
        return;
      }

      const response = await fetch("/api/checks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          status: "Draft",
          issuedBy: "cmh4jy99u0002rgk2joxgi0vc",
          storeId: "cmh4jy46p0000rgk2xx6ud5fx",
        }),
      });

      if (response.ok) {
        reset();
        fetchData();
        alert("Check created successfully!");
      } else {
        alert("Failed to create check");
      }
    } catch (error) {
      console.error("Error creating check:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Draft": return "outline";
      case "Pending": return "secondary";
      case "Approved": return "default";
      case "Printed": return "destructive";
      default: return "outline";
    }
  };

  const getVendorName = (check: Cheque) => {
    const vendor = vendors.find(v => v.id === check.vendorId);
    return vendor?.vendorName || 'Unknown Vendor';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Make a Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank *</label>
              <Select onValueChange={(value) => setValue("bankId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Bank..." />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bankName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Balance: {getBankBalance()}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {(watchedPaymentMethod === "Cheque" && "Check Number") ||
                 (watchedPaymentMethod === "MO" && "Money Order Number") ||
                 (watchedPaymentMethod === "EDI" && "Transaction ID") ||
                 (watchedPaymentMethod === "Cash" && "Receipt Number")}
              </label>
              <Input
                {...register("referenceNumber")}
                placeholder="Enter reference number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Vendor *</label>
              <Select onValueChange={(value) => setValue("vendorId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Vendor..." />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Memo</label>
              <Textarea
                {...register("memo")}
                placeholder="Enter memo"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Checks Table */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Recent Checks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recentChecks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p>No checks yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ref #</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Amount</TableHead>
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
                      <TableCell>{getVendorName(check)}</TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(parseFloat(check.amount))}
                      </TableCell>
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
  );
}