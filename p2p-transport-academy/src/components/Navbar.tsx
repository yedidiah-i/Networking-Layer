"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  Network,
  Menu,
  X,
  LogOut,
  BookOpen,
  Activity,
  Radio,
  Route,
  Gauge,
  LogIn,
  UserPlus,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Network },
  { href: "/labs/transport", label: "Transport Lab", icon: Gauge },
  { href: "/labs/bootstrapping", label: "Bootstrapping", icon: Activity },
  { href: "/labs/mdns", label: "mDNS Discovery", icon: Radio },
  { href: "/labs/kademlia", label: "Kademlia DHT", icon: Route },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0b1120]/90 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-100 hidden sm:block">
              P2P Academy
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "text-brand-300 bg-brand-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Auth section */}
          <div className="hidden lg:flex items-center gap-3">
            {!loading && user ? (
              <>
                <span className="text-sm text-slate-400 max-w-[140px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-error-400 hover:bg-error-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-brand-300 hover:bg-brand-500/10 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden pb-4 border-t border-slate-800/60 pt-3 space-y-1 animate-fade-in">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "text-brand-300 bg-brand-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-800/60 space-y-1">
              {!loading && user ? (
                <button
                  onClick={() => {
                    signOut();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-error-400 hover:bg-error-500/10 transition-colors w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out ({user.email})
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-brand-300 hover:bg-brand-500/10 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}