"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Network, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/labs/transport");
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(error);
    } else {
      router.replace("/labs/transport");
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-grid">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center mb-4">
              <Network className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Welcome Back</h1>
            <p className="text-slate-400 text-sm mt-1">
              Sign in to continue your learning journey
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-error-500/10 border border-error-500/30 text-error-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? "Signing in..." : "Sign In"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}