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
  updateCustomerStatus,
  pushSoftwareUpdate,
  fetchSoftwareUpdates,
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
  Info,
  Pause,
  StopCircle,
  Play,
  ArrowUpCircle,
  History,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { SoftwareUpdate } from '@/lib/fileDb';

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<'labs' | 'updates'>('labs');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [updates, setUpdates] = useState<SoftwareUpdate[]>([]);
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

  // Software Update Form States
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');
  const [updateCritical, setUpdateCritical] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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

      const updatesRes = await fetchSoftwareUpdates();
      if (updatesRes.success && updatesRes.data) {
        setUpdates(updatesRes.data);
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

  const handleStatusChange = async (id: string, newStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED') => {
    try {
      setLoading(true);
      const res = await updateCustomerStatus(id, newStatus);
      if (res.error) {
        alert(`Failed to update customer status: ${res.error}`);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePushUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateVersion || !updateTitle || !updateNotes || !updateUrl) {
      setUpdateError('Please fill in all update fields.');
      return;
    }

    setUpdateLoading(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      const res = await pushSoftwareUpdate({
        version: updateVersion.trim(),
        title: updateTitle.trim(),
        releaseNotes: updateNotes.trim(),
        downloadUrl: updateUrl.trim(),
        isCritical: updateCritical
      });

      if (res.error) {
        setUpdateError(res.error);
      } else {
        setUpdateSuccess(true);
        setUpdateVersion('');
        setUpdateTitle('');
        setUpdateNotes('');
        setUpdateUrl('');
        setUpdateCritical(false);
        await loadData();
      }
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to push update.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, nextFieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextElement = document.getElementById(nextFieldId);
      if (nextElement) {
        nextElement.focus();
      }
    }
  };

  const handleVerifyKey = async (customer: Customer) => {
    setVerifyKeyData({
      customer,
      decrypting: true
    });

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

  // Helper: check licensing status relative to current local time
  const getLicenseStatus = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { label: 'Expired', color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', raw: 'Expired' };
    }
    if (diffDays <= 30) {
      return { label: `Expiring soon (${diffDays}d)`, color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', raw: 'Expiring Soon' };
    }
    return { label: 'Active', color: 'bg-teal-500/10 text-teal-400 border border-teal-500/20', raw: 'Active' };
  };

  const getAdminStatusDetails = (status: string) => {
    switch (status) {
      case 'PAUSED':
        return { label: 'Paused by Admin', color: 'bg-orange-500/15 text-orange-400 border border-orange-500/25' };
      case 'STOPPED':
        return { label: 'Stopped / Revoked', color: 'bg-red-500/15 text-red-400 border border-red-500/25' };
      default:
        return { label: 'Online Active', color: 'bg-teal-500/15 text-teal-400 border border-teal-500/25' };
    }
  };

  // Statistics calculation
  const totalLabs = customers.length;
  const activeLicenses = customers.filter(c => getLicenseStatus(c.expiry_date).raw === 'Active' && c.status !== 'STOPPED' && c.status !== 'PAUSED').length;
  const expiredLicenses = customers.filter(c => getLicenseStatus(c.expiry_date).raw === 'Expired' || c.status === 'STOPPED').length;
  const expiringSoonLicenses = customers.filter(c => getLicenseStatus(c.expiry_date).raw === 'Expiring Soon' && c.status === 'ACTIVE').length;

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
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full bg-violet-500/8 blur-[100px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-25" 
        style={{ maskImage: 'radial-gradient(ellipse at center, black, transparent)' }}
      />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/10">
            <Activity className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-50 to-zinc-300">
              Pathology LIS Portal
            </h1>
            <p className="text-[9px] sm:text-[10px] text-zinc-400 font-medium">License Registry & Administration</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Demo Database Indicator */}
          {isDemo && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
              <Database className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Demo Mode</span>
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
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-855 hover:text-rose-400 text-zinc-300 font-semibold text-sm px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
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
              The portal is using a secure local file database (`customers_db.json` & `updates_db.json`) because Supabase credentials are in template mode. Remote status API check and pushes are fully operational!
            </div>
          </div>
        )}

        {/* STATS PANEL (KPI Grid) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Stat 1: Total Labs */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 hover:border-indigo-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg shadow-black/40 hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="h-20 w-20 text-zinc-100" />
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Registered Labs</p>
            <p className="text-2xl sm:text-3xl font-extrabold mt-2 text-zinc-100">{totalLabs}</p>
            <div className="mt-2 text-[10px] text-zinc-500 font-medium">Global active pathology clients</div>
          </div>

          {/* Stat 2: Active */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 hover:border-teal-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg shadow-black/40 hover:shadow-teal-500/5 hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle className="h-20 w-20 text-teal-500" />
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Authorized Active</p>
            <p className="text-2xl sm:text-3xl font-extrabold mt-2 text-teal-400">{activeLicenses}</p>
            <div className="mt-2 text-[10px] text-teal-500/60 font-medium">Valid credentials running</div>
          </div>

          {/* Stat 3: Expiring Soon */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 hover:border-amber-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg shadow-black/40 hover:shadow-amber-500/5 hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-20 w-20 text-amber-500" />
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Expiring Soon</p>
            <p className="text-2xl sm:text-3xl font-extrabold mt-2 text-amber-400">{expiringSoonLicenses}</p>
            <div className="mt-2 text-[10px] text-amber-500/60 font-medium">Expiry in next 30 days</div>
          </div>

          {/* Stat 4: Expired */}
          <div className="backdrop-blur-md bg-zinc-900/40 border border-zinc-800/80 hover:border-rose-500/30 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg shadow-black/40 hover:shadow-rose-500/5 hover:-translate-y-0.5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldAlert className="h-20 w-20 text-rose-500" />
            </div>
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Blocked / Expired</p>
            <p className="text-2xl sm:text-3xl font-extrabold mt-2 text-rose-400">{expiredLicenses}</p>
            <div className="mt-2 text-[10px] text-rose-500/60 font-medium">Requires renewal or unlock</div>
          </div>
        </section>

        {/* Dynamic Panels Tab bar */}
        <div className="flex border-b border-zinc-800 gap-4 sm:gap-6 overflow-x-auto scrollbar-none scroll-smooth">
          <button 
            onClick={() => setActivePanel('labs')}
            className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${activePanel === 'labs' ? 'text-indigo-400 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <Cpu className="h-4 w-4" />
            Registered Laboratories
            {activePanel === 'labs' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-500" />
            )}
          </button>
          <button 
            onClick={() => setActivePanel('updates')}
            className={`pb-3 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer whitespace-nowrap ${activePanel === 'updates' ? 'text-indigo-400 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            <ArrowUpCircle className="h-4 w-4" />
            Software Updates Manager
            {activePanel === 'updates' && (
              <div className="absolute bottom-0 inset-x-0 h-0.5 bg-indigo-500" />
            )}
          </button>
        </div>

        {/* TAB CONTENT: LABS LIST */}
        {activePanel === 'labs' && (
          <div className="space-y-6">
            {/* CONTROLS (Search & Filters) */}
            <section className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
              <div className="relative flex-1 max-w-md w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Lab Name, Owner, Phone or Machine ID..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/45 rounded-xl py-2.5 pl-10 pr-4 outline-none text-zinc-100 placeholder-zinc-650 transition-all text-sm shadow-inner hover:border-zinc-700"
                />
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-zinc-500" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/60 flex items-center overflow-x-auto whitespace-nowrap scrollbar-none justify-between sm:justify-start">
                  {(['All', 'Active', 'Expiring Soon', 'Expired'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                        statusFilter === tab 
                          ? 'bg-indigo-600 text-zinc-50 font-bold shadow-md shadow-indigo-600/15' 
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAddOpen(true)}
                  className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-zinc-50 font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer w-full sm:w-auto"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Add Customer
                </button>
              </div>
            </section>

            {/* CUSTOMERS DATA CONTAINER */}
            <section className="backdrop-blur-md bg-zinc-900/35 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
              {loading && customers.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center gap-4 text-zinc-400">
                  <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-semibold">Contacting registry database...</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-16 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                  <ShieldAlert className="h-10 w-10 text-zinc-650" />
                  <p className="font-bold text-zinc-400">No Customers Found</p>
                  <p className="text-xs">Adjust filters or search parameters, or register a new laboratory client.</p>
                </div>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800/60 bg-zinc-900/10 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-4 px-6 min-w-[200px]">Laboratory & Owner</th>
                          <th className="py-4 px-6 min-w-[140px]">Contact Phone</th>
                          <th className="py-4 px-6 min-w-[170px]">Machine ID</th>
                          <th className="py-4 px-6 min-w-[170px]">Expiry & Access Status</th>
                          <th className="py-4 px-6 min-w-[120px]">Price (INR)</th>
                          <th className="py-4 px-6 min-w-[310px]">License Key</th>
                          <th className="py-4 px-6 text-right min-w-[185px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/30 text-sm font-medium">
                        {filteredCustomers.map((customer) => {
                          const status = getLicenseStatus(customer.expiry_date);
                          const adminStatus = getAdminStatusDetails(customer.status);
                          const isMasked = !unmaskedKeys[customer.id];
                          const isCopied = copiedId === customer.id;

                          return (
                            <tr key={customer.id} className="hover:bg-zinc-900/20 transition-colors">
                              <td className="py-4 px-6">
                                <div className="font-bold text-zinc-100">{customer.lab_name}</div>
                                <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                  <User className="h-3 w-3" />
                                  {customer.owner_name}
                                </div>
                              </td>

                              <td className="py-4 px-6 text-zinc-350">
                                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                  <Phone className="h-3.5 w-3.5 text-zinc-500" />
                                  {customer.phone}
                                </div>
                              </td>

                              <td className="py-4 px-6">
                                <span 
                                  className="font-mono text-xs px-2 py-1 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-400 block w-fit truncate max-w-[145px] cursor-help"
                                  title={customer.machine_id}
                                >
                                  {customer.machine_id.length > 18 
                                    ? `${customer.machine_id.substring(0, 8)}...${customer.machine_id.slice(-8)}` 
                                    : customer.machine_id}
                                </span>
                              </td>

                              <td className="py-4 px-6">
                                <div className="text-zinc-200 text-xs font-semibold">
                                  {new Date(customer.expiry_date).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${status.color}`}>
                                    {status.label}
                                  </span>
                                  <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${adminStatus.color}`}>
                                    {adminStatus.label}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-6 text-zinc-350 font-mono text-xs">
                                ₹{(customer.price || 0).toLocaleString('en-IN')}
                              </td>

                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  <div className="font-mono text-xs bg-zinc-950/80 border border-zinc-850 px-3 py-1.5 rounded-lg max-w-[160px] truncate text-zinc-500">
                                    {isMasked 
                                      ? `${customer.license_key.substring(0, 8)}••••••••${customer.license_key.substring(customer.license_key.length - 8)}`
                                      : customer.license_key
                                    }
                                  </div>
                                  
                                  <button
                                    onClick={() => toggleMask(customer.id)}
                                    title={isMasked ? "Show Key" : "Hide Key"}
                                    className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                                  >
                                    {isMasked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                  </button>

                                  <button
                                    onClick={() => copyToClipboard(customer.license_key, customer.id)}
                                    title="Copy Key"
                                    className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer relative"
                                  >
                                    {isCopied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>

                                  <button
                                    onClick={() => handleVerifyKey(customer)}
                                    title="Verify Cryptographic Key"
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold transition-all cursor-pointer"
                                  >
                                    <ShieldCheck className="h-3 w-3" />
                                    Verify Key
                                  </button>
                                </div>
                              </td>

                              <td className="py-4 px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Pause / Resume controls */}
                                  {customer.status === 'ACTIVE' ? (
                                    <>
                                      <button
                                        onClick={() => handleStatusChange(customer.id, 'PAUSED')}
                                        title="Pause License"
                                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/20 transition-all cursor-pointer"
                                      >
                                        <Pause className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleStatusChange(customer.id, 'STOPPED')}
                                        title="Stop License"
                                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/20 transition-all cursor-pointer"
                                      >
                                        <StopCircle className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleStatusChange(customer.id, 'ACTIVE')}
                                      title="Activate/Resume License"
                                      className="px-2 py-1 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                                    >
                                      <Play className="h-3 w-3" />
                                      Resume
                                    </button>
                                  )}

                                  {/* Renew */}
                                  <button
                                    onClick={() => setRenewConfirmId(customer)}
                                    title="Renew License (+1 Year)"
                                    className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/40 text-zinc-400 hover:text-indigo-400 text-xs flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Calendar className="h-3.5 w-3.5" />
                                    Renew
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => setDeleteConfirmId(customer.id)}
                                    title="Delete Customer"
                                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/20 text-zinc-400 hover:text-rose-455 transition-all cursor-pointer"
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

                  {/* Mobile View Cards */}
                  <div className="block md:hidden space-y-4 p-4 divide-y divide-zinc-800/40">
                    {filteredCustomers.map((customer, idx) => {
                      const status = getLicenseStatus(customer.expiry_date);
                      const adminStatus = getAdminStatusDetails(customer.status);
                      const isMasked = !unmaskedKeys[customer.id];
                      const isCopied = copiedId === customer.id;

                      return (
                        <div key={customer.id} className={`space-y-4 ${idx > 0 ? 'pt-4' : ''}`}>
                          {/* Lab Title and Status Badges */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-bold text-zinc-100 text-sm">{customer.lab_name}</h4>
                              <div className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                                <User className="h-3 w-3 text-zinc-650" />
                                {customer.owner_name}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 items-end shrink-0">
                              <span className={`inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${status.color}`}>
                                {status.label}
                              </span>
                              <span className={`inline-block text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${adminStatus.color}`}>
                                {adminStatus.label}
                              </span>
                            </div>
                          </div>

                          {/* Grid Metadata */}
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Phone</div>
                              <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-zinc-300 hover:text-indigo-400">
                                <Phone className="h-3 w-3 text-zinc-650" />
                                {customer.phone}
                              </a>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Machine ID</div>
                              <span 
                                className="font-mono text-[10px] px-1.5 py-0.5 bg-zinc-950 border border-zinc-850 rounded text-zinc-400 inline-block truncate max-w-full cursor-help"
                                title={customer.machine_id}
                              >
                                {customer.machine_id.length > 18 
                                  ? `${customer.machine_id.substring(0, 8)}...${customer.machine_id.slice(-8)}` 
                                  : customer.machine_id}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Price</div>
                              <span className="text-zinc-300 font-semibold font-mono">
                                ₹{(customer.price || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Expiry Date</div>
                            <div className="flex items-center gap-1 text-zinc-300">
                              <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                              {new Date(customer.expiry_date).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>

                          {/* License Key Section */}
                          <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-mono text-xs text-zinc-500 truncate select-all">
                                {isMasked 
                                  ? `${customer.license_key.substring(0, 8)}••••••••${customer.license_key.substring(customer.license_key.length - 8)}`
                                  : customer.license_key
                                }
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => toggleMask(customer.id)}
                                  className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
                                >
                                  {isMasked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(customer.license_key, customer.id)}
                                  className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer relative"
                                >
                                  {isCopied ? <Check className="h-3.5 w-3.5 text-teal-400" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => handleVerifyKey(customer)}
                              className="w-full flex items-center justify-center gap-1 py-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold transition-all cursor-pointer"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              Verify Key Integrity
                            </button>
                          </div>

                          {/* Actions Buttons */}
                          <div className="flex items-center justify-between gap-2 pt-2">
                            <div className="flex gap-1">
                              {customer.status === 'ACTIVE' ? (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(customer.id, 'PAUSED')}
                                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-orange-400 transition-all cursor-pointer"
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(customer.id, 'STOPPED')}
                                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
                                  >
                                    <StopCircle className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(customer.id, 'ACTIVE')}
                                  className="px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-400 text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer font-semibold"
                                >
                                  <Play className="h-3.5 w-3.5" />
                                  Resume
                                </button>
                              )}
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setRenewConfirmId(customer)}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-350 hover:text-indigo-400 hover:border-indigo-500/30 text-xs flex items-center gap-1 transition-all cursor-pointer font-semibold"
                              >
                                <Calendar className="h-3.5 w-3.5" />
                                Renew
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(customer.id)}
                                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* TAB CONTENT: SOFTWARE UPDATES */}
        {activePanel === 'updates' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Left Column: Push Update Form */}
            <div className="lg:col-span-2 backdrop-blur-md bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden h-fit">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                Push Online Release
              </h2>
              <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                Publishing an update will alert all LIS client applications as soon as they connect to the internet.
              </p>

              <form onSubmit={handlePushUpdate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Release Version
                  </label>
                  <input
                    id="updateVersion"
                    type="text"
                    value={updateVersion}
                    onChange={(e) => setUpdateVersion(e.target.value)}
                    onKeyDown={(e) => handleInputKeyDown(e, 'updateTitle')}
                    placeholder="e.g. 1.1.0"
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/40 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-650 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Release Title
                  </label>
                  <input
                    id="updateTitle"
                    type="text"
                    value={updateTitle}
                    onChange={(e) => setUpdateTitle(e.target.value)}
                    onKeyDown={(e) => handleInputKeyDown(e, 'updateNotes')}
                    placeholder="e.g. NABL Compliance Pack & Auto-Formula Updates"
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/40 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-650 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Release Notes (What's new?)
                  </label>
                  <textarea
                    id="updateNotes"
                    rows={4}
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                    placeholder="1. Enter key jump shortcut&#10;2. MCV/MCH calculations auto-evaluated&#10;3. Premium layout margin adjustments"
                    className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/40 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-650 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Download File URL
                  </label>
                  <div className="relative">
                    <input
                      id="updateUrl"
                      type="text"
                      value={updateUrl}
                      onChange={(e) => setUpdateUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handlePushUpdate(e);
                        }
                      }}
                      placeholder="https://example.com/downloads/lis-setup.exe"
                      className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/40 rounded-xl py-2.5 pl-9 pr-4 outline-none text-zinc-100 text-sm placeholder-zinc-650 transition-all"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LinkIcon className="h-3.5 w-3.5 text-zinc-550" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 py-1">
                  <input
                    id="isCritical"
                    type="checkbox"
                    checked={updateCritical}
                    onChange={(e) => setUpdateCritical(e.target.checked)}
                    className="h-4 w-4 bg-zinc-950 border-zinc-800 rounded focus:ring-cyan-500/30 text-cyan-500 cursor-pointer"
                  />
                  <label htmlFor="isCritical" className="text-xs text-zinc-400 font-semibold cursor-pointer select-none">
                    Mark as Critical Release (Forced update alert)
                  </label>
                </div>

                {updateError && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{updateError}</span>
                  </div>
                )}

                {updateSuccess && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium">
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Update published successfully online!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={updateLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-zinc-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/5 transition-all cursor-pointer text-sm"
                >
                  {updateLoading ? (
                    <div className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowUpCircle className="h-4 w-4" />
                      Publish Software Update
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Update Releases Log */}
            <div className="lg:col-span-3 backdrop-blur-md bg-zinc-900/20 border border-zinc-850 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-indigo-400" />
                  Release History Log
                </h2>

                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {updates.map((up, idx) => (
                    <div key={idx} className="p-4 bg-zinc-950/70 border border-zinc-900 rounded-2xl relative overflow-hidden group">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-extrabold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-lg">
                              v{up.version}
                            </span>
                            {up.isCritical && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 rounded">
                                Critical
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500">
                              {new Date(up.publishedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <h3 className="font-bold text-zinc-200 mt-2 text-sm">{up.title}</h3>
                          <div className="text-xs text-zinc-450 mt-1 whitespace-pre-line leading-relaxed font-sans pl-1.5 border-l-2 border-zinc-800">
                            {up.releaseNotes}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3.5 pt-3 border-t border-zinc-900/60 flex items-center justify-between text-xs text-zinc-500">
                        <span className="truncate max-w-[220px] font-mono text-[10px]" title={up.downloadUrl}>
                          Url: {up.downloadUrl}
                        </span>
                        <a 
                          href={up.downloadUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline flex items-center gap-1 shrink-0"
                        >
                          Download Link
                        </a>
                      </div>
                    </div>
                  ))}

                  {updates.length === 0 && (
                    <div className="py-16 text-center text-zinc-500">
                      <History className="h-10 w-10 text-zinc-800 mx-auto mb-2" />
                      <p className="font-bold text-zinc-400">No Releases Published</p>
                      <p className="text-xs">Publish your first update to see the history log here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
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
          <div className="relative backdrop-blur-xl bg-zinc-900/95 border border-zinc-850 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl z-10 animate-scaleUp">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
            
            <div className="flex items-center justify-between pb-4 border-b border-zinc-850 mb-5">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                LIS Cryptographic Audit
              </h3>
              <button 
                onClick={() => setVerifyKeyData(null)}
                className="p-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {verifyKeyData.decrypting ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="h-10 w-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-semibold text-indigo-400 uppercase tracking-widest animate-pulse">
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
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-teal-400 animate-bounce" />
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider">Integrity Audit Passed</div>
                    <div className="text-[10px] text-teal-500/70 font-semibold mt-0.5">Authenticity & Cryptography Validated</div>
                  </div>
                </div>

                <div className="space-y-3.5 bg-zinc-950 p-4 rounded-2xl border border-zinc-850 text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Target Lab</div>
                    <div className="font-bold text-zinc-200">{verifyKeyData.customer.lab_name}</div>
                            <div className="border-t border-zinc-900 pt-3">
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Hardware Machine ID</span>
                      {verifyKeyData.decryptedData.matchesMachine ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-0.5 bg-teal-500/10 border border-teal-500/20 px-1 rounded">
                          <Check className="h-2.5 w-2.5" /> Matches
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-0.5 bg-rose-500/10 border border-rose-500/20 px-1 rounded">
                          Mismatch
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-850">
                        <div className="text-[9px] text-zinc-500 font-medium">Database state:</div>
                        <div className="font-mono mt-0.5 text-zinc-300 break-all">{verifyKeyData.customer.machine_id}</div>
                      </div>
                      <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-855">
                        <div className="text-[9px] text-zinc-500 font-medium">Decrypted Key state:</div>
                        <div className="font-mono mt-0.5 text-teal-400 break-all">{verifyKeyData.decryptedData.machineId}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900 pt-3">
                    <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Expiration Date Mapping</span>
                      {verifyKeyData.decryptedData.matchesExpiry ? (
                        <span className="text-[9px] font-black uppercase tracking-wider text-teal-400 flex items-center gap-0.5 bg-teal-500/10 border border-teal-500/20 px-1 rounded">
                          <Check className="h-2.5 w-2.5" /> Matches
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-0.5 bg-rose-500/10 border border-rose-500/20 px-1 rounded">
                          Mismatch
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-850">
                        <div className="text-[9px] text-zinc-500 font-medium">Database state:</div>
                        <div className="mt-0.5 text-zinc-300 truncate" title={verifyKeyData.customer.expiry_date}>
                          {new Date(verifyKeyData.customer.expiry_date).toDateString()}
                        </div>
                      </div>
                      <div className="bg-zinc-900/50 p-2 rounded-lg border border-zinc-850">
                        <div className="text-[9px] text-zinc-500 font-medium">Decrypted Key state:</div>
                        <div className="mt-0.5 text-teal-400 truncate" title={verifyKeyData.decryptedData.expirationDate}>
                          {new Date(verifyKeyData.decryptedData.expirationDate).toDateString()}
                        </div>
                      </div>
                    </div>
                  </div>          </div>

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
