"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock,
  Layers,
  Radio,
  ScanSearch,
  Send,
  Timer,
  Trash2,
  Wifi,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Simulated Link-Local network space (RFC 6762 mDNS)                  */
/* ------------------------------------------------------------------ */

interface ServiceRecord {
  /** e.g. "_p2p-discovery._udp.local" */
  name: string;
  port: number;
  /** TXT attribute bag advertised alongside the SRV record */
  attrs: string[];
}

interface LanHost {
  /** full 256-bit identity, rendered as a hex slice in the UI */
  id: string;
  ip: string;
  mac: string;
  rtt: number;
  ttl: number;
  alias: string;
  services: ServiceRecord[];
}

const MULTICAST_GROUP = "224.0.0.251";
const MULTICAST_PORT = 5353;
const SERVICE_TYPE = "_p2p._local.local";

const LOCAL_HOST: LanHost = {
  id: "2b8f41d0c7a95e33f6b1027ade94c5810f3e77a2d4b6c8e01935a7f2c4d6e8b0",
  ip: "192.168.1.14",
  mac: "a4:83:e7:11:9c:02",
  rtt: 0,
  ttl: 4500,
  alias: "self",
  services: [
    { name: "_p2p-quic._udp.local", port: 9000, attrs: ["v=1", "proto=quic-v1", "tls=noise"] },
  ],
};

const REMOTE_HOSTS: LanHost[] = [
  {
    id: "9ac3e517b0d8f246a1c9e7304d5b6f8210e9c4a7f3b5d2e80614a9c7f1b3d5e7",
    ip: "192.168.1.23",
    mac: "b8:27:eb:44:1d:af",
    rtt: 1.2,
    ttl: 4500,
    alias: "gateway-relay",
    services: [
      { name: "_p2p-discovery._udp.local", port: 9000, attrs: ["v=1", "proto=quic-v1"] },
      { name: "_libp2p._tcp.local", port: 9001, attrs: ["vsn=1.0.0", "dns=relay.lan"] },
    ],
  },
  {
    id: "4e17a9c2f5b80d36e17a4c9b2f5d80e36a17c4b9f5e2d8036a17c4b9f5e2d803",
    ip: "192.168.1.47",
    mac: "dc:a6:32:9f:04:7e",
    rtt: 0.8,
    ttl: 4500,
    alias: "validator-01",
    services: [
      { name: "_p2p-quic._udp.local", port: 9000, attrs: ["v=1", "proto=quic-v1", "role=validator"] },
      { name: "_prometheus._tcp.local", port: 9100, attrs: ["path=/metrics"] },
    ],
  },
  {
    id: "c702f4a91d5b6e38a0c7f4b21d9e5a60c7f4b21d9e5a6038c7f4b21d9e5a6038",
    ip: "192.168.1.88",
    mac: "e4:5f:01:2c:88:31",
    rtt: 2.4,
    ttl: 4500,
    alias: "archive-node",
    services: [
      { name: "_p2p-tcp._tcp.local", port: 30303, attrs: ["v=1", "proto=rlpx", "caps=eth/68"] },
    ],
  },
  {
    id: "1f6b3d08e4a7c925b0f6d3a81e4c7925b0f6d3a81e4c7925b0f6d3a81e4c7925",
    ip: "192.168.1.101",
    mac: "00:1b:44:11:3a:b7",
    rtt: 3.1,
    ttl: 4500,
    alias: "light-client",
    services: [
      { name: "_p2p-quic._udp.local", port: 9000, attrs: ["v=1", "proto=quic-v1", "role=light"] },
    ],
  },
  {
    id: "d94c5e7a2b0f1368c9d4e7a2b0f1368c9d4e7a2b0f1368c9d4e7a2b0f1368c9d",
    ip: "192.168.1.156",
    mac: "3c:22:fb:0d:6e:44",
    rtt: 1.7,
    ttl: 4500,
    alias: "bootstrap-lan",
    services: [
      { name: "_p2p-discovery._udp.local", port: 9000, attrs: ["v=1", "proto=quic-v1", "bootstrap=1"] },
      { name: "_dnsaddr._udp.local", port: 53, attrs: ["txt=/dnsaddr/lan.local"] },
    ],
  },
  {
    id: "6a0f2c8d5e1b7943a6f0c2d85e1b7943a6f0c2d85e1b7943a6f0c2d85e1b7943",
    ip: "192.168.1.203",
    mac: "f0:9f:c2:31:77:0d",
    rtt: 4.6,
    ttl: 4500,
    alias: "test-harness",
    services: [
      { name: "_p2p-quic._udp.local", port: 9000, attrs: ["v=1", "proto=quic-v1", "net=dev"] },
    ],
  },
];

type PacketKind = "tx" | "rx" | "sys";

