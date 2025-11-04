"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AddVendor() {
  const [vendorName, setVendorName] = useState("");
  const [vendorType, setVendorType] = useState("MERCHANDISE");
  const [description, setDescription] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [storeId, setStoreId] = useState("");
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1];
        const res = await fetch('/api/stores', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.stores || [];
        setStores(arr.map((s: any) => ({ id: s.id, name: s.name })));
      } catch (e) {
        setStores([]);
      }
    };
    loadStores();
  }, []);

  const submit = async () => {
    setError(null);
    if (!vendorName || !vendorType || !storeId) { setError("Please complete required fields"); return; }
    try {
      setSubmitting(true);
      const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1];
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ vendorName, vendorType, description, contactPerson, email, phone, address, storeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create vendor');
      }
      setVendorName(""); setVendorType("MERCHANDISE"); setDescription(""); setContactPerson(""); setEmail(""); setPhone(""); setAddress(""); setStoreId("");
      alert('Vendor created');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Add Vendor</h1>
        <p className="text-muted-foreground">Add new vendors to the system</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="space-y-2">
          <label className="text-sm">Vendor Name</label>
          <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Acme Supplies" />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Vendor Type</label>
          <Select value={vendorType} onValueChange={setVendorType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MERCHANDISE">MERCHANDISE</SelectItem>
              <SelectItem value="EXPENSE">EXPENSE</SelectItem>
              <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Description</label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm">Contact Person</label>
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@example.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="555-123-4567" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm">Store</label>
          <Select value={storeId} onValueChange={setStoreId}>
            <SelectTrigger><SelectValue placeholder="Select a store" /></SelectTrigger>
            <SelectContent>
              {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Creating...' : 'Create Vendor'}</Button>
        </div>
      </div>
    </div>
  );
}


