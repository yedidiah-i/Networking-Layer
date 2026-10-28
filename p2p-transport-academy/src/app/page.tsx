// src/app/page.tsx

import TransportSimulator from '@/components/TransportSimulator';
import NodeBootstrapper from '@/components/NodeBootstrapper';
import MdnsDiscovery from '@/components/MdnsDiscovery';
import KademliaDhtVisualizer from '@/components/KademliaDhtVisualizer';
import { ShieldAlert, Terminal } from 'lucide-react';

function ModuleHeader({
  index,
  kicker,
  title,
  description,
}: {
  index: string;
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-mono font-semibold tracking-wide">
          {index} · {kicker}
        </span>
      </div>
      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-100">{title}</h2>
      <p className="text-slate-400 mt-2 text-sm max-w-3xl leading-relaxed">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Engineering Header section */}
        <header className="border-b border-slate-800 pb-8 mb-12">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-mono font-semibold tracking-wide">
              Layer 4 Architecture
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-300 to-slate-500 bg-clip-text text-transparent">
            P2P Networking & Transport Academy
          </h1>
          <p className="text-slate-400 mt-3 text-base max-w-3xl leading-relaxed">
            An advanced interactive testing bench designed for blockchain engineers to explore high-performance transport structures, security-centric hole punching routines, and zero-allocation socket streams.
          </p>
        </header>

        {/* Section 1: Core Dashboard Element */}
        <section className="mb-16">
          <TransportSimulator />
        </section>

        {/* Section 2: Node Bootstrapping Lifecycle */}
        <section className="mb-16 border-t border-slate-800 pt-12">
          <ModuleHeader
            index="Core Module 01"
            kicker="Bootstrapping"
            title="Local Node Lifecycle Terminal"
            description="Trace a node from a cold process spawn through runtime/identity initialization, link-local discovery, and finally into the global Kademlia routing table — one observable state transition at a time."
          />
          <NodeBootstrapper />
        </section>

        {/* Section 3: mDNS Local Discovery */}
        <section className="mb-16 border-t border-slate-800 pt-12">
          <ModuleHeader
            index="Core Module 02"
            kicker="Discovery"
            title="mDNS Multicast Discovery Sweep"
            description="Watch the node broadcast a PTR query onto 224.0.0.251:5353, capture link-local RESPONSE packets in real time, and resolve each host's PeerId hex slice, LAN address, and advertised service records."
          />
          <MdnsDiscovery />
        </section>

        {/* Section 4: Kademlia DHT Distance Visualizer */}
        <section className="mb-16 border-t border-slate-800 pt-12">
          <ModuleHeader
            index="Core Module 03"
            kicker="Routing"
            title="Kademlia XOR Distance Visualizer"
            description="Enter any 256-bit target key to compute the local_id ⊕ target_id metric, highlight the closest k-nodes, inspect individual XOR buckets, and monitor routing-table health, live pings, and PoW Sybil-resistance."
          />
          <KademliaDhtVisualizer />
        </section>

        {/* Section 5: Architectural Deep-Dive Guides */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-800 pt-12">
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200 mb-3">
              <Terminal className="w-5 h-5 text-emerald-400" /> Rust Code Reference Framework
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Our backend transport stack abstracts multiplexed routing variants natively. This matches our strict guidelines for 
              <strong> Speed</strong>, <strong>Security</strong>, <strong>Safety</strong>, and <strong>Simplicity</strong>.
            </p>
            <pre className="bg-slate-950 text-slate-400 p-4 rounded-lg text-xs font-mono border border-slate-800/80 overflow-x-auto">
{`pub enum RawWireStream {
    Tcp(TcpStream),
    Quic { send: SendStream, recv: RecvStream },
    WebSocket { stream: WebSocketStream<...>, buffer: Vec<u8> }
}`}</pre>
          </div>

          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-200 mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-400" /> Security Safeguard Metrics
            </h3>
            <ul className="text-sm text-slate-400 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <div><strong>Transaction Binding Matches:</strong> Every STUN packet validation maps high-entropy 12-byte IDs to eliminate data injection risks entirely.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <div><strong>Handshake Enforcements:</strong> Direct UDP connections require mutual cryptographic validation checks before session tracking cache updates execute.</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <div><strong>Sybil Admission Gate:</strong> DHT contact insertion demands a 2<sup>16</sup> leading-zero-bit identity proof, throttling mass key generation.</div>
              </li>
            </ul>
          </div>
        </section>

      </div>
    </main>
  );
}
