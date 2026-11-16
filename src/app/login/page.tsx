'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Loader2, Lock, Mail, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useAdminAuth } from '../../shared/auth/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');
  const { setAuth } = useAdminAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuth(data.accessToken, data.user);
      router.push(nextUrl || '/');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#faf6ef] p-4 sm:p-6 text-zinc-900">
      <div className="w-full max-w-[420px] bg-white border border-zinc-200/90 rounded-2xl p-8 sm:p-10 shadow-sm flex flex-col gap-6">
        {/* Centralized Header Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <img
            src="/images/brand/chormokar-logo-email.png"
            alt="Chormokar - The Leather Artisan"
            width={560}
            height={140}
            className="h-24 w-auto object-contain mb-6"
          />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Admin Control Center</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Sign in with your administrator credentials
            </p>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="bg-red-50/80 border border-red-200/80 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form suppressHydrationWarning onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chormokar@outlook.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#8a5a2b] transition-all placeholder:text-zinc-400 font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:border-[#8a5a2b] transition-all placeholder:text-zinc-400 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#8a5a2b] hover:bg-[#6b421c] text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 mt-2 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-zinc-300" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Dashboard</span>
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="border-t border-zinc-100 pt-4 flex flex-col items-center gap-2 text-center text-xs text-zinc-500">
          <p>Restricted to authorized staff and superusers.</p>
          <a
            href="https://chormokar.com"
            className="inline-flex items-center gap-1 font-medium text-[#8a5a2b] hover:text-[#6b421c] hover:underline"
          >
            Storefront Home
            <ArrowUpRight size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  useEffect(() => {
    // The login screen always renders in light mode.
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#faf6ef]">
          <Loader2 size={32} className="animate-spin text-zinc-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
