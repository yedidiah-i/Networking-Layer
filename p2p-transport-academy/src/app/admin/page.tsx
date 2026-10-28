import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { Activity, ArrowLeft, BookOpen, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  await connection()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/#account')

  const { data: profile } = await supabase.from('profiles').select('display_name, role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/')

  const { data: events } = await supabase.from('activity_events').select('id, event_type, label, metadata, created_at').order('created_at', { ascending: false }).limit(20)
  const { count: learnerCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'learner')

  return <main className="admin-shell">
    <header className="admin-header"><a className="logo" href="/"><span className="logo-icon"><ShieldCheck /></span><span>Peer<span>Lab</span></span></a><div className="admin-heading"><span className="admin-kicker">ADMIN WORKSPACE</span><h1>What&apos;s happening in PeerLab</h1></div><a className="admin-back" href="/"><ArrowLeft /> Back to lab</a></header>
    <section className="admin-content">
      <div className="admin-intro"><div><span className="eyebrow"><span>LIVE OVERVIEW</span></span><p>Monitor learning activity and see which concepts your community is exploring.</p></div><span className="live-badge"><span /> Live data</span></div>
      <div className="admin-stats"><article><span className="stat-icon"><Users /></span><div><strong>{learnerCount ?? 0}</strong><span>learners</span></div></article><article><span className="stat-icon"><Activity /></span><div><strong>{events?.length ?? 0}</strong><span>recent events</span></div></article><article><span className="stat-icon"><BookOpen /></span><div><strong>4</strong><span>learning paths</span></div></article></div>
      <section className="activity-card"><div className="activity-head"><div><span className="admin-kicker">ACTIVITY FEED</span><h2>Recent learner activity</h2></div><span className="feed-dot">Updating automatically</span></div>{events?.length ? <div className="event-list">{events.map(event => <div className="event-row" key={event.id}><span className="event-mark"><Activity /></span><div><strong>{event.label}</strong><p>{event.event_type} · {new Date(event.created_at).toLocaleString()}</p></div><span className="event-meta">{event.metadata && typeof event.metadata === 'object' ? Object.keys(event.metadata).length + ' details' : 'event'}</span></div>)}</div> : <div className="empty-activity"><Activity /><strong>No activity yet</strong><p>As learners sign in and explore the lab, their events will appear here.</p></div>}</section>
    </section>
  </main>
}
