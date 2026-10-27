"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Radio, Wifi, Search, CircleDot, Signal } from "lucide-react";

// ─── Type Definitions ────────────────────────────────────────────────────────

type ScanStatus =
  | "idle"
  | "broadcasting"
  | "processing"
  | "complete";

interface ServiceRecord {
  proto: string;
  version: string;
  chain: string;
}

interface DiscoveredPeer {
  peerId: string;
  localIp: string;
  port: number;
  serviceRecord: ServiceRecord;
  latencyMs: number;
  visible: boolean;
}

// ─── Mock Data Generation ────────────────────────────────────────────────────

function generateHexId(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateMockPeers(): DiscoveredPeer[] {
  const protos = ["quic-v1", "tcp", "ws", "quic-v1", "tcp"];
  const versions = ["0.3.1", "0.4.0", "0.2.8", "0.3.1", "0.4.2"];
  const chains = ["ethereum", "ethereum", "polygon", "ethereum", "solana"];
  const baseIp = 10 + Math.floor(Math.random() * 5);

  return Array.from({ length: 5 }, (_, i) => ({
    peerId: generateHexId(32),
    localIp: `192.168.1.${baseIp + i * 7}`,
    port: 9000 + i,
    serviceRecord: {
      proto: protos[i],
      version: versions[i],
      chain: chains[i],
    },
    latencyMs: Math.floor(Math.random() * 14) + 1,
    visible: false,
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MdnsDiscoveryPanel() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [peers, setPeers] = useState<DiscoveredPeer[]>([]);
  const [localPeerId] = useState(() => generateHexId(32));
  const [scanCount, setScanCount] = useState(0);
  const abortRef = useRef(false);

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const runScan = useCallback(async () => {
    abortRef.current = false;

    // Reset
    setPeers([]);
    setStatus("broadcasting");
    setScanCount((c) => c + 1);

    // Broadcasting phase
    await delay(1500);
    if (abortRef.current) return;

    // Processing phase
    setStatus("processing");
    const newPeers = generateMockPeers();

    // Reveal peers one by one
    for (let i = 0; i < newPeers.length; i++) {
      if (abortRef.current) return;
      await delay(300);
      setPeers((prev) => {
        const updated = [...prev];
        const peer = { ...newPeers[i], visible: true };
        updated.push(peer);
        return updated;
      });
    }

    if (abortRef.current) return;
    await delay(400);
    setStatus("complete");
  }, []);

  // Auto-scan on mount
  useEffect(() => {
    runScan();
    return () => {
      abortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusText: Record<ScanStatus, string> = {
    idle: "Idle",
    broadcasting: "Broadcasting PTR query...",
    processing: "Processing responses...",
    complete: `Discovery complete · ${peers.length} peers found`,
  };

  const statusColor: Record<ScanStatus, string> = {
    idle: "text-slate-500",
    broadcasting: "text-amber-400",
    processing: "text-sky-400",
    complete: "text-emerald-400",
  };

  const peerIdDisplay = (id: string) =>
    `${id.slice(0, 8)}…${id.slice(-4)}`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold flex items-center gap-2 text-sky-400">
          <Radio className="w-5 h-5" />
          mDNS Local Peer Discovery
        </h2>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${statusColor[status]} flex items-center gap-1.5`}>
            {(status === "broadcasting" || status === "processing") && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
              </span>
            )}
            {status === "complete" && <CircleDot className="w-3 h-3" />}
            {statusText[status]}
          </span>
        </div>
      </div>
      <p className="text-xs font-mono text-slate-500 mb-6">
        224.0.0.251:5353 · _p2p._udp.local
      </p>

      {/* Network Visualization */}
      <div className="relative bg-slate-950 rounded-lg border border-slate-800 h-[220px] mb-6 flex items-center justify-center overflow-hidden">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Pulse rings (active during scan) */}
        {(status === "broadcasting" || status === "processing") && (
          <>
            {[0, 1, 2].map((ring) => (
              <div
                key={ring}
                className="absolute rounded-full border border-sky-400/20"
                style={{
                  width: "100px",
                  height: "100px",
                  animation: `mdnsPulse 2s ease-out ${ring * 0.6}s infinite`,
                }}
              />
            ))}
          </>
        )}

        {/* Local Node (center) */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
            <Signal className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="mt-2 text-[10px] font-mono text-emerald-400 font-semibold">LOCAL NODE</div>
          <div className="text-[9px] font-mono text-slate-500">
            {peerIdDisplay(localPeerId)}
          </div>
        </div>

        {/* Discovered peer dots around center */}
        {peers.map((peer, idx) => {
          const angle = (idx / 5) * 2 * Math.PI - Math.PI / 2;
          const radius = 85;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={peer.peerId}
              className="absolute z-10 flex flex-col items-center transition-all duration-500"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                opacity: peer.visible ? 1 : 0,
                transitionDelay: `${idx * 100}ms`,
              }}
            >
              <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/60 flex items-center justify-center">
                <Wifi className="w-3 h-3 text-sky-400" />
              </div>
              <div className="text-[8px] font-mono text-sky-400 mt-1 whitespace-nowrap">
                {peer.localIp}
              </div>
            </div>
          );
        })}

        {/* CSS animation for pulse rings */}
        <style>{`
          @keyframes mdnsPulse {
            0% {
              transform: scale(1);
              opacity: 0.6;
            }
            100% {
              transform: scale(4);
              opacity: 0;
            }
          }
        `}</style>
      </div>

      {/* Scan Button */}
      <button
        onClick={() => {
          abortRef.current = true;
          setTimeout(() => runScan(), 50);
        }}
        disabled={status === "broadcasting" || status === "processing"}
        className="w-full mb-6 py-2.5 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 hover:border-sky-500/50 disabled:opacity-40 disabled:cursor-not-allowed text-sky-400 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <Search className={`w-4 h-4 ${status === "broadcasting" || status === "processing" ? "animate-pulse" : ""}`} />
        Scan Network
      </button>

      {/* Discovered Peers Table */}
      {peers.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 text-left uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">PeerId</th>
                <th className="pb-2 pr-3">Local IP</th>
                <th className="pb-2 pr-3">Service Record</th>
                <th className="pb-2 text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {peers.map((peer) => (
                <tr
                  key={peer.peerId}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-2.5 pr-3">
                    <span className="flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-slate-300">
                    {peerIdDisplay(peer.peerId)}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-slate-400">
                    {peer.localIp}:{peer.port}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(peer.serviceRecord).map(([key, val]) => (
                        <span
                          key={key}
                          className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-mono"
                        >
                          {key}=<span className="text-slate-300">{val}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-mono text-emerald-400">
                    {peer.latencyMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Protocol Detail Footer */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-600 border-t border-slate-800 pt-4">
        <span>Query Type: <span className="text-slate-400">PTR</span></span>
        <span className="text-slate-800">|</span>
        <span>Record: <span className="text-slate-400">_p2p._udp.local</span></span>
        <span className="text-slate-800">|</span>
        <span>TTL: <span className="text-slate-400">120s</span></span>
        <span className="text-slate-800">|</span>
        <span>Multicast: <span className="text-emerald-400">ON</span></span>
        <span className="text-slate-800">|</span>
        <span>Scans: <span className="text-slate-400">{scanCount}</span></span>
      </div>
    </div>
  );
}
