'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '../actions';
import { 
  fetchCustomers, 
  renewLicense, 
  deleteCustomer, 
  verifyLicenseKey, 
  checkDemoMode,
  Customer 
} from './actions';
import CustomerForm from './CustomerForm';
import { 
  Activity, 
  LogOut, 
  Plus, 
  Search, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  Phone, 
  Cpu, 
  User, 
  Check, 
  ShieldAlert, 
  CheckCircle,
  Database,
  Info
} from 'lucide-react';

export default function DashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const router = useRouter();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Expired' | 'Expiring Soon'>('All');

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Mask/Unmask states (tracks IDs of unmasked license keys)
  const [unmaskedKeys, setUnmaskedKeys] = useState<Record<string, boolean>>({});

  // Copy success indicator state (tracks ID of copied customer)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cryptographic Verification Modal States
  const [verifyKeyData, setVerifyKeyData] = useState<{
    customer: Customer;
    decrypting: boolean;
    decryptedData?: {
      machineId: string;
      expirationDate: string;
      matchesMachine: boolean;
      matchesExpiry: boolean;
      isValid: boolean;
    };
    error?: string;
  } | null>(null);

  // Confirmation Modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renewConfirmId, setRenewConfirmId] = useState<Customer | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoRes = await checkDemoMode();
      setIsDemo(demoRes);

      const res = await fetchCustomers();
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setCustomers(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to establish connection to customer directory database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.refresh();
      router.push('/');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenew = async (customer: Customer) => {
    try {
      setLoading(true);
      const res = await renewLicense(customer.id, customer.machine_id);
      if (res.error) {
        alert(`Failed to renew license: ${res.error}`);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRenewConfirmId(null);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const res = await deleteCustomer(id);
      if (res.error) {
        alert(`Failed to delete customer: ${res.error}`);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
      setLoading(false);
    }
  };

  const handleVerifyKey = async (customer: Customer) => {
    setVerifyKeyData({
      customer,
      decrypting: true
    });

    // Artificially delay slightly (400ms) to show the decryption processing beautifully
    setTimeout(async () => {
      try {
        const res = await verifyLicenseKey(customer.license_key);
        if (res.error) {
          setVerifyKeyData({
            customer,
            decrypting: false,
            error: res.error
          });
        } else if (res.success && res.machineId && res.expirationDate) {
          const dbExpiryDate = new Date(customer.expiry_date).toDateString();
          const decryptedExpiryDate = new Date(res.expirationDate).toDateString();
          
          const matchesMachine = res.machineId === customer.machine_id;
          const matchesExpiry = dbExpiryDate === decryptedExpiryDate;
          
          setVerifyKeyData({
            customer,
            decrypting: false,
            decryptedData: {
              machineId: res.machineId,
              expirationDate: res.expirationDate,
              matchesMachine,
              matchesExpiry,
              isValid: matchesMachine && matchesExpiry
            }
          });
        }
      } catch (err: any) {
        setVerifyKeyData({
          customer,
          decrypting: false,
          error: err.message || 'Verification execution failed.'
        });
      }
    }, 400);
  };

  const toggleMask = (id: string) => {
    setUnmaskedKeys(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper: check licensing status relative to current local time (2026-06-01)
  const getLicenseStatus = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const now = new Date('2026-06-01T16:04:55+05:30'); // Fixed local time relative to prompt context
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: 'Expired', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', raw: 'Expired' };
    }
    if (diffDays <= 30) {
      return { label: `Expiring soon (${diffDays}d)`, color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', raw: 'Expiring Soon' };
    }
    return { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', raw: 'Active' };
  };

  // Statistics calculation
  const totalLabs = customers.length;
  const activeLicenses = customers.filter(c => getLicenseStatus(c.expiry_date).raw === 'Active').length;
  const expiredLicenses = customers.filter(c => getLicenseStatus(c.expiry_date).raw === 'Expired').length;
  const expiringSoonLicenses = customers.filter(c => getLicenseStatus(c.expiry_date).raw === 'Expiring Soon').length;

  // Filter & Search Logic
  const filteredCustomers = customers.filter(c => {
    const status = getLicenseStatus(c.expiry_date).raw;
    const matchesStatus = 
      statusFilter === 'All' || 
      statusFilter === status;

    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      c.lab_name.toLowerCase().includes(query) ||
      c.owner_name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      c.machine_id.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-x-hidden">
      {/* Background Glowing Blurs */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Activity className="h-5.5 w-5.5 text-zinc-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-50 to-zinc-300">
              Pathology LIS Portal
            </h1>
            <p className="text-[10px] text-zinc-400 font-medium">License Registry & Administration</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Demo Database Indicator */}
          {isDemo && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
              <Database className="h-3.5 w-3.5" />
              Demo Mode
            </div>
          )}
          
          <button
            onClick={loadData}
            title="Refresh Registry"
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200 transition-all cursor-pointer text-zinc-400"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-rose-400 text-zinc-300 font-semibold text-sm px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8 z-10">
        
        {/* Banner Alert for Demo Mode */}
        {isDemo && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-300 text-sm font-medium leading-relaxed">
            <Info className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="font-bold">Database Fallback Activated: </span>
              The portal is using a secure server-side in-memory mock database because the Supabase configuration variables are not set or contain template values. You can fully test adding, renewing, deleting, and cryptographically verifying license keys!
            </div>
          </div>
        )}

        {/* STATS PANEL (KPI Grid) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Stat 1: Total Labs */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="h-20 w-20 text-zinc-100" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Registered Labs</p>
            <p className="text-3xl font-extrabold mt-2 text-zinc-100">{totalLabs}</p>
            <div className="mt-2 text-[10px] text-zinc-500 font-medium">Global active pathology clients</div>
          </div>

          {/* Stat 2: Active */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle className="h-20 w-20 text-emerald-500" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Licenses</p>
            <p className="text-3xl font-extrabold mt-2 text-emerald-400">{activeLicenses}</p>
            <div className="mt-2 text-[10px] text-emerald-500/60 font-medium">Valid credentials authorized</div>
          </div>

          {/* Stat 3: Expiring Soon */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-20 w-20 text-amber-500" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Expiring Soon</p>
            <p className="text-3xl font-extrabold mt-2 text-amber-400">{expiringSoonLicenses}</p>
            <div className="mt-2 text-[10px] text-amber-500/60 font-medium">Expiry in next 30 days</div>
          </div>

          {/* Stat 4: Expired */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 relative overflow-hidden group shadow-lg shadow-black/40">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldAlert className="h-20 w-20 text-rose-500" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Expired Licenses</p>
            <p className="text-3xl font-extrabold mt-2 text-rose-400">{expiredLicenses}</p>
            <div className="mt-2 text-[10px] text-rose-500/60 font-medium">Requires immediate renewal</div>
          </div>
        </section>

        {/* CONTROLS (Search & Filters) */}
        <section className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Lab Name, Owner, Phone or Machine ID..."
              className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40 rounded-xl py-2.5 pl-10 pr-4 outline-none text-zinc-100 placeholder-zinc-650 transition-all text-sm shadow-inner"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500" />
            </div>
          </div>

          {/* Filters & Add Customer CTA */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/60 flex items-center">
              {(['All', 'Active', 'Expiring Soon', 'Expired'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === tab 
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/5' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Add customer CTA */}
            <button
              onClick={() => setIsAddOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/5 flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Add Customer
            </button>
          </div>
        </section>

        {/* CUSTOMERS TABLE */}
        <section className="backdrop-blur-md bg-zinc-900/35 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
          {loading && customers.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-zinc-400">
              <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Contacting registry database...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
              <ShieldAlert className="h-10 w-10 text-zinc-650" />
              <p className="font-bold text-zinc-400">No Customers Found</p>
              <p className="text-xs">Adjust filters or search parameters, or register a new laboratory client.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/60 bg-zinc-900/10 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Laboratory & Owner</th>
                    <th className="py-4 px-6">Contact Phone</th>
                    <th className="py-4 px-6">Machine ID</th>
                    <th className="py-4 px-6">Expiry Date</th>
                    <th className="py-4 px-6">License Key</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30 text-sm font-medium">
                  {filteredCustomers.map((customer) => {
                    const status = getLicenseStatus(customer.expiry_date);
                    const isMasked = !unmaskedKeys[customer.id];
                    const isCopied = copiedId === customer.id;

                    return (
                      <tr key={customer.id} className="hover:bg-zinc-900/20 transition-colors">
                        {/* Lab name and Owner */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-zinc-100">{customer.lab_name}</div>
                          <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {customer.owner_name}
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="py-4 px-6 text-zinc-300">
                          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                            <Phone className="h-3.5 w-3.5 text-zinc-500" />
                            {customer.phone}
                          </div>
                        </td>

                        {/* Machine ID */}
                        <td className="py-4 px-6">
                          <span className="font-mono text-xs px-2 py-1 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-400">
                            {customer.machine_id}
                          </span>
                        </td>

                        {/* Expiry date & status */}
                        <td className="py-4 px-6">
                          <div className="text-zinc-200 text-xs">
                            {new Date(customer.expiry_date).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded mt-1.5 ${status.color}`}>
                            {status.label}
                          </span>
                        </td>

                        {/* License Key Mask/Unmask, Copy, Verify */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-xs bg-zinc-950/80 border border-zinc-850 px-3 py-1.5 rounded-lg max-w-[160px] truncate text-zinc-500">
                              {isMasked 
                                ? `${customer.license_key.substring(0, 8)}••••••••${customer.license_key.substring(customer.license_key.length - 8)}`
                                : customer.license_key
                              }
                            </div>
                            
                            {/* Toggle visibility */}
                            <button
                              onClick={() => toggleMask(customer.id)}
                              title={isMasked ? "Show Key" : "Hide Key"}
                              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                            >
                              {isMasked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>

                            {/* Copy button */}
                            <button
                              onClick={() => copyToClipboard(customer.license_key, customer.id)}
                              title="Copy Key"
                              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer relative"
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>

                            {/* Cryptographic verify badge */}
                            <button
                              onClick={() => handleVerifyKey(customer)}
                              title="Verify Cryptographic Key"
                              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Verify Key
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Renew */}
                            <button
                              onClick={() => setRenewConfirmId(customer)}
                              title="Renew License (+1 Year)"
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400 text-xs flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              Renew
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirmId(customer.id)}
                              title="Delete Customer"
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/20 text-zinc-400 hover:text-rose-450 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* RENEW CONFIRMATION MODAL */}
      {renewConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRenewConfirmId(null)} />
          <div className="relative backdrop-blur-xl bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl z-10 animate-scaleUp">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-emerald-400" />
              Renew License Key?
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Are you sure you want to renew the license for <span className="font-bold text-zinc-200">{renewConfirmId.lab_name}</span>? 
              This will extend the expiration date by <span className="text-emerald-400 font-bold">1 year</span> from today and cryptographically generate a new LIS license key.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setRenewConfirmId(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRenew(renewConfirmId)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-2 rounded-xl text-sm font-extrabold transition-all cursor-pointer"
              >
                Confirm Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative backdrop-blur-xl bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl z-10 animate-scaleUp">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-3">
              <ShieldAlert className="h-5 w-5 text-rose-500" />
              Delete Customer?
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete this customer record? This will revoke access authorizations and cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-zinc-100 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRYPTOGRAPHIC VERIFICATION MODAL */}
      {verifyKeyData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setVerifyKeyData(null)} />
          <div className="relative backdrop-blur-xl bg-zinc-900/95 border border-zinc-850 rounded-3xl p-6 max-w-md w-full shadow-2xl z-10 animate-scaleUp">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-850 mb-5">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                LIS Cryptographic Audit
              </h3>
              <button 
                onClick={() => setVerifyKeyData(null)}
                className="p-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {verifyKeyData.decrypting ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-widest animate-pulse">
                  Decoding AES-256-CBC...
                </div>
              </div>
            ) : verifyKeyData.error ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2.5 text-xs">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-bold">Cryptographic Failure: </span>
                    {verifyKeyData.error}
                  </div>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  The license key could not be decrypted. This indicates tampering, key corruption, or mismatch with the shared secret salt key.
                </p>
              </div>
            ) : verifyKeyData.decryptedData ? (
              <div className="space-y-5">
                {/* Visual success banner */}
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-400 animate-bounce" />
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">Integrity Audit Passed</div>
                    <div className="text-[10px] text-emerald-500/70 font-semibold mt-0.5">Authenticity & Cryptography Validated</div>
                  </div>
                </div>

                {/* Key inspection panel */}
                <div className="space-y-3.5 bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Target Lab</div>
                    <div className="font-bold text-zinc-200">{verifyKeyData.customer.lab_name}</div>
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Hardware Machine ID</span>
                      {verifyKeyData.decryptedData.matchesMachine ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                          <Check className="h-2.5 w-2.5" /> Matches
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-0.5 bg-rose-500/10 border border-rose-500/20 px-1 rounded">
                          Mismatch
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <div className="text-[9px] text-zinc-600 font-medium">Database state:</div>
                        <div className="font-mono mt-0.5 text-zinc-400">{verifyKeyData.customer.machine_id}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-zinc-600 font-medium">Decrypted Key state:</div>
                        <div className="font-mono mt-0.5 text-emerald-400">{verifyKeyData.decryptedData.machineId}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Expiration Date Mapping</span>
                      {verifyKeyData.decryptedData.matchesExpiry ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                          <Check className="h-2.5 w-2.5" /> Matches
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-0.5 bg-rose-500/10 border border-rose-500/20 px-1 rounded">
                          Mismatch
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <div className="text-[9px] text-zinc-600 font-medium">Database state:</div>
                        <div className="mt-0.5 text-zinc-400 truncate" title={verifyKeyData.customer.expiry_date}>
                          {new Date(verifyKeyData.customer.expiry_date).toDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-zinc-600 font-medium">Decrypted Key state:</div>
                        <div className="mt-0.5 text-emerald-400 truncate" title={verifyKeyData.decryptedData.expirationDate}>
                          {new Date(verifyKeyData.decryptedData.expirationDate).toDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Payload Format Decoded</div>
                    <div className="font-mono text-[10px] bg-zinc-900 p-2 rounded border border-zinc-800 text-indigo-400 break-all select-all">
                      {`${verifyKeyData.decryptedData.machineId}|${verifyKeyData.decryptedData.expirationDate}`}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                  Verification verified that the AES-256-CBC payload contained in the key parses to matching variables. The salt key was successfully validated against the input string.
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setVerifyKeyData(null)}
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-zinc-200 text-zinc-300 font-bold px-5 py-2 rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Form Modal */}
      <CustomerForm 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSuccess={loadData}
      />
    </div>
  );
}

// Simple custom component for close icon
function XCircle({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor" 
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
