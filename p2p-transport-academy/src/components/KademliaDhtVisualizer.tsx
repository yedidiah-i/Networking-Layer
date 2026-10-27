"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Binary,
  Crosshair,
  Gauge,
  Hash,
  Pickaxe,
  RefreshCw,
  Route,
  Search,
  Shuffle,
  Target,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* 256-bit key math (educational model of libp2p/Kademlia)             */
/* ------------------------------------------------------------------ */

const KEY_BITS = 256;
const K = 8; // bucket replication factor
const ALPHA = 3; // lookup concurrency
const POW_DIFFICULTY = 16; // required leading zero bits (Sybil guard)
const MINE_CHUNK = 2_000;
const MINE_CAP = 500_000;

const toHex256 = (value: bigint): string => value.toString(16).padStart(KEY_BITS / 4, "0");

/** Position of the most significant set bit, or -1 for zero. */
const msbIndex = (value: bigint): number => (value === 0n ? -1 : value.toString(2).length - 1);

const hexSlice = (hex: string): string => `${hex.slice(0, 10)}…${hex.slice(-6)}`;

/** Deterministic LCG so SSR and client render identical routing tables. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function random256(rand: () => number): bigint {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value = (value << 32n) | BigInt(Math.floor(rand() * 4_294_967_296));
  }
  return value;
}

/**
 * 8-lane FNV-1a variant over a 32-bit lane mixer — a *simulated* identity
 * hash used for the PoW badge. Educational stand-in for sha2-256/argon2.
 */
function hashTo256(data: string): bigint {
  const lanes: number[] = [
    0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd6e8feb1,
    0xa5a5a5a5,
  ];
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    for (let l = 0; l < 8; l++) {
      const prime = (0x01000193 + Math.imul(l, 0x9e3779b1)) >>> 0;
      lanes[l] = Math.imul(lanes[l] ^ c, prime) >>> 0;
    }
  }
  let out = 0n;
  for (let l = 0; l < 8; l++) {
    let x = lanes[l] >>> 0;
    x ^= x >>> 15;
    x = Math.imul(x, 0x2c1b3c6d) >>> 0;
    x ^= x >>> 13;
    x = Math.imul(x, 0x297a2d39) >>> 0;
    x ^= x >>> 16;
    out = (out << 32n) | BigInt(x >>> 0);
  }
  return out;
}

/** Accepts raw hex (≤256 bit) directly; any other text is digested into a key. */
function resolveTarget(raw: string): { key: bigint; mode: "hex" | "digest" } {
  const trimmed = raw.trim();
  if (trimmed === "") return { key: 0n, mode: "hex" };
  const bare = trimmed.replace(/^0x/i, "");
  if (/^[0-9a-fA-F]+$/.test(bare) && bare.length <= KEY_BITS / 4) {
    return { key: BigInt(`0x${bare.padStart(KEY_BITS / 4, "0")}`), mode: "hex" };
  }
  return { key: hashTo256(trimmed), mode: "digest" };
}

/* ------------------------------------------------------------------ */
/* Deterministic routing-table population                              */
/* ------------------------------------------------------------------ */

interface DhtPeer {
  id: bigint;
  hex: string;
  alias: string;
  ip: string;
  rtt: number;
  ageSec: number;
}

const LOCAL_HEX =
  "9f2c74e1a85d0b63f9c274e1a85d0b63f9c274e1a85d0b63f9c274e1a85d0b63";
const LOCAL_ID = BigInt(`0x${LOCAL_HEX}`);

const DEFAULT_TARGET =
  "4d3ba917f0c56e82a1d47b93fc05e6218ad73b540f19ce6d2b85a073e41c9fd5";

const ALIASES: string[] = [
  "atlas-relay", "basalt-node", "cobalt-val", "delta-arch", "ember-peer", "fjord-sync",
  "granite-dht", "helix-observer", "ion-gateway", "jasper-farm", "krypton-lt", "lumen-val",
  "mica-edge", "nimbus-relay", "onyx-archive", "pyrite-test", "quartz-boot", "riven-dev",
  "solstice-val", "topaz-peer", "umber-node", "verdant-sync", "wraith-relay", "xenon-lt",
  "yarrow-peer", "zephyr-val", "amber-node", "brine-peer", "cirrus-relay", "drift-val",
  "echo-node", "flux-peer", "gale-val", "harbor-node",
];

