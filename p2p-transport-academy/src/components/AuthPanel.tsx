'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, ShieldCheck } from 'lucide-react'

export default function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const getRedirectTo = () => process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage('')
    const supabase = createClient()
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: getRedirectTo() } })
    setLoading(false)
    setMessage(result.error ? 'Check your details and try again.' : mode === 'login' ? 'You are signed in.' : 'Check your inbox to confirm your account.')
  }

  async function google() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: getRedirectTo() } })
  }

  return <div className="auth-card">
    <div className="auth-brand"><span className="brand-mark"><ShieldCheck /></span><span>PeerLab account</span></div>
    <h2>{mode === 'login' ? 'Welcome back' : 'Start learning properly'}</h2>
    <p className="auth-muted">Save experiments, track your progress, and return to the concepts that matter.</p>
    <button className="social-button" onClick={google}><span className="google-g">G</span> Continue with Google <ArrowRight /></button>
    <div className="or-divider"><span>or use email</span></div>
    <form onSubmit={submit} className="auth-form">
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required /></label>
      <button className="primary-button" disabled={loading}>{loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight /></button>
    </form>
    {message && <p className="auth-message">{message}</p>}
    <p className="switch-copy">{mode === 'login' ? 'New to PeerLab?' : 'Already have an account?'} <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
  </div>
}
