"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  DollarSign, 
  CreditCard, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Plus
} from "lucide-react";

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const bankSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  routingNumber: z.string().min(9, "Routing number must be at least 9 digits"),
  storeId: z.string().min(1, "Store is required"),
  balance: z.string().min(1, "Initial balance is required"),
});

const storeSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone number is required"),
});

type BankFormData = z.infer<typeof bankSchema>;
type StoreFormData = z.infer<typeof storeSchema>;

// =============================================================================
// TYPES
// =============================================================================

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AddBankPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankName: "",
      accountNumber: "",
      routingNumber: "",
      storeId: "",
      balance: "0.00",
    },
  });

  const {
    register: registerStore,
    handleSubmit: handleSubmitStore,
    formState: { errors: storeErrors },
    reset: resetStore,
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
  });

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  useEffect(() => {
    const checkAuthAndFetchStores = async () => {
      try {
        // Get authentication token from cookie
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1];

        if (!token) {
          showAlert("error", "Authentication required. Redirecting to login...");
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }

        // Verify token by fetching user info
        const userResponse = await fetch("/api/auth/me", {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!userResponse.ok) {
          showAlert("error", "Authentication expired. Redirecting to login...");
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }

        // If authenticated, fetch stores
        await fetchStores(token);
      } catch (error) {
        console.error("Auth check error:", error);
        showAlert("error", "Authentication error. Redirecting to login...");
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    };

    checkAuthAndFetchStores();
  }, []);

  const fetchStores = async (token?: string) => {
    try {
      // Use provided token or get from cookie
      const authToken = token || document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!authToken) {
        showAlert("error", "Authentication required. Please log in.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/stores", {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Handle both { stores: [] } and [] format
        if (Array.isArray(data)) {
          setStores(data);
        } else if (data.stores) {
          setStores(data.stores);
        } else {
          setStores([]);
        }
      } else if (response.status === 401) {
        showAlert("error", "Authentication expired. Please log in again.");
        // Redirect to login
        window.location.href = '/login';
      } else {
        showAlert("error", "Failed to fetch stores");
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      showAlert("error", "Error fetching stores");
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const showAlert = (type: "success" | "error", message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // =============================================================================
  // FORM HANDLERS
  // =============================================================================

  const onSubmit = async (data: BankFormData) => {
    setIsSubmitting(true);
    try {
      // Get authentication token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        showAlert("error", "Authentication required. Please log in.");
        setIsSubmitting(false);
        return;
      }

      const bankData = {
        ...data,
        balance: parseFloat(data.balance),
      };

      const response = await fetch("/api/banks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(bankData),
      });

      if (response.ok) {
        showAlert("success", "Bank added successfully!");
        reset();
      } else if (response.status === 401) {
        showAlert("error", "Authentication expired. Please log in again.");
        window.location.href = '/login';
      } else {
        const errorData = await response.json();
        showAlert("error", errorData.error || "Failed to add bank");
      }
    } catch (error) {
      console.error("Error adding bank:", error);
      showAlert("error", "Error adding bank");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitStore = async (data: StoreFormData) => {
    setIsCreatingStore(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!token) {
        showAlert("error", "Authentication required. Please log in.");
        setIsCreatingStore(false);
        return;
      }

      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newStore = await response.json();
        setStores([...stores, newStore]);
        setValue("storeId", newStore.id);
        showAlert("success", "Store added successfully!");
        setIsStoreModalOpen(false);
        resetStore();
      } else if (response.status === 401) {
        showAlert("error", "Authentication expired. Please log in again.");
        window.location.href = '/login';
      } else {
        const errorData = await response.json();
        showAlert("error", errorData.error || "Failed to add store");
      }
    } catch (error) {
      console.error("Error adding store:", error);
      showAlert("error", "Error adding store");
    } finally {
      setIsCreatingStore(false);
    }
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Add Bank</h1>
          <p className="text-muted-foreground">
            Add new bank accounts to the system for check processing
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      {/* Alert */}
      {alert && (
        <Alert className={`mb-6 ${alert.type === "error" ? "border-red-500" : "border-green-500"}`}>
          {alert.type === "error" ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      )}

      {/* Bank Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Bank Information</span>
          </CardTitle>
          <CardDescription>
            Enter the bank account details for check processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Bank Name */}
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="bankName"
                  {...register("bankName")}
                  placeholder="Enter bank name (e.g., Chase Bank)"
                  className="pl-9"
                />
              </div>
              {errors.bankName && (
                <p className="text-sm text-red-500">{errors.bankName.message}</p>
              )}
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="accountNumber"
                  {...register("accountNumber")}
                  placeholder="Enter account number"
                  className="pl-9"
                />
              </div>
              {errors.accountNumber && (
                <p className="text-sm text-red-500">{errors.accountNumber.message}</p>
              )}
            </div>

            {/* Routing Number */}
            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing Number *</Label>
              <Input
                id="routingNumber"
                {...register("routingNumber")}
                placeholder="Enter 9-digit routing number"
                maxLength={9}
              />
              {errors.routingNumber && (
                <p className="text-sm text-red-500">{errors.routingNumber.message}</p>
              )}
            </div>

            {/* Store Selection */}
            <div className="space-y-2">
              <Label htmlFor="storeId">Store *</Label>
              <div className="flex gap-2">
                <Select onValueChange={(value) => setValue("storeId", value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} - {store.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Store
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Store</DialogTitle>
                      <DialogDescription>
                        Create a new store to associate with this bank account
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitStore(onSubmitStore)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="storeName">Store Name *</Label>
                        <Input
                          id="storeName"
                          {...registerStore("name")}
                          placeholder="Enter store name"
                        />
                        {storeErrors.name && (
                          <p className="text-sm text-red-500">{storeErrors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storeAddress">Address *</Label>
                        <Input
                          id="storeAddress"
                          {...registerStore("address")}
                          placeholder="Enter store address"
                        />
                        {storeErrors.address && (
                          <p className="text-sm text-red-500">{storeErrors.address.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="storePhone">Phone *</Label>
                        <Input
                          id="storePhone"
                          {...registerStore("phone")}
                          placeholder="Enter phone number"
                        />
                        {storeErrors.phone && (
                          <p className="text-sm text-red-500">{storeErrors.phone.message}</p>
                        )}
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsStoreModalOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isCreatingStore}>
                          {isCreatingStore ? "Creating..." : "Create Store"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {errors.storeId && (
                <p className="text-sm text-red-500">{errors.storeId.message}</p>
              )}
            </div>

            {/* Initial Balance */}
            <div className="space-y-2">
              <Label htmlFor="balance">Initial Balance *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  {...register("balance")}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
              {errors.balance && (
                <p className="text-sm text-red-500">{errors.balance.message}</p>
              )}
            </div>

            {/* Security Notice */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> Bank account numbers and routing numbers are encrypted 
                and stored securely. Only authorized users can access this information.
              </AlertDescription>
            </Alert>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => reset()}>
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding Bank..." : "Add Bank"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="max-w-2xl mt-6">
        <CardHeader>
          <CardTitle>Bank Account Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Required Information:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Bank Name:</strong> The name of the financial institution</li>
              <li><strong>Account Number:</strong> Your checking account number</li>
              <li><strong>Routing Number:</strong> 9-digit bank routing number</li>
              <li><strong>Store:</strong> Which store this account belongs to</li>
              <li><strong>Initial Balance:</strong> Starting balance for the account</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Security Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Account numbers are encrypted using AES-256 encryption</li>
              <li>Only authorized users can view bank information</li>
              <li>All bank operations are logged for audit purposes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}