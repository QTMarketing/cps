"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText } from "lucide-react";
import CheckPrint from "@/components/CheckPrintComponent";

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
  issuer?: {
    username: string;
  };
}

export default function CheckPrintingPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChecks();
  }, []);

  const fetchChecks = async () => {
    try {
      setIsLoading(true);
      
      // Get authentication token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        console.log("No authentication token found");
        setChecks([]);
        return;
      }

      const response = await fetch("/api/checks", {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        if (Array.isArray(data)) {
          setChecks(data);
        } else {
          console.error("Expected array but got:", data);
          setChecks([]);
        }
      } else if (response.status === 401) {
        console.log("Authentication expired");
        setChecks([]);
      } else {
        console.error("Failed to fetch checks:", response.status);
        setChecks([]);
      }
    } catch (error) {
      console.error("Failed to fetch checks:", error);
      setChecks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCheckDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-800";
      case "Submitted":
        return "bg-blue-100 text-blue-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Printed":
        return "bg-purple-100 text-purple-800";
      case "Reconciled":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Check Printing</h1>
        <p className="text-muted-foreground mt-2">Print and manage checks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Available Checks
          </CardTitle>
          <CardDescription>
            Select checks to print or download as PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
              Loading checks...
            </div>
          ) : checks.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No checks available</h3>
              <p className="text-muted-foreground">
                Create some checks first to print them.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {checks.map((check) => (
                <Card key={check.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold">
                          {check.paymentMethod === "Cheque" ? "Check" : check.paymentMethod} 
                          #{check.referenceNumber || check.checkNumber || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {check.vendor?.vendorName || 'Unknown Vendor'} • ${Number(check.amount).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCheckDate(check.createdAt)} • {check.bank?.bankName || 'Unknown Bank'}
                        </div>
                      </div>
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                    </div>
                    <CheckPrint 
                      check={check} 
                      onPrint={() => console.log(`Printed check ${check.id}`)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}