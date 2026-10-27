"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Terminal,
  Power,
  Wifi,
  Globe,
  RotateCcw,
  Hash,
  Clock,
} from "lucide-react";

// ─── Type Definitions ────────────────────────────────────────────────────────

type NodePhase = "OFFLINE" | "BOOTSTRAPPING" | "LOCAL_DISCOVERY" | "GLOBAL_DHT_JOIN";

interface LogEntry {
  timestamp: string;
  message: string;
  level: "info" | "success" | "network" | "warn" | "error";
}

interface NodeIdentity {
  peerId: string;
  port: number;
  bootTimestamp: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PHASES: { key: NodePhase; label: string; icon: React.ReactNode }[] = [
  { key: "OFFLINE", label: "Offline", icon: <Power className="w-3 h-3" /> },
  { key: "BOOTSTRAPPING", label: "Bootstrapping", icon: <Terminal className="w-3 h-3" /> },
  { key: "LOCAL_DISCOVERY", label: "Local Discovery", icon: <Wifi className="w-3 h-3" /> },
  { key: "GLOBAL_DHT_JOIN", label: "DHT Join", icon: <Globe className="w-3 h-3" /> },
];

const PHASE_COLORS: Record<NodePhase, string> = {
  OFFLINE: "text-slate-500 border-slate-700 bg-slate-900",
  BOOTSTRAPPING: "text-amber-400 border-amber-500/50 bg-amber-500/10",
  LOCAL_DISCOVERY: "text-sky-400 border-sky-500/50 bg-sky-500/10",
  GLOBAL_DHT_JOIN: "text-emerald-400 border-emerald-500/50 bg-emerald-500/10",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePeerId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NodeBootstrapTerminal() {
  const [phase, setPhase] = useState<NodePhase>("OFFLINE");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [identity, setIdentity] = useState<NodeIdentity>({
    peerId: generatePeerId(),
    port: 9000,
    bootTimestamp: null,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [uptime, setUptime] = useState<number>(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Uptime counter
  useEffect(() => {
    if (identity.bootTimestamp === null) return;
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - identity.bootTimestamp!) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [identity.bootTimestamp]);

  const addLog = useCallback(
    (message: string, level: LogEntry["level"] = "info") => {
      setLogs((prev) => [...prev, { timestamp: formatTimestamp(), message, level }]);
    },
    []
  );

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const runBootstrap = useCallback(async () => {
    abortRef.current = false;
    setIsRunning(true);
    setLogs([]);
    setUptime(0);

    const newPeerId = generatePeerId();
    setIdentity({ peerId: newPeerId, port: 9000, bootTimestamp: null });

    const peerSlice = `0x${newPeerId.slice(0, 16)}...${newPeerId.slice(-8)}`;
    const step = async (msg: string, lvl: LogEntry["level"], ms: number) => {
      if (abortRef.current) return;
      await delay(ms);
      addLog(msg, lvl);
    };

    // ── Phase 1: OFFLINE → BOOTSTRAPPING ──
    setPhase("OFFLINE");
    addLog("System cold start initiated", "info");
    await step("Seeding CSPRNG from OS entropy pool (/dev/urandom)...", "info", 400);
    await step("Generating Ed25519 keypair from 32-byte seed...", "info", 600);

    setPhase("BOOTSTRAPPING");
    await step(`Local PeerId generated: ${peerSlice}`, "success", 500);
    await step(`Binding UDP socket on 0.0.0.0:${identity.port}...`, "network", 350);
    await step("Socket bound successfully. SO_REUSEADDR enabled.", "success", 300);
    await step("Loading bootstrap node list from embedded config...", "info", 400);
    await step("[3 bootstrap peers loaded]", "info", 200);
    await step("  ├─ /dns4/boot1.p2p.network/tcp/4001", "info", 150);
    await step("  ├─ /dns4/boot2.p2p.network/tcp/4001", "info", 150);
    await step("  └─ /ip4/104.131.131.82/udp/4001/quic-v1", "info", 150);

    // ── Phase 2: BOOTSTRAPPING → LOCAL_DISCOVERY ──
    setPhase("LOCAL_DISCOVERY");
    await step("Starting mDNS responder on 224.0.0.251:5353...", "network", 600);
    await step("Joined multicast group on interface 192.168.1.42", "network", 300);
    await step("Broadcasting PTR query for _p2p._udp.local...", "network", 500);
    await step("mDNS response received: found 3 local peers", "success", 800);
    await step(`Registering TXT record: /p2p/${newPeerId.slice(0, 12)}`, "info", 300);
    await step("Local discovery service ready", "success", 200);

    // ── Phase 3: LOCAL_DISCOVERY → GLOBAL_DHT_JOIN ──
    setPhase("GLOBAL_DHT_JOIN");
    await step("Initiating Kademlia FIND_NODE(self) bootstrap...", "network", 700);
    await step("TCP dial: 104.131.131.82:4001 → connected (28ms)", "network", 500);
    await step("Received 8 closer peers from bootstrap node", "success", 600);
    await step("Iterative lookup round 2: contacted 4 additional peers", "network", 500);
    await step("Routing table populated: 12 peers across 4 k-buckets", "success", 400);
    await step("DHT join complete. Node is ONLINE.", "success", 300);

    setIdentity((prev) => ({ ...prev, bootTimestamp: Date.now() }));
    setIsRunning(false);
  }, [addLog, identity.port]);

  // Auto-start on mount
  useEffect(() => {
    runBootstrap();
    return () => {
      abortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestart = () => {
    abortRef.current = true;
    setTimeout(() => runBootstrap(), 100);
  };

  // Progress calculation
  const phaseIndex = PHASES.findIndex((p) => p.key === phase);
  const progressPercent = phase === "OFFLINE" ? 0 : ((phaseIndex + 1) / PHASES.length) * 100;

  const logColorMap: Record<LogEntry["level"], string> = {
    info: "text-slate-300",
    success: "text-emerald-400",
    network: "text-sky-400",
    warn: "text-amber-400",
    error: "text-rose-400",
  };

  const formatUptime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
          <Terminal className="w-5 h-5" />
          Node Bootstrap Sequence
        </h2>
        <button
          onClick={handleRestart}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm font-medium text-slate-300 hover:border-emerald-500/50 hover:text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <RotateCcw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
          Restart Node
        </button>
      </div>

      {/* Phase Indicator Pills */}
      <div className="flex items-center gap-2 mb-4">
        {PHASES.map((p, idx) => {
          const isCurrent = p.key === phase;
          const isPast = idx < phaseIndex;
          return (
            <React.Fragment key={p.key}>
              {idx > 0 && (
                <div
                  className={`h-px flex-1 max-w-8 transition-all ${
                    isPast || isCurrent ? "bg-emerald-500/50" : "bg-slate-800"
                  }`}
                />
              )}
              <div
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-mono border transition-all ${
                  isCurrent
                    ? PHASE_COLORS[p.key]
                    : isPast
                    ? "text-emerald-400/60 border-emerald-500/20 bg-emerald-500/5"
                    : "text-slate-600 border-slate-800 bg-slate-950"
                }`}
              >
                {p.icon}
                {p.label}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-800 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="bg-slate-950 rounded-lg p-4 h-[320px] overflow-y-auto font-mono text-xs border border-slate-800 custom-scrollbar mb-6"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">Awaiting cold start...</div>
        ) : (
          logs.map((entry, idx) => (
            <div key={idx} className={`${logColorMap[entry.level]} leading-relaxed`}>
              <span className="text-slate-600 mr-2">[{entry.timestamp}]</span>
              {entry.message}
            </div>
          ))
        )}
        {isRunning && (
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-4 bg-emerald-400 animate-pulse" />
          </div>
        )}
      </div>

      {/* Node Identity Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Hash className="w-3 h-3" /> Peer Identity
          </div>
          <div className="font-mono text-xs text-slate-300 break-all">
            0x{identity.peerId.slice(0, 16)}
            <span className="text-slate-600">...</span>
            {identity.peerId.slice(-8)}
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Wifi className="w-3 h-3" /> Listening Endpoint
          </div>
          <div className="font-mono text-sm font-bold text-slate-200">
            0.0.0.0:{identity.port}
          </div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">UDP + TCP + QUIC</div>
        </div>

        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1.5">
            <Clock className="w-3 h-3" /> Uptime
          </div>
          <div className="font-mono text-sm font-bold text-slate-200">
            {identity.bootTimestamp ? formatUptime(uptime) : "--:--"}
          </div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">
            {identity.bootTimestamp
              ? `Since ${new Date(identity.bootTimestamp).toLocaleTimeString()}`
              : "Not started"}
          </div>
        </div>
      </div>
    </div>
  );
}
