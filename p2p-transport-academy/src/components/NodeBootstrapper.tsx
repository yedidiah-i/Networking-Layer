"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  CircleDashed,
  Cpu,
  KeyRound,
  Network,
  Power,
  RefreshCw,
  Server,
  Terminal,
} from "lucide-react";

type BootState = "OFFLINE" | "BOOTSTRAPPING" | "LOCAL_DISCOVERY" | "GLOBAL_DHT_JOIN";
type LogLevel = "info" | "ok" | "warn";

interface StageLog {
  text: string;
  level: LogLevel;
  wait: number;
}

interface BootStage {
  state: BootState;
  title: string;
  detail: string;
  icon: LucideIcon;
  logs: StageLog[];
}

interface BootLogEntry {
  id: number;
  time: string;
  text: string;
  level: LogLevel;
}

type Phase = "idle" | "running" | "done";

const STAGES: BootStage[] = [
  {
    state: "OFFLINE",
    title: "Cold Start",
    detail: "Process spawned, sockets sealed, identity keystore unlocked.",
    icon: Power,
    logs: [
      { text: "process::main  p2p-node v0.9.4 launching (pid 40213)", level: "info", wait: 300 },
      { text: "runtime::tokio spawning multi-thread scheduler, worker_threads=8", level: "info", wait: 340 },
      { text: "keystore ed25519 keypair unlocked via argon2id (sealed box verified)", level: "ok", wait: 380 },
      { text: "identity PeerId derived -> 12D3KooWQ8vXn7Yf3sLpT9aRmZ2bHcE6jUwKy4GtSxM1oBdQ5Vn", level: "ok", wait: 320 },
    ],
  },
  {
    state: "BOOTSTRAPPING",
    title: "Transport & Swarm Init",
    detail: "QUIC/WS listeners bound, noise handshake suite armed.",
    icon: Cpu,
    logs: [
      { text: "transport::quic bound /ip4/0.0.0.0/udp/9000/quic-v1", level: "info", wait: 320 },
      { text: "transport::ws   bound /ip4/0.0.0.0/tcp/9001/ws", level: "info", wait: 260 },
      { text: "noise handshake suite: Noise_XX_25519_ChaChaPoly_BLAKE2s", level: "ok", wait: 360 },
      { text: "identify agent p2p-node/0.9.4, 11 advertised protocol ids registered", level: "info", wait: 300 },
      { text: "swarm heartbeat emitter online (interval=5s, jitter=500ms)", level: "info", wait: 280 },
    ],
  },
  {
    state: "LOCAL_DISCOVERY",
    title: "mDNS Multicast Sweep",
    detail: "Querying 224.0.0.251:5353 for Link-Local peer records.",
    icon: Network,
    logs: [
      { text: "mdns joining multicast group 224.0.0.251:5353 on en0 (local 192.168.1.14)", level: "info", wait: 340 },
      { text: "mdns -> QUERY  PTR _p2p._local.local  (TTL 4500s, id 0x8f31)", level: "info", wait: 300 },
      { text: "mdns <- 5 LAN peer records revalidated from cache + fresh RESPONSEs", level: "ok", wait: 420 },
      { text: "swarm dialer queued 5 scoped multiaddrs (/lan/ scope, iface-limit en0)", level: "info", wait: 300 },
    ],
  },
  {
    state: "GLOBAL_DHT_JOIN",
    title: "Kademlia Table Join",
    detail: "Bootstrapping into the global XOR-keyed routing table.",
    icon: Server,
    logs: [
      { text: "kad routing table init: 256 buckets, k=8, alpha=3, D=20", level: "info", wait: 320 },
      { text: "kad bootstrap /dnsaddr/bootstrap.libp2p.io resolved -> 4 relay contacts", level: "info", wait: 360 },
      { text: "kad FIND_NODE(self) converged in 3 hops, merged 8 closest contacts", level: "ok", wait: 400 },
      { text: "kad sybil guard active: admission requires PoW >= 2^16 hash-ops", level: "warn", wait: 320 },
      { text: "DHT JOIN COMPLETE — routing table healthy, 17/256 buckets seeded", level: "ok", wait: 300 },
    ],
  },
];

const LOCAL_PEER_ID = "12D3KooWQ8vXn7Yf3sLpT9aRmZ2bHcE6jUwKy4GtSxM1oBdQ5Vn";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const stamp = (): string =>
  new Date().toLocaleTimeString("en-GB", { hour12: false }) +
  "." +
  String(new Date().getMilliseconds()).padStart(3, "0");

const formatUptime = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
};