interface MdnsLogEntry {
  id: number;
  time: string;
  kind: PacketKind;
  text: string;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const clock = (): string =>
  new Date().toLocaleTimeString("en-GB", { hour12: false }) +
  "." +
  String(new Date().getMilliseconds()).padStart(3, "0");

const hexSlice = (hex: string): string => `${hex.slice(0, 8)}…${hex.slice(-6)}`;

const KIND_STYLE: Record<PacketKind, string> = {
  tx: "text-sky-400",
  rx: "text-emerald-400",
  sys: "text-slate-500",
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MdnsDiscovery() {
  const [scanning, setScanning] = useState<boolean>(false);
  const [discovered, setDiscovered] = useState<LanHost[]>([]);
  const [logs, setLogs] = useState<MdnsLogEntry[]>([]);
  const [queries, setQueries] = useState<number>(0);
  const [uptimeSec, setUptimeSec] = useState<number>(4500);

  const runIdRef = useRef<number>(0);
  const logIdRef = useRef<number>(0);

  const runQuery = useCallback(async (): Promise<void> => {
    const runId = ++runIdRef.current;
    const alive = (): boolean => runIdRef.current === runId;

    setScanning(true);
    setDiscovered([]);
    setLogs([]);
    setQueries(0);

    let sent = 0;

    const push = (kind: PacketKind, text: string): void => {
      if (!alive()) return;
      logIdRef.current += 1;
      const entry: MdnsLogEntry = { id: logIdRef.current, time: clock(), kind, text };
      setLogs((prev) => [...prev.slice(-40), entry]);
    };

    push(
      "sys",
      `joining multicast ${MULTICAST_GROUP}:${MULTICAST_PORT} (iface en0, IP_MULTICAST_TTL=255)`,
    );
    await sleep(280);
    push(
      "tx",
      `→ QUERY   ${MULTICAST_GROUP}:${MULTICAST_PORT}  PTR ${SERVICE_TYPE}  (questions=1, id=0x8f31)`,
    );
    sent += 1;
    setQueries((q) => q + 1);
    await sleep(320);
    push(
      "tx",
      `→ QUERY   ${MULTICAST_GROUP}:${MULTICAST_PORT}  ANY ${SERVICE_TYPE}  (retransmit #1, known-answer suppression on)`,
    );
    sent += 1;
    setQueries((q) => q + 1);

    for (const host of REMOTE_HOSTS) {
      await sleep(240 + host.rtt * 60);
      if (!alive()) return;
      setDiscovered((prev) => [...prev, host]);
      push(
        "rx",
        `← RESPONSE ${host.ip}:${MULTICAST_PORT}  A ${host.ip} / SRV ${host.services[0].name} :${host.services[0].port}  rtt=${host.rtt.toFixed(1)}ms`,
      );
    }

    await sleep(260);
    if (!alive()) return;
    push(
      "sys",
      `cache settled: ${REMOTE_HOSTS.length} peer records, TTL 4500s, GC scheduled (${sent + REMOTE_HOSTS.length} packets captured)`,
    );
    setScanning(false);
  }, []);

  const flushCache = useCallback((): void => {
    runIdRef.current += 1; // abort any in-flight sweep
    setScanning(false);
    setDiscovered([]);
    setLogs([]);
    setQueries(0);
    setUptimeSec(4500);
  }, []);

  /* Auto-discover on mount (deferred one tick so state updates stay out of
     the synchronous effect body). */
  useEffect(() => {
    const sweepTimer = window.setTimeout(() => void runQuery(), 0);
    return () => {
      window.clearTimeout(sweepTimer);
      runIdRef.current += 1;
    };
  }, [runQuery]);

  /* Cache TTL countdown. */
  useEffect(() => {
    const timer = window.setInterval(() => setUptimeSec((v) => (v <= 0 ? 4500 : v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const isFound = (id: string): boolean => discovered.some((host) => host.id === id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* ---------------- Network space ---------------- */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
            <Radio className="w-5 h-5" /> mDNS Local Network Space
          </h2>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="bg-sky-500/10 border border-sky-500/30 text-sky-400 px-2 py-1 rounded-full font-semibold">
              {MULTICAST_GROUP}:{MULTICAST_PORT}
            </span>
            <span className="bg-slate-950 border border-slate-800 text-slate-500 px-2 py-1 rounded-full">
              {SERVICE_TYPE}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Local node with broadcast rings */}
          <div className="relative overflow-hidden rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
            {scanning && (
              <>
                <span className="pointer-events-none absolute inset-0 m-auto w-24 h-24 rounded-full border border-emerald-400/60 animate-ping" />
                <span
                  className="pointer-events-none absolute inset-0 m-auto w-24 h-24 rounded-full border border-emerald-400/40 animate-ping [animation-delay:400ms]"
                />
                <span
                  className="pointer-events-none absolute inset-0 m-auto w-24 h-24 rounded-full border border-emerald-400/20 animate-ping [animation-delay:800ms]"
                />
              </>
            )}
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-300">{LOCAL_HOST.ip}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                  SELF
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">{LOCAL_HOST.mac}</div>
              <div
                className="text-[10px] text-slate-400 font-mono mt-2 truncate"
                title={LOCAL_HOST.id}
              >
                {hexSlice(LOCAL_HOST.id)}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {LOCAL_HOST.services.map((svc) => (
                  <span
                    key={svc.name}
                    className="text-[9px] font-mono bg-slate-950 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded"
                  >
                    {svc.name.split("._")[0]}:{svc.port}
                  </span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-500/20 text-[10px] font-mono text-emerald-500/80">
                {scanning ? "broadcasting query…" : "multicast socket idle"}
              </div>
            </div>
          </div>

          {/* Remote LAN hosts */}
          {REMOTE_HOSTS.map((host) => {
            const found = isFound(host.id);
            return (
              <div
                key={host.id}
                className={`rounded-lg border p-4 transition-all duration-500 ${
                  found
                    ? "border-emerald-500/40 bg-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
                    : "border-slate-800 bg-slate-950/60 opacity-45"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold ${found ? "text-slate-200" : "text-slate-500"}`}
                  >
                    {host.ip}
                  </span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      found
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-800 text-slate-600"
                    }`}
                  >
                    {found ? "RESPONDED" : "SILENT"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono mt-1">
                  {host.alias} · {host.mac}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-2 truncate" title={host.id}>
                  {hexSlice(host.id)}
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {host.services.map((svc) => (
                    <span
                      key={svc.name}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        found
                          ? "border-slate-800 bg-slate-900 text-slate-400"
                          : "border-slate-900 text-slate-700"
                      }`}
                    >
                      {svc.name.split("._")[0]}:{svc.port}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mt-6">
          <button
            onClick={() => void runQuery()}
            disabled={scanning}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-sm rounded-lg transition-all flex items-center gap-2"
          >
            <Send className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
            {scanning ? "Sweeping…" : "Broadcast mDNS Query"}
          </button>
          <button
            onClick={flushCache}
            disabled={scanning}
            className="py-2.5 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 font-bold text-sm rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Flush Cache
          </button>
          <div className="ml-auto flex items-center gap-4 font-mono text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Send className="w-3 h-3 text-sky-400" /> {queries} queries
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-400" /> {discovered.length}/{REMOTE_HOSTS.length}{" "}
              responses
            </span>
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3 text-amber-400" /> TTL {uptimeSec}s
            </span>
          </div>
        </div>
      </div>

      {/* ---------------- Packet console + listings ---------------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col">
        <h2 className="text-xl font-bold flex items-center gap-2 text-sky-400 mb-4">
          <ScanSearch className="w-5 h-5" /> Multicast Packet Trace
        </h2>

        <div className="bg-slate-950 rounded-lg p-3 font-mono text-[11px] space-y-1.5 border border-slate-800 h-[220px] overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">no traffic captured…</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2 leading-relaxed">
                <span className="text-slate-700 shrink-0">{log.time}</span>
                <span className={KIND_STYLE[log.kind]}>{log.text}</span>
              </div>
            ))
          )}
        </div>

        {/* Discovered peer listings */}
        <div className="flex items-center gap-2 mt-5 mb-3">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" /> Discovered Local Peers
          </h3>
          <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded-full">
            {discovered.length}
          </span>
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[240px] custom-scrollbar pr-1">
          {discovered.length === 0 ? (
            <div className="text-xs text-slate-600 italic font-mono border border-dashed border-slate-800 rounded-lg p-4 text-center">
              cache empty — waiting for RESPONSE packets
            </div>
          ) : (
            discovered.map((host) => (
              <div
                key={host.id}
                className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-lg p-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-200" title={host.id}>
                    {hexSlice(host.id)}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">{host.ip}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {host.services.map((svc) => (
                    <span
                      key={svc.name}
                      className="text-[9px] font-mono bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded"
                      title={svc.attrs.join(" · ")}
                    >
                      {svc.name} :{svc.port}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> TTL {host.ttl}s
                  </span>
                  <span>{host.rtt.toFixed(1)} ms RTT</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-2">
            <div className="text-[9px] text-slate-500 font-bold uppercase">Group</div>
            <div className="text-[11px] font-mono font-bold text-slate-300 mt-0.5">IPv4 mcast</div>
          </div>
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-2">
            <div className="text-[9px] text-slate-500 font-bold uppercase">Scope</div>
            <div className="text-[11px] font-mono font-bold text-slate-300 mt-0.5">Link-Local</div>
          </div>
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-2">
            <div className="text-[9px] text-slate-500 font-bold uppercase">Records</div>
            <div className="text-[11px] font-mono font-bold text-slate-300 mt-0.5">
              {discovered.reduce((n, h) => n + h.services.length, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
