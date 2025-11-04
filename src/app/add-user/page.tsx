"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AddUser() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
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
    if (!username || !email || !password || !storeId) { setError("Please complete all fields"); return; }
    try {
      setSubmitting(true);
      const token = document.cookie.split('; ').find(r => r.startsWith('auth-token='))?.split('=')[1];
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ username, email, password, role, storeId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create user');
      }
      setUsername(""); setEmail(""); setPassword(""); setRole("USER"); setStoreId("");
      alert('User created');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Add User</h1>
        <p className="text-muted-foreground">Add new users to the system</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="space-y-2">
          <label className="text-sm">Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="john" />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Password</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
        </div>
        <div className="space-y-2">
          <label className="text-sm">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
              <SelectItem value="MANAGER">MANAGER</SelectItem>
              <SelectItem value="USER">USER</SelectItem>
            </SelectContent>
          </Select>
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
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Creating...' : 'Create User'}</Button>
        </div>
      </div>
    </div>
  );
}


