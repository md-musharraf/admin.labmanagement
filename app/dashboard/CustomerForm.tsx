'use client';

import React, { useState } from 'react';
import { createCustomer } from './actions';
import { X, Plus, Activity, User, Phone, Cpu, Calendar, AlertTriangle } from 'lucide-react';

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CustomerForm({ isOpen, onClose, onSuccess }: CustomerFormProps) {
  const [labName, setLabName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [machineId, setMachineId] = useState('');
  const [planDuration, setPlanDuration] = useState('1 Year');
  const [price, setPrice] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labName || !ownerName || !phone || !machineId || !planDuration) {
      setError('Please fill in all fields.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Please enter a valid non-negative price.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await createCustomer({
        labName,
        ownerName,
        phone,
        machineId,
        planDuration,
        price: priceNum,
      });

      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        // Success
        setLoading(false);
        // Clear fields
        setLabName('');
        setOwnerName('');
        setPhone('');
        setMachineId('');
        setPlanDuration('1 Year');
        setPrice('0');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError('An unexpected error occurred during submission.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, nextFieldId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextElement = document.getElementById(nextFieldId);
      if (nextElement) {
        nextElement.focus();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-zinc-950/90 border-l border-zinc-800/80 backdrop-blur-xl p-5 sm:p-8 flex flex-col justify-between shadow-2xl z-10 animate-slideOver">
        {/* Top border ambient glow */}
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-indigo-500/30 via-violet-500/20 to-transparent" />

        {/* Content Container */}
        <div className="overflow-y-auto pr-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-6 border-b border-zinc-800/60 mb-6">
            <div>
              <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-400" />
                Register New Lab
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Enter details to auto-generate LIS license key
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Lab Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-indigo-400" />
                Laboratory Name
              </label>
              <input
                id="labName"
                type="text"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'ownerName')}
                placeholder="e.g. Apex Diagnostics Lab"
                className="w-full bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-600 transition-all"
                disabled={loading}
              />
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-indigo-400" />
                Lab Director / Owner
              </label>
              <input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'phone')}
                placeholder="e.g. Dr. Sarah Connor"
                className="w-full bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-600 transition-all"
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-indigo-400" />
                Contact Phone
              </label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'machineId')}
                placeholder="e.g. +1 (555) 019-2834"
                className="w-full bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-650 transition-all"
                disabled={loading}
              />
            </div>

            {/* Machine ID */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                Hardware Machine ID
              </label>
              <input
                id="machineId"
                type="text"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'planDuration')}
                placeholder="e.g. LIS-MAC-9872X"
                className="w-full bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-650 transition-all"
                disabled={loading}
              />
            </div>

            {/* Plan Duration */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                License Plan Duration
              </label>
              <select
                id="planDuration"
                value={planDuration}
                onChange={(e) => setPlanDuration(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'price')}
                className="w-full bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm transition-all"
                disabled={loading}
              >
                <option value="1 Month">1 Month</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year (Standard)</option>
                <option value="2 Years">2 Years (Premium)</option>
              </select>
            </div>

            {/* License Price */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <span className="text-indigo-400 font-bold text-xs">₹</span>
                License Price (INR)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="e.g. 15000"
                className="w-full bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 rounded-xl py-2.5 px-3.5 outline-none text-zinc-100 text-sm placeholder-zinc-650 transition-all font-mono"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium animate-fadeIn">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </form>
        </div>

        {/* Footer Buttons */}
        <div className="pt-6 border-t border-zinc-800/60 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer text-sm text-center"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-zinc-50 font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-500/15 transition-all cursor-pointer text-sm text-center flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Generate & Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