function buildPeers(): DhtPeer[] {
  const rand = lcg(0x5eed_1234);
  return ALIASES.map((alias, i) => {
    const id = random256(rand);
    return {
      id,
      hex: toHex256(id),
      alias,
      ip: `172.16.${(i >> 4) & 0xff}.${(i * 13 + 41) & 0xff}`,
      rtt: Math.round(rand() * 118) + 9,
      ageSec: Math.floor(rand() * 540) + 4,
    };
  });
}

const PEERS: DhtPeer[] = buildPeers();

interface RankedPeer extends DhtPeer {
  distance: bigint;
  bucket: number;
}

type PingStats = { total: number; inflight: number; timeouts: number };
type MineState = { attempts: number; found: boolean; nonce: number };

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function KademliaDhtVisualizer() {
  const [draft, setDraft] = useState<string>(DEFAULT_TARGET);
  const [target, setTarget] = useState<{ key: bigint; mode: "hex" | "digest" }>(() =>
    resolveTarget(DEFAULT_TARGET),
  );
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [pings, setPings] = useState<PingStats>({ total: 412, inflight: 3, timeouts: 6 });
  const [mine, setMine] = useState<MineState>({ attempts: 0, found: false, nonce: -1 });
  const [mineEpoch, setMineEpoch] = useState<number>(0);

  /* ---- derived routing state ---- */
  const distance = useMemo(() => LOCAL_ID ^ target.key, [target.key]);
  const distanceHex = useMemo(() => toHex256(distance), [distance]);
  const distanceMsb = msbIndex(distance);
  const xorBucket = distanceMsb; // bucket i ⇔ distance ∈ [2^i, 2^(i+1))

  const bits = useMemo<boolean[]>(() => {
    const out: boolean[] = [];
    for (let i = KEY_BITS - 1; i >= 0; i--) out.push(((distance >> BigInt(i)) & 1n) === 1n);
    return out;
  }, [distance]);

  const firstSetBitAt = bits.findIndex((b) => b); // index into `bits` (0 = bit 255)

  const ranked = useMemo<RankedPeer[]>(() => {
    return PEERS.map((peer) => {
      const d = LOCAL_ID ^ peer.id;
      return { ...peer, distance: d, bucket: msbIndex(d) };
    }).sort((a, b) => (a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0));
  }, []);

  const occupancy = useMemo<number[]>(() => {
    const table = new Array<number>(KEY_BITS).fill(0);
    for (const peer of ranked) table[peer.bucket] += 1;
    return table;
  }, [ranked]);

  const occupiedCount = useMemo(
    () => occupancy.reduce((n, count) => (count > 0 ? n + 1 : n), 0),
    [occupancy],
  );

  const kClosest = ranked.slice(0, K);
  const candidates = ranked.slice(K, 12);
  const maxDistance = ranked[ranked.length - 1]?.distance ?? 1n;
  const meanRtt = Math.round(
    kClosest.reduce((sum, p) => sum + p.rtt, 0) / Math.max(kClosest.length, 1),
  );

  const effectiveBucket = selectedBucket ?? xorBucket;
  const bucketContacts = ranked.filter((peer) => peer.bucket === effectiveBucket);
  const bucketRange = `2^${effectiveBucket} … 2^${effectiveBucket + 1} − 1`;

  /* ---- live ping churn ---- */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setPings((p) => ({
        total: p.total + 1 + Math.floor(Math.random() * 3),
        inflight: 1 + Math.floor(Math.random() * ALPHA),
        timeouts: p.timeouts + (Math.random() < 0.16 ? 1 : 0),
      }));
    }, 1_400);
    return () => window.clearInterval(timer);
  }, []);

  /* ---- chunked PoW mining so the main thread never blocks ---- */
  useEffect(() => {
    const threshold = 1n << BigInt(KEY_BITS - POW_DIFFICULTY);
    let attempts = 0;
    let timer = 0;

    const step = (): void => {
      if (attempts === 0) setMine({ attempts: 0, found: false, nonce: -1 });
      const end = Math.min(attempts + MINE_CHUNK, MINE_CAP);
      for (let nonce = attempts; nonce < end; nonce++) {
        if (hashTo256(`${LOCAL_HEX}:${nonce}`) < threshold) {
          setMine({ attempts: nonce + 1, found: true, nonce });
          return;
        }
      }
      attempts = end;
      if (attempts >= MINE_CAP) {
        setMine({ attempts, found: false, nonce: -1 });
        return;
      }
      setMine({ attempts, found: false, nonce: -1 });
      timer = window.setTimeout(step, 0);
    };

    timer = window.setTimeout(step, 0);
    return () => window.clearTimeout(timer);
  }, [mineEpoch]);

  /* ---- interactions ---- */
  const applyTarget = useCallback((raw: string): void => {
    const resolved = resolveTarget(raw);
    setDraft(raw);
    setTarget(resolved);
    setSelectedBucket(null);
    setMineEpoch((e) => e + 1);
  }, []);

  const randomizeTarget = useCallback((): void => {
    const hex = toHex256(random256(Math.random));
    applyTarget(hex);
  }, [applyTarget]);

  const bucketCellClass = (bucket: number): string => {
    const count = occupancy[bucket];
    let base: string;
    if (bucket === xorBucket) base = "bg-amber-400/90";
    else if (count >= 3) base = "bg-emerald-500/80";
    else if (count === 2) base = "bg-emerald-500/55";
    else if (count === 1) base = "bg-emerald-500/30";
    else base = "bg-slate-800/60";
    const selected = bucket === selectedBucket ? " ring-1 ring-sky-300 z-10" : "";
    return `${base}${selected}`;
  };

  const distanceBarPct = (d: bigint): number => {
    if (d === 0n) return 100;
    if (maxDistance === 0n) return 100;
    return Math.max(6, 100 - Number((d * 100n) / maxDistance));
  };

  const powProgress = Math.min(100, Math.round((mine.attempts / 2 ** POW_DIFFICULTY) * 100));

  return (
    <div className="space-y-8">
      {/* ---------- identity + target input ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-base font-bold flex items-center gap-2 text-emerald-400 mb-4">
            <Hash className="w-4 h-4" /> Local Node Key
          </h2>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
              256-bit PeerId
            </div>
            <div className="font-mono text-[11px] text-emerald-400 break-all leading-relaxed">
              {LOCAL_HEX}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-2">
              <div className="text-[9px] text-slate-500 font-bold uppercase">Buckets</div>
              <div className="font-mono text-sm font-bold text-slate-200">{KEY_BITS}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-2">
              <div className="text-[9px] text-slate-500 font-bold uppercase">k</div>
              <div className="font-mono text-sm font-bold text-slate-200">{K}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg py-2">
              <div className="text-[9px] text-slate-500 font-bold uppercase">α</div>
              <div className="font-mono text-sm font-bold text-slate-200">{ALPHA}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-base font-bold flex items-center gap-2 text-sky-400 mb-4">
            <Target className="w-4 h-4" /> Lookup Target — calculate local_id ⊕ target_id
          </h2>
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              applyTarget(draft);
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              aria-label="Target PeerId or key"
              placeholder="Paste a 256-bit hex PeerId, CID, or any lookup key…"
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 outline-none rounded-lg px-4 py-3 font-mono text-xs text-slate-200 placeholder:text-slate-600 transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Resolve
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => applyTarget(LOCAL_HEX)}
              className="text-[10px] font-mono font-bold px-2.5 py-1.5 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
            >
              self (distance 0)
            </button>
            <button
              onClick={randomizeTarget}
              className="text-[10px] font-mono font-bold px-2.5 py-1.5 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:border-sky-500/50 hover:text-sky-400 transition-colors flex items-center gap-1"
            >
              <Shuffle className="w-3 h-3" /> random 256-bit key
            </button>
            <button
              onClick={() => applyTarget(kClosest[0]?.hex ?? DEFAULT_TARGET)}
              className="text-[10px] font-mono font-bold px-2.5 py-1.5 rounded border border-slate-800 bg-slate-950 text-slate-400 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
            >
              nearest known contact
            </button>
            <span className="ml-auto text-[10px] font-mono px-2 py-1 rounded-full border bg-slate-950">
              {target.mode === "hex" ? (
                <span className="text-emerald-400 border-emerald-500/40">
                  RAW HEX KEY · 256 bit
                </span>
              ) : (
                <span className="text-sky-400 border-sky-500/40">
                  TEXT → DIGEST KEY (256 bit)
                </span>
              )}
            </span>
          </div>

          <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-emerald-400 break-all">{toHex256(LOCAL_ID).slice(0, 32)}…</span>
            <span className="text-slate-600">⊕</span>
            <span className="text-sky-400 break-all">{toHex256(target.key).slice(0, 32)}…</span>
            <span className="text-slate-600">=</span>
            <span className="text-amber-400 break-all">{distanceHex.slice(0, 32)}…</span>
          </div>
        </div>
      </div>

      {/* ---------- XOR distance readout ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
            <Binary className="w-5 h-5" /> XOR Distance Metric — 256-bit vector
          </h2>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-1 rounded-full font-semibold">
              bucket #{distanceMsb === -1 ? "—" : xorBucket}
            </span>
            <span className="bg-slate-950 border border-slate-800 text-slate-500 px-2 py-1 rounded-full">
              msb bit {distanceMsb === -1 ? "n/a" : distanceMsb}
            </span>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto custom-scrollbar">
          <div className="min-w-[560px] space-y-1.5">
            {[0, 1, 2, 3].map((row) => {
              const startBit = KEY_BITS - 1 - row * 64;
              const rowBits = bits.slice(row * 64, row * 64 + 64);
              return (
                <div key={row} className="flex items-center gap-3">
                  <span className="text-[9px] font-mono text-slate-600 w-24 shrink-0 text-right">
                    bit {startBit}→{startBit - 63}
                  </span>
                  <div className="grid grid-cols-[repeat(64,minmax(0,1fr))] gap-[2px] flex-1">
                    {rowBits.map((on, col) => {
                      const bitPos = startBit - col;
                      const isMsb = distanceMsb !== -1 && bitPos === distanceMsb;
                      return (
                        <span
                          key={col}
                          title={`bit ${bitPos} = ${on ? 1 : 0}`}
                          className={`h-3 rounded-[1px] transition-colors ${
                            on ? "bg-emerald-400" : "bg-slate-800/70"
                          } ${isMsb ? "ring-2 ring-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" : ""}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Distance (hex)
            </div>
            <div className="font-mono text-[11px] text-amber-400 mt-1 break-all">
              {distanceHex.slice(0, 24)}…
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Shared Prefix
            </div>
            <div className="font-mono text-sm font-bold text-slate-200 mt-1">
              {distanceMsb === -1 ? "256 bits" : `${KEY_BITS - 1 - distanceMsb} bits`}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Leading Diff Bit
            </div>
            <div className="font-mono text-sm font-bold text-slate-200 mt-1">
              {firstSetBitAt === -1 ? "—" : `#${distanceMsb}`}
            </div>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              Lookups To Target
            </div>
            <div className="font-mono text-sm font-bold text-slate-200 mt-1">
              {distanceMsb === -1 ? "0 hops" : `≤ ${Math.ceil(distanceMsb / 4)} hops`}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- bucket map + detail ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
              <Route className="w-5 h-5" /> 256-Bit XOR Bucket Map
            </h2>
            <span className="font-mono text-[10px] text-slate-500">click a bucket to inspect</span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
            {[1, 0].map((rowIdx) => (
              <div key={rowIdx}>
                <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-1">
                  <span>bucket {rowIdx * 128}</span>
                  <span className="text-slate-700">
                    closer ← d(x,y) → farther
                  </span>
                  <span>bucket {rowIdx * 128 + 127}</span>
                </div>
                <div className="grid grid-cols-[repeat(128,minmax(0,1fr))] gap-[1px]">
                  {Array.from({ length: 128 }, (_, col) => {
                    const bucket = rowIdx * 128 + col;
                    const count = occupancy[bucket];
                    return (
                      <button
                        key={bucket}
                        type="button"
                        onClick={() => setSelectedBucket(bucket)}
                        title={`bucket #${bucket} · ${count} contact${count === 1 ? "" : "s"}`}
                        aria-label={`bucket ${bucket}, ${count} contacts`}
                        className={`h-7 rounded-[1px] transition-all hover:scale-y-125 ${bucketCellClass(bucket)}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[1px] bg-slate-800/60" /> empty
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[1px] bg-emerald-500/30" /> 1 contact
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[1px] bg-emerald-500/80" /> ≥3 contacts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[1px] bg-amber-400/90" /> target bucket
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[1px] bg-slate-700 ring-1 ring-sky-300" /> selected
            </span>
          </div>
        </div>

        {/* bucket inspector */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-base font-bold flex items-center gap-2 text-sky-400 mb-4">
            <Crosshair className="w-4 h-4" /> Bucket Inspector
          </h2>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-lg font-bold text-slate-200">
                #{effectiveBucket}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-sky-500/40 text-sky-400 bg-sky-500/10">
                {Math.min(occupancy[effectiveBucket], K)} / {K} filled
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">{bucketRange}</div>
            {occupancy[effectiveBucket] > K && (
              <div className="text-[10px] font-mono text-amber-400/90 mt-1">
                +{occupancy[effectiveBucket] - K} staged in LRU replacement cache (bucket capped at k)
              </div>
            )}
            <div className="h-1.5 bg-slate-900 rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (occupancy[effectiveBucket] / K) * 100)}%`,
                }}
              />
            </div>
            {effectiveBucket === xorBucket && (
              <div className="text-[10px] font-mono text-amber-400 mt-2">
                ◀ current lookup lands here
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar pr-1">
            {bucketContacts.length === 0 ? (
              <div className="text-xs text-slate-600 italic font-mono border border-dashed border-slate-800 rounded-lg p-4 text-center">
                bucket empty — reserved for future FIND_NODE fills
              </div>
            ) : (
              bucketContacts.map((peer) => (
                <div
                  key={peer.hex}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-slate-300 truncate">
                      {hexSlice(peer.hex)}
                    </div>
                    <div className="text-[9px] text-slate-600 font-mono">{peer.alias}</div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                    {peer.rtt}ms
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---------- k-closest table ---------- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
            <Crosshair className="w-5 h-5" /> Closest {K} Nodes (k-bucket replication set)
          </h2>
          <span className="font-mono text-[10px] text-slate-500">
            sorted ascending by d(a,b) = a ⊕ b — click a row to re-target
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="py-2 pr-3 font-bold">#</th>
                <th className="py-2 pr-3 font-bold">PeerId (hex slice)</th>
                <th className="py-2 pr-3 font-bold">Endpoint</th>
                <th className="py-2 pr-3 font-bold">Bucket</th>
                <th className="py-2 pr-3 font-bold">XOR Distance</th>
                <th className="py-2 pr-3 font-bold w-[22%]">Relative</th>
                <th className="py-2 font-bold">RTT</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 12).map((peer, idx) => {
                const inK = idx < K;
                return (
                  <tr
                    key={peer.hex}
                    onClick={() => applyTarget(peer.hex)}
                    title="Use this peer as the lookup target"
                    className={`cursor-pointer border-b border-slate-800/60 transition-colors ${
                      inK ? "hover:bg-emerald-500/5" : "hover:bg-slate-950/60"
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-mono text-xs">
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          inK
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : "border-slate-800 text-slate-600"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-300 whitespace-nowrap">
                      {hexSlice(peer.hex)}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {peer.ip}:9000
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">#{peer.bucket}</td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-amber-400/90 whitespace-nowrap">
                      {peer.distance === 0n
                        ? "0x0 (self)"
                        : `0x${peer.distance.toString(16).padStart(16, "0")}…`}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${inK ? "bg-emerald-500" : "bg-slate-700"}`}
                          style={{ width: `${distanceBarPct(peer.distance)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 font-mono text-[11px] whitespace-nowrap">
                      <span className={inK ? "text-emerald-400" : "text-slate-600"}>
                        ✓ {peer.rtt}ms
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[1px] bg-emerald-500/80" /> rows 1–{K} = k-closest
            (replicated)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[1px] bg-slate-700" /> rows {K + 1}–12 = eviction
            candidates (LRU-checked on bucket fullness)
          </span>
          <span className="ml-auto">
            lookup fanout α={ALPHA} · {candidates.length} candidates staged
          </span>
        </div>
      </div>

      {/* ---------- routing health metrics ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Buckets filled */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-emerald-400" /> Buckets Filled
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {Math.round((occupiedCount / KEY_BITS) * 100)}%
            </span>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-100">
            {occupiedCount}
            <span className="text-sm text-slate-600"> / {KEY_BITS}</span>
          </div>
          <div className="h-1.5 bg-slate-950 rounded-full mt-3 overflow-hidden border border-slate-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(occupiedCount / KEY_BITS) * 100}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-600 mt-2">
            {PEERS.length} contacts routed · {occupancy[effectiveBucket]} in bucket #{effectiveBucket}
          </div>
        </div>

        {/* Active pings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" /> Active Pings
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
            </span>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-100">
            {pings.inflight}
            <span className="text-sm text-slate-600"> in-flight</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase font-bold">Cumulative</div>
              <div className="font-mono text-sm font-bold text-slate-300">{pings.total}</div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase font-bold">Timeouts</div>
              <div className="font-mono text-sm font-bold text-amber-400">{pings.timeouts}</div>
            </div>
          </div>
        </div>

        {/* PoW Sybil resistance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Pickaxe className="w-3.5 h-3.5 text-amber-400" /> PoW Sybil Guard
            </span>
            <button
              onClick={() => setMineEpoch((e) => e + 1)}
              className="text-slate-500 hover:text-amber-400 transition-colors"
              aria-label="Re-mine identity proof"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-100">
            2<sup className="text-sm text-slate-600">^{POW_DIFFICULTY}</sup>
            <span className="text-sm text-slate-600"> difficulty</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono mt-3">
            <span className="text-slate-500">{mine.attempts.toLocaleString()} hashes</span>
            <span
              className={
                mine.found
                  ? "text-emerald-400 font-bold"
                  : mine.attempts >= MINE_CAP
                    ? "text-rose-400 font-bold"
                    : "text-amber-400 font-bold animate-pulse"
              }
            >
              {mine.found
                ? `VERIFIED · nonce ${mine.nonce}`
                : mine.attempts >= MINE_CAP
                  ? "CAP REACHED"
                  : "MINING…"}
            </span>
          </div>
          <div className="h-1.5 bg-slate-950 rounded-full mt-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all ${mine.found ? "bg-emerald-500" : "bg-amber-500"}`}
              style={{ width: `${mine.found ? 100 : powProgress}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-slate-600 mt-2">
            identity admitted only at ≥{POW_DIFFICULTY} leading zero bits
          </div>
        </div>

        {/* Lookup quality */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" /> k-Closest Health
            </span>
            <span className="text-[10px] font-mono text-slate-500">α={ALPHA}</span>
          </div>
          <div className="font-mono text-2xl font-extrabold text-slate-100">
            {meanRtt}
            <span className="text-sm text-slate-600"> ms avg</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase font-bold">Replication</div>
              <div className="font-mono text-sm font-bold text-emerald-400">
                {kClosest.length}/{K}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 uppercase font-bold">Stable</div>
              <div className="font-mono text-sm font-bold text-slate-300">
                {kClosest.filter((p) => p.ageSec < 300).length}/{K}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