export default function NodeBootstrapper() {
  const [stageIndex, setStageIndex] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<BootLogEntry[]>([]);
  const [uptime, setUptime] = useState<number>(0);

  const runIdRef = useRef<number>(0);
  const logIdRef = useRef<number>(0);

  const runBoot = useCallback(async (): Promise<void> => {
    const runId = ++runIdRef.current;
    const alive = (): boolean => runIdRef.current === runId;

    setLogs([]);
    setStageIndex(0);
    setUptime(0);
    setPhase("running");

    const push = (level: LogLevel, text: string): void => {
      if (!alive()) return;
      logIdRef.current += 1;
      const entry: BootLogEntry = { id: logIdRef.current, time: stamp(), text, level };
      setLogs((prev) => [...prev.slice(-60), entry]);
    };

    for (let i = 0; i < STAGES.length; i++) {
      if (!alive()) return;
      setStageIndex(i);
      const stage = STAGES[i];
      push("info", `--- [${stage.state}] ${stage.title} ---`);

      for (const line of stage.logs) {
        await sleep(line.wait);
        if (!alive()) return;
        push(line.level, line.text);
      }
      await sleep(180);
    }

    if (!alive()) return;
    setStageIndex(STAGES.length - 1);
    setPhase("done");
  }, []);

  useEffect(() => {
    const bootTimer = window.setTimeout(() => void runBoot(), 0);
    return () => {
      window.clearTimeout(bootTimer);
      runIdRef.current += 1;
    };
  }, [runBoot]);

  useEffect(() => {
    if (phase === "idle") return;
    const timer = window.setInterval(() => setUptime((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const completedCount = phase === "done" ? STAGES.length : stageIndex;
  const progressPct = Math.round((completedCount / STAGES.length) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
      {/* Lifecycle stepper */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-brand-400">
            <Power className="w-5 h-5" /> Node Lifecycle
          </h2>
          <span
            className={`font-mono text-[10px] font-bold px-2 py-1 rounded border ${
              phase === "done"
                ? "bg-success-500/10 border-success-500/40 text-success-400"
                : phase === "running"
                  ? "bg-warning-500/10 border-warning-500/40 text-warning-400 animate-pulse"
                  : "bg-slate-950/60 border-slate-800 text-slate-500"
            }`}
          >
            {phase === "done" ? "NODE ONLINE" : phase === "running" ? "BOOTING..." : "IDLE"}
          </span>
        </div>

        <ol className="-mx-1">
          {STAGES.map((stage, i) => {
            const isDone = phase === "done" || i < stageIndex;
            const isActive = phase === "running" && i === stageIndex;
            const Icon = stage.icon;
            const status = isDone ? "COMPLETE" : isActive ? "ACTIVE" : "PENDING";

            return (
              <li key={stage.state} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                      isDone
                        ? "bg-brand-500/10 border-brand-500/50 text-brand-400"
                        : isActive
                          ? "bg-accent-500/10 border-accent-500/60 text-accent-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                          : "bg-slate-950/60 border-slate-800 text-slate-600"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isActive ? (
                      <Icon className="w-5 h-5 animate-pulse" />
                    ) : (
                      <CircleDashed className="w-5 h-5" />
                    )}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div
                      className={`w-px flex-1 my-1 transition-colors duration-500 ${
                        isDone ? "bg-brand-500/50" : "bg-slate-800"
                      }`}
                    />
                  )}
                </div>

                <div className="pb-6 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-mono text-sm font-bold tracking-tight ${
                        isDone ? "text-brand-300" : isActive ? "text-accent-300" : "text-slate-600"
                      }`}
                    >
                      [{stage.state}]
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        isDone
                          ? "border-brand-500/30 text-brand-500 bg-brand-500/5"
                          : isActive
                            ? "border-accent-500/30 text-accent-500 bg-accent-500/5"
                            : "border-slate-800 text-slate-600"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 mt-1">{stage.title}</div>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">{stage.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-2">
          <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            <span>Boot Progress</span>
            <span className={progressPct === 100 ? "text-success-400" : "text-accent-400"}>
              {progressPct}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-950/60 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct === 100
                  ? "bg-success-500"
                  : "bg-gradient-to-r from-accent-600 to-accent-400"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => void runBoot()}
          disabled={phase === "running"}
          className="w-full mt-5 py-3 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${phase === "running" ? "animate-spin" : ""}`} />
          Re-Run Boot Sequence
        </button>
      </div>

      {/* Boot terminal */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-accent-400">
            <Terminal className="w-5 h-5" /> Bootstrap Console
          </h2>
          <span className="font-mono text-[10px] text-slate-500 border border-slate-800 bg-slate-950/60 px-2 py-1 rounded">
            stdout - stderr - swarm events
          </span>
        </div>

        <div className="bg-slate-950/60 rounded-lg p-4 flex-1 min-h-[340px] max-h-[340px] overflow-y-auto font-mono text-xs space-y-1.5 border border-slate-800 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">
              [OFFLINE] awaiting operator start signal...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3 leading-relaxed">
                <span className="text-slate-700 shrink-0 select-none">{log.time}</span>
                <span
                  className={
                    log.level === "ok"
                      ? "text-success-400"
                      : log.level === "warn"
                        ? "text-warning-400"
                        : "text-slate-400"
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
          {phase === "running" && (
            <div className="text-brand-500 animate-pulse">|</div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Server className="w-3 h-3" /> Uptime
            </div>
            <div className="text-lg font-mono font-bold text-slate-200 mt-1">
              {formatUptime(uptime)}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 min-w-0">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <KeyRound className="w-3 h-3" /> PeerId
            </div>
            <div
              className="text-xs font-mono font-bold text-brand-400 mt-1.5 truncate"
              title={LOCAL_PEER_ID}
            >
              {LOCAL_PEER_ID.slice(0, 10)}...{LOCAL_PEER_ID.slice(-6)}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Keypair
            </div>
            <div className="text-sm font-mono font-bold text-slate-200 mt-1">ed25519</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
              <Network className="w-3 h-3" /> Listeners
            </div>
            <div className="text-sm font-mono font-bold text-slate-200 mt-1">
              {phase === "done" ? "quic-v1 / ws" : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}