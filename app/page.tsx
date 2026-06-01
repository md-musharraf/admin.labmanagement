'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from './actions';
import { Lock, Activity, ShieldAlert, ArrowRight, ServerCrash } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your administrator password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await login(password);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else {
        // Redirect will happen, middleware will allow access
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected connection error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Dynamic Background Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-[150px] pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" 
        style={{ maskImage: 'radial-gradient(ellipse at center, black, transparent)' }}
      />

      <div className="w-full max-w-md p-6 z-10">
        {/* Brand/Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/5 mb-4 animate-pulse">
            <Activity className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400">
            Pathology LIS
          </h1>
          <p className="text-sm text-zinc-400 mt-2 font-medium">
            Secure License Administrator Gateway
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="backdrop-blur-xl bg-zinc-900/60 border border-zinc-800/80 rounded-3xl p-8 shadow-2xl shadow-black/80 relative overflow-hidden">
          {/* Card Border Glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-400" />
            Authenticate Session
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="password" 
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
              >
                Master Admin Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret key..."
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40 rounded-xl py-3 pl-4 pr-10 outline-none text-zinc-100 placeholder-zinc-600 transition-all text-sm"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-600" />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium animate-fadeIn">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-500/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer text-sm"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Establish Connection
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-8 text-xs text-zinc-600 flex items-center justify-center gap-1.5 font-medium">
          <ServerCrash className="h-3.5 w-3.5" />
          AES-256-CBC Encrypted License Key Protocol
        </div>
      </div>
    </div>
  );
}
