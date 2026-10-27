"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Radio, Globe, RefreshCw, Cpu, Activity } from 'lucide-react';

type Protocol = 'TCP' | 'QUIC' | 'WebSocket';
type NatType = 'FullCone' | 'Symmetric';

export default function TransportSimulator() {
  const [protocol, setProtocol] = useState<Protocol>('QUIC');
  const [natType, setNatType] = useState<NatType>('FullCone');
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [publicIp, setPublicIp] = useState<string>('Not Discovered');
  const [metrics, setMetrics] = useState({ latency: 0, overhead: 0, speed: 0 });

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const runStunAndPunch = async () => {
    setIsSimulating(true);
    setLogs([]);
    addLog("Initializing local UdpSocket on port 45001...");
    
    // Simulate STUN Address Discovery
    await new Promise((r) => setTimeout(r, 600));
    const mockTransactionId = Math.random().toString(16).substring(2, 14).toUpperCase();
    addLog(`Sending raw 20-byte STUN Binding Request Header (TxID: ${mockTransactionId}) to ://google.com`);
    
    await new Promise((r) => setTimeout(r, 400));
    const mockExternalIp = "198.51.100.42";
    const mockExternalPort = "54321";
    setPublicIp(`${mockExternalIp}:${mockExternalPort}`);
    addLog(`STUN XOR-MAPPED-ADDRESS attribute found. Decrypted External Endpoint -> ${mockExternalIp}:${mockExternalPort}`);

    // Simulate Hole Punching Based on Topology selection
    await new Promise((r) => setTimeout(r, 500));
    addLog(`Starting firewall boundary probing to target node...`);
    
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 200));
      addLog(`Blasting outbound synchronization token PUNCH_OPEN #${i}`);
    }

    await new Promise((r) => setTimeout(r, 400));
    if (natType === 'Symmetric') {
      addLog("❌ Security Exception: Target node uses Strict Symmetric NAT. Hole punch failed.");
      addLog("⚠️ Security Strategy: Shifting session traffic pathways over to backup TURN relay.");
      setMetrics({ latency: 145, overhead: 32, speed: 45 });
    } else {
      addLog("⚡ Success: Dynamic NAT translation table hole verified by remote handshake confirmation!");
      addLog(`🚀 Upgrading raw unblocked stream socket directly into your validated ${protocol} stream pipeline.`);
      setMetrics({
        latency: protocol === 'QUIC' ? 18 : protocol === 'TCP' ? 42 : 55,
        overhead: protocol === 'QUIC' ? 4 : protocol === 'TCP' ? 24 : 16,
        speed: protocol === 'QUIC' ? 120 : protocol === 'TCP' ? 85 : 90
      });
    }
    setIsSimulating(false);
  };

  useEffect(() => {
    runStunAndPunch();
  }, [protocol, natType]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Configuration Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-emerald-400">
          <Cpu className="w-5 h-5" /> Topology Configuration
        </h2>

        {/* Protocol Selector */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-slate-400 block mb-2">Transport Layer Protocol</label>
          <div className="grid grid-cols-3 gap-2">
            {(['TCP', 'QUIC', 'WebSocket'] as Protocol[]).map((p) => (
              <button
                key={p}
                onClick={() => setProtocol(p)}
                className={`py-2 px-3 rounded-lg font-medium text-xs border transition-all ${
                  protocol === p
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Firewall Selector */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-slate-400 block mb-2">Residential Firewall Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setNatType('FullCone')}
              className={`p-3 rounded-lg text-left border transition-all ${
                natType === 'FullCone'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm">Full-Cone NAT</div>
              <div className="text-[10px] text-slate-500 mt-1">Easy P2P punch-through path</div>
            </button>
            <button
              onClick={() => setNatType('Symmetric')}
              className={`p-3 rounded-lg text-left border transition-all ${
                natType === 'Symmetric'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-sm">Symmetric NAT</div>
              <div className="text-[10px] text-slate-500 mt-1">Requires TURN server fallback</div>
            </button>
          </div>
        </div>

        {/* Public Discovery Node */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">STUN Discovered Address</div>
          <div className="font-mono text-sm font-bold text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400 animate-pulse" /> {publicIp}
          </div>
        </div>

        <button
          onClick={runStunAndPunch}
          disabled={isSimulating}
          className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} /> Force Re-Negotiate Session
        </button>
      </div>

      {/* Real-time Diagnostics Logs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl lg:col-span-2 flex flex-col h-[420px]">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-sky-400">
          <Activity className="w-5 h-5" /> Wire-Protocol Diagnostic Console
        </h2>
        <div className="bg-slate-950 rounded-lg p-4 flex-1 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 border border-slate-800 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">Awaiting session context start...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={log.includes('❌') || log.includes('⚠️') ? 'text-rose-400' : log.includes('⚡') || log.includes('🚀') ? 'text-emerald-400' : 'text-slate-300'}>
                {log}
              </div>
            ))
          )}
        </div>

        {/* Lower Real-time Dashboard Performance Bar */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Latency Path</div>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">{metrics.latency} ms</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Header Overhead</div>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">{metrics.overhead} bytes</div>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Throughput Speed</div>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">{metrics.speed} mbps</div>
          </div>
        </div>
      </div>
    </div>
  );
}
