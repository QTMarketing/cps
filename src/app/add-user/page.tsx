"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AccountRow = {
  id: string;
  dbaName: string;
  bankName: string;
  accountType: string;
  name?: string | null;
};

export default function AddUser() {
  // Left panel state
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'USER' | 'ADMIN' | 'SUPER_ADMIN'>("USER");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active user after create
  const [activeUserId, setActiveUserId] = useState<string>("");

  // Right panels state
  const [qUnassigned, setQUnassigned] = useState("");
  const [qAssigned, setQAssigned] = useState("");
  const [unassigned, setUnassigned] = useState<AccountRow[]>([]);
  const [assigned, setAssigned] = useState<AccountRow[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);

  const [selUnassigned, setSelUnassigned] = useState<Record<string, boolean>>({});
  const [selAssigned, setSelAssigned] = useState<Record<string, boolean>>({});

  const getToken = () => {
    if (typeof document === 'undefined') return undefined;
    const cookies = document.cookie.split('; ');
    const authCookie = cookies.find(r => r.startsWith('auth-token='));
    const token = authCookie?.split('=')[1];
    
    if (!token) {
      console.warn('No auth token found in cookies. Available cookies:', cookies.map(c => c.split('=')[0]));
    } else {
      console.log('Auth token found, length:', token.length);
    }
    return token;
  };

  const loadLists = async () => {
    setLoadingLists(true);
    
    try {
      const t = getToken();
      
      if (!t) {
        console.error('No authentication token found. User may need to log in again.');
        window.location.href = '/login';
        return;
      }
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${t}`,
      };

      // Always load ALL banks (regardless of assignment) for "Unassigned Accounts" section
      try {
        const response = await fetch(
          `/api/banks`,
          {
            headers,
            credentials: 'include',
          }
        );

        // Read response once - get text first to handle both success and error
        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';

        if (!response.ok) {
          // Handle error response
          let errorData: any = {
            status: response.status,
            statusText: response.statusText,
          };

          if (responseText && responseText.trim()) {
            try {
              const parsed = JSON.parse(responseText);
              errorData = { ...errorData, ...parsed };
            } catch (parseError) {
              errorData = {
                ...errorData,
                error: 'Invalid JSON response',
                rawResponse: responseText.substring(0, 500),
              };
            }
          }

          console.error('Failed to load banks:', errorData);
          
          // If it's a 401, redirect to login
          if (response.status === 401) {
            console.warn('Authentication failed. Redirecting to login...');
            window.location.href = '/login';
            return;
          }

          setUnassigned([]);
          return;
        }

        // Handle successful response
        if (!contentType.includes('application/json')) {
          console.error('Expected JSON response, got:', contentType);
          setUnassigned([]);
          return;
        }

        // Parse and validate successful response
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          setUnassigned([]);
          return;
        }

        // /api/banks returns an array directly, not { banks: [...] }
        const banksArray = Array.isArray(data) ? data : (data?.banks || []);

        // Filter by search query if provided
        let filteredBanks = banksArray;
        if (qUnassigned.trim()) {
          const searchLower = qUnassigned.toLowerCase();
          filteredBanks = banksArray.filter((bank: any) => {
            const dba = (bank.dba || bank.bank_name || '').toLowerCase();
            const bankName = (bank.bank_name || '').toLowerCase();
            const accountName = (bank.account_name || '').toLowerCase();
            return dba.includes(searchLower) || bankName.includes(searchLower) || accountName.includes(searchLower);
          });
        }

        // Validate and format each bank
        const validBanks = filteredBanks
          .map((bank: any) => ({
            id: bank.id?.toString() || '',
            dbaName: bank.dba || bank.bank_name || '',
            accountType: bank.account_type || 'CHECKING',
            bankName: bank.bank_name || '',
          }))
          .filter((bank: any) => 
            bank.id && bank.dbaName && bank.accountType && bank.bankName
          );

        console.log(`Successfully loaded ${validBanks.length} banks`);
        setUnassigned(validBanks as AccountRow[]);
      } catch (err) {
        console.error('Network error while loading banks:', err);
        setUnassigned([]);
      }
      
      // Don't load assigned accounts - user requested to remove that functionality
      setAssigned([]);
    } catch (err) {
      console.error('Error loading lists:', err);
      setUnassigned([]);
      setAssigned([]);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => { loadLists(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [qUnassigned]);

  const createUser = async () => {
    setError(null);
    
    // Client-side validation
    if (!username || !password) {
      setError("Username and password are required");
      return;
    }
    
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters long");
      return;
    }
    
    if (username.trim().length > 50) {
      setError("Username must be no more than 50 characters long");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    try {
      setCreating(true);
      const t = getToken();
      const headers: any = { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          username: username.trim(), 
          password,
          role,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        // If it's a validation error, show the details
        if (errorData?.details && Array.isArray(errorData.details)) {
          const validationMessages = errorData.details
            .map((issue: any) => {
              const field = issue.path?.join('.') || 'field';
              return `${field}: ${issue.message}`;
            })
            .join(', ');
          throw new Error(`Validation error: ${validationMessages}`);
        }
        
        throw new Error(errorData?.error || 'Failed to create user');
      }
      const data = await res.json();
      const id = data?.user?.id?.toString() || '';
      
      if (!id) {
        throw new Error('User created but no ID returned');
      }
      
      // Assign selected banks if any
      const selectedBankIds = Object.keys(selUnassigned).filter(k => selUnassigned[k]);
      if (selectedBankIds.length > 0) {
        try {
          const assignRes = await fetch(`/api/users/${id}/assign-banks`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ bankIds: selectedBankIds }),
            credentials: 'include',
          });
          
          if (!assignRes.ok) {
            const errorData = await assignRes.json().catch(() => ({}));
            console.error('Failed to assign banks:', errorData);
            throw new Error(errorData?.error || 'Failed to assign banks');
          }
          
          const assignData = await assignRes.json();
          console.log('Banks assigned successfully:', assignData);
        } catch (e: any) {
          console.error('Failed to assign banks:', e);
          // Don't throw here - user was created, just log the error
          setError(`User created but failed to assign banks: ${e?.message || String(e)}`);
        }
      }
      
      // Set active user ID for reference
      console.log('Setting activeUserId to:', id);
      setActiveUserId(id);
      
      // Clear form
      setUsername(""); 
      setPassword(""); 
      setRole("USER");
      setSelUnassigned({});
      
      // Reload lists to show all banks (including the one just assigned)
      console.log('Reloading lists to show all banks');
      await loadLists();
    } catch (e: any) {
      setError(e?.message || String(e));
      console.error('Error creating user:', e);
    } finally {
      setCreating(false);
    }
  };

  const toggleAll = (list: AccountRow[], map: Record<string, boolean>, setter: (v: Record<string, boolean>) => void, checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) list.forEach(r => { next[r.id] = true; });
    setter(next);
  };

  const bulkAssign = async () => {
    const ids = Object.keys(selUnassigned).filter(k => selUnassigned[k]);
    if (!ids.length || !activeUserId) return;
    try {
      const t = getToken();
      const headers: any = { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
      const res = await fetch(`/api/users/${activeUserId}/assign-banks`, { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ bankIds: ids }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to assign banks:', errorData);
        throw new Error(errorData?.error || 'Failed to assign banks');
      }
      
      const data = await res.json();
      console.log('Banks assigned successfully:', data);
      
      setSelUnassigned({});
      // Reload lists to show all banks
      await loadLists();
    } catch (e: any) {
      console.error('Error assigning banks:', e);
      setError(e?.message || 'Failed to assign banks');
    }
  };

  const bulkUnassign = async () => {
    const ids = Object.keys(selAssigned).filter(k => selAssigned[k]);
    if (!ids.length || !activeUserId) return;
    try {
      const t = getToken();
      const headers: any = { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
      const res = await fetch('/api/accounts/unassign', { 
        method: 'POST', 
        headers, 
        body: JSON.stringify({ userId: activeUserId, accountIds: ids }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to unassign banks:', errorData);
        throw new Error(errorData?.error || 'Failed to unassign banks');
      }
      
      const data = await res.json();
      console.log('Banks unassigned successfully:', data);
      
      setSelAssigned({});
      // Reload lists to show all banks
      await loadLists();
    } catch (e: any) {
      console.error('Error unassigning banks:', e);
      setError(e?.message || 'Failed to unassign banks');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Add User</h1>
        <p className="text-muted-foreground">Create a user and manage account access</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-300 p-3">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Create User */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jane" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Display Name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />
          </div>
          <div className="space-y-2">
            <label className="text-sm">Role</label>
            <div className="flex gap-3 text-sm">
              {(['USER','ADMIN','SUPER_ADMIN'] as const).map(r => (
                <label key={r} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${role===r? 'bg-emerald-600 text-white border-emerald-500':'bg-background text-foreground border-border'}`}>
                  <input type="radio" name="role" value={r} checked={role===r} onChange={() => setRole(r)} className="accent-emerald-500" />
                  {r.replace('_',' ')}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => { setUsername(""); setDisplayName(""); setPassword(""); setRole('USER'); }}>Cancel</Button>
            <Button onClick={createUser} disabled={creating} className="bg-emerald-600 hover:bg-emerald-500 text-white">{creating? 'Creating...':'Create / Update'}</Button>
          </div>
        </div>

        {/* Right: Unassigned / Assigned */}
        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unassigned */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Unassigned Accounts</h2>
              <div className="flex items-center gap-2">
                <input id="ua_all" type="checkbox" className="accent-emerald-500" onChange={(e) => toggleAll(unassigned, selUnassigned, setSelUnassigned, e.target.checked)} />
                <label htmlFor="ua_all" className="text-sm text-muted-foreground">Select All</label>
              </div>
            </div>
            <Input placeholder="Search..." value={qUnassigned} onChange={(e)=>setQUnassigned(e.target.value)} className="mb-3" />
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {loadingLists ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : unassigned.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 border border-border rounded-md bg-muted/30">
                  <div className="font-medium mb-1">No accounts found</div>
                  <div className="text-xs">No banks match your search criteria. Create a new bank to see it here.</div>
                </div>
              ) : unassigned.map(a => (
                <div key={a.id} className="flex items-start gap-3 border border-border rounded-md p-3">
                  <input 
                    type="checkbox" 
                    className="accent-emerald-500 mt-1" 
                    checked={!!selUnassigned[a.id]} 
                    onChange={(e)=> setSelUnassigned(prev=>({ ...prev, [a.id]: e.target.checked }))} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{a.dbaName}</div>
                    <div className="text-xs text-muted-foreground mt-1">{a.accountType}</div>
                    <div className="text-xs text-muted-foreground">{a.bankName}</div>
                  </div>
                  {activeUserId && (
                    <Button 
                      size="sm" 
                      className="shrink-0"
                      onClick={async ()=>{ 
                        setSelUnassigned(prev=>({ ...prev, [a.id]: true })); 
                        await bulkAssign(); 
                      }}
                    >
                      →
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {activeUserId && (
              <div className="mt-3 flex justify-end">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={bulkAssign} disabled={Object.keys(selUnassigned).filter(k => selUnassigned[k]).length === 0}>Assign Selected</Button>
              </div>
            )}
          </div>

          {/* Assigned */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Assigned Accounts</h2>
              <div className="flex items-center gap-2">
                <input id="as_all" type="checkbox" className="accent-emerald-500" onChange={(e) => toggleAll(assigned, selAssigned, setSelAssigned, e.target.checked)} />
                <label htmlFor="as_all" className="text-sm text-muted-foreground">Select All</label>
              </div>
            </div>
            <Input placeholder="Search..." value={qAssigned} onChange={(e)=>setQAssigned(e.target.value)} className="mb-3" />
            <div className="space-y-2 max-h-[420px] overflow-auto">
              {loadingLists ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : assigned.length === 0 ? (
                <div className="text-sm text-muted-foreground p-3 border border-border rounded-md bg-muted/30">
                  <div className="font-medium mb-1">No assigned accounts</div>
                  <div className="text-xs">No accounts are currently assigned. Select accounts from "Unassigned Accounts" and click "Assign Selected".</div>
                </div>
              ) : assigned.map(a => (
                <div key={a.id} className="flex items-start gap-3 border border-border rounded-md p-3">
                  <input 
                    type="checkbox" 
                    className="accent-emerald-500 mt-1" 
                    checked={!!selAssigned[a.id]} 
                    onChange={(e)=> setSelAssigned(prev=>({ ...prev, [a.id]: e.target.checked }))} 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{a.dbaName || a.name || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground mt-1">{a.accountType || 'CHECKING'}</div>
                    <div className="text-xs text-muted-foreground">{a.bankName}</div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="shrink-0"
                    onClick={async ()=>{ 
                      setSelAssigned(prev=>({ ...prev, [a.id]: true })); 
                      await bulkUnassign(); 
                    }}
                  >
                    ←
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="outline" onClick={bulkUnassign}>Unassign Selected</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


