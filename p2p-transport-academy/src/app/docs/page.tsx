import Link from "next/link";
import {
  BookOpen,
  Network,
  Globe,
  Server,
  Lock,
  Zap,
  Radio,
  Route,
  Activity,
  Terminal,
  ArrowRight,
  Cpu,
} from "lucide-react";

export const metadata = {
  title: "Documentation — P2P Academy",
};

const SECTIONS = [
  {
    id: "what-is-p2p",
    icon: Network,
    title: "What is Peer-to-Peer Networking?",
    body: [
      "In a traditional client-server architecture, your computer (the client) connects to a central server that stores data and handles requests. If the server goes down, the whole system stops working.",
      "Peer-to-peer (P2P) networking flips this model. Every participant — called a \"node\" or \"peer\" — is equal. Each node can both request and provide data. There is no central server. Nodes connect directly to each other, forming a decentralized network.",
      "This is the foundation of blockchain networks, file-sharing systems like BitTorrent, and decentralized messaging platforms. It makes networks resilient (no single point of failure), censorship-resistant (no central authority to shut down), and scalable (every new node adds capacity, not load).",
    ],
  },
  {
    id: "transport-protocols",
    icon: Zap,
    title: "Transport Protocols: TCP, QUIC, and WebSocket",
    body: [
      "A transport protocol is the method by which two computers send data to each other over the internet. The choice of protocol affects speed, reliability, and how well the connection handles network obstacles.",
      "TCP (Transmission Control Protocol) is the oldest and most reliable. It guarantees that every packet arrives in order. But this reliability comes with overhead — every packet must be acknowledged, which adds latency. TCP also struggles with NAT traversal because it requires a dedicated connection stream.",
      "QUIC (Quick UDP Internet Connections) is the modern alternative, built on UDP. It combines the reliability of TCP with much lower latency, built-in encryption (no separate TLS handshake), and support for connection migration — if your IP changes (e.g. switching from WiFi to cellular), the connection survives. QUIC also supports multiplexing: multiple streams share one connection without blocking each other.",
      "WebSocket is a protocol that upgrades a standard HTTP connection into a persistent, bidirectional channel. It's useful for browser-based P2P applications where raw TCP or UDP isn't available. It adds some framing overhead but works in any environment that supports HTTP.",
    ],
  },
  {
    id: "nat-traversal",
    icon: Globe,
    title: "NAT Traversal and Hole Punching",
    body: [
      "Most home and office routers use NAT (Network Address Translation). NAT allows multiple devices to share one public IP address. The router rewrites outgoing packets so they appear to come from the public IP, and tracks the mapping so return traffic can be routed back to the right device.",
      "The problem: NAT blocks unsolicited incoming connections. If peer A wants to connect to peer B, but B's router has no existing mapping for A's address, it will drop the packet. This makes direct P2P connections impossible without help.",
      "The solution is hole punching. Both peers simultaneously send packets to each other's public address. This creates NAT mappings on both routers. Once both mappings exist, subsequent packets flow through. The technique used depends on the NAT type:",
      "Full Cone NAT (open) maps a given internal port to the same external port for all destinations. Hole punching works reliably — the simulator in Lab 01 shows this succeeding.",
      "Symmetric NAT (strict) assigns a different external port for each destination. Since the port the peer sees differs from what the other expects, hole punching fails and traffic must be relayed through a TURN server. The simulator shows this fallback path too.",
      "STUN (Session Traversal Utilities for NAT) is the protocol used to discover a peer's public address. Each STUN packet contains a high-entropy 12-byte transaction ID to prevent spoofing — an attacker can't inject fake responses without guessing the ID.",
    ],
  },
  {
    id: "node-discovery",
    icon: Radio,
    title: "Node Discovery: mDNS and Bootstrapping",
    body: [
      "Before a node can participate in a P2P network, it needs to find other nodes. Discovery happens in two stages: local and global.",
      "Local discovery uses mDNS (Multicast DNS). A new node sends a multicast query to 224.0.0.251:5353 — a special address that all devices on the same local network listen to. Any peer that hears the query responds with its address, port, and PeerId. This lets nodes on the same LAN find each other instantly without any external server.",
      "Global discovery uses bootstrap nodes — well-known nodes with stable addresses (like DNS records) that new nodes connect to first. The new node asks the bootstrap for a list of closer peers, then asks those peers for even closer ones, iterating until it has populated its routing table. This is the same process shown in the Bootstrapping Lifecycle lab.",
      "The full boot sequence goes through four phases: Cold Start (process spawned, identity keys generated), Transport Init (listeners bound, encryption armed), Local Discovery (mDNS sweep), and DHT Join (connecting to global routing table via bootstrap nodes).",
    ],
  },
  {
    id: "kademlia-dht",
    icon: Route,
    title: "The Kademlia Distributed Hash Table",
    body: [
      "A Distributed Hash Table (DHT) is a way to store key-value pairs across many nodes in a P2P network. Instead of every node holding all the data, each node holds a slice. The challenge is: how do you find which node holds the data you need?",
      "Kademlia solves this with XOR distance. Every node has a 256-bit ID. The \"distance\" between two IDs is computed by XOR (exclusive or): distance = A XOR B. XOR is simple but has a crucial property: the closer two IDs are in value, the smaller their XOR distance.",
      "Each node maintains a routing table with 256 \"buckets.\" Bucket i holds contacts whose XOR distance from the node falls in the range [2^i, 2^(i+1)). This means most contacts are far away, and very few are nearby — which mirrors reality, since there are exponentially more far nodes than near ones.",
      "To find a target key, a node asks the α closest contacts it knows (α=3). Each responds with its own closest contacts. The node iterates, asking closer and closer nodes, until it can't get any closer. Thanks to the XOR metric, this converges in O(log N) hops — for a network of 2^256 nodes, that's at most 64 lookups.",
      "The Kademlia lab lets you enter any target key and see the XOR distance computed bit-by-bit, the bucket it lands in, and the k-closest (k=8) nodes in the routing table.",
    ],
  },
  {
    id: "security",
    icon: Lock,
    title: "Security: Handshakes, PoW, and Sybil Resistance",
    body: [
      "Open P2P networks face a fundamental problem: anyone can join, and anyone can create as many identities as they want. An attacker who controls many nodes can monitor, censor, or corrupt the network. This is called a Sybil attack.",
      "Kademlia networks combat this with proof-of-work identity admission. Before a node's ID is accepted into the routing table, it must demonstrate that its identity hash has at least a certain number of leading zero bits (the Kademlia lab uses 2^16). This makes mass identity creation computationally expensive — an attacker would need to perform billions of hash operations to create enough Sybil nodes to matter.",
      "Encrypted handshakes prevent eavesdropping and man-in-the-middle attacks. The Noise protocol framework (Noise_XX_25519_ChaChaPoly_BLAKE2s) provides authenticated encryption: both peers prove they hold the private key for their PeerId, and all subsequent traffic is encrypted with ChaCha20-Poly1305.",
      "STUN transaction IDs use 12 bytes of high-entropy random data to prevent response injection. An attacker cannot forge a STUN response without knowing the transaction ID, which is generated fresh for each exchange.",
    ],
  },
  {
    id: "architecture",
    icon: Terminal,
    title: "The Rust Backend Architecture",
    body: [
      "The reference implementation behind these simulations is written in Rust. It abstracts multiple transport protocols behind a single enum, allowing the networking stack to switch between TCP, QUIC, and WebSocket without changing the application layer.",
      "The core wire stream type unifies all three transports:",
      "Every connection goes through the Noise handshake suite before any application data flows. The identify protocol advertises the node's capabilities (supported protocols, agent version) so peers know what they can talk about.",
      "The routing table uses 256 k-buckets with a bucket size of k=8 and lookup concurrency of α=3. The admission gate requires a 2^16 leading-zero-bit proof-of-work before inserting a new contact, throttling Sybil attacks.",
    ],
  },
];

const CODE_BLOCK = `pub enum RawWireStream {
    Tcp(TcpStream),
    Quic { send: SendStream, recv: RecvStream },
    WebSocket { stream: WebSocketStream<...>, buffer: Vec<u8> }
}`;

export default function DocsPage() {
  return (
    <main className="bg-[#0b1120] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300 text-xs font-semibold mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            Documentation
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100">
            Understanding P2P Networking
          </h1>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">
            A plain-language guide to the concepts behind every lab. No prior
            networking experience required — we explain everything from
            scratch.
          </p>
        </div>

        {/* Table of contents */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 mb-12">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
            Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECTIONS.map((section, idx) => {
              const Icon = section.icon;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-brand-300 hover:bg-brand-500/5 transition-colors"
                >
                  <span className="text-xs font-mono text-slate-600 w-5">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <Icon className="w-4 h-4 shrink-0" />
                  {section.title}
                </a>
              );
            })}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-16">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand-400" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-100">
                    {section.title}
                  </h2>
                </div>
                <div className="space-y-4 pl-13 ml-0.5">
                  {section.body.map((paragraph, i) => {
                    if (section.id === "architecture" && i === 2) {
                      return (
                        <div key={i}>
                          <p className="text-slate-400 leading-relaxed">
                            {paragraph}
                          </p>
                          <pre className="bg-slate-950 text-slate-400 p-4 rounded-lg text-xs font-mono border border-slate-800 overflow-x-auto mt-4">
{CODE_BLOCK}
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <p key={i} className="text-slate-400 leading-relaxed">
                        {paragraph}
                      </p>
                    );
                  })}
                </div>

                {/* Link to the relevant lab */}
                {section.id === "transport-protocols" && (
                  <Link href="/labs/transport" className="mt-6 inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm font-medium">
                    Try the Transport Simulator <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {section.id === "nat-traversal" && (
                  <Link href="/labs/transport" className="mt-6 inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm font-medium">
                    See NAT hole-punching in action <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {section.id === "node-discovery" && (
                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <Link href="/labs/bootstrapping" className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-sm font-medium">
                      <Activity className="w-4 h-4" /> Bootstrapping Lab <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link href="/labs/mdns" className="inline-flex items-center gap-1.5 text-success-400 hover:text-success-300 text-sm font-medium">
                      <Radio className="w-4 h-4" /> mDNS Discovery Lab <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
                {section.id === "kademlia-dht" && (
                  <Link href="/labs/kademlia" className="mt-6 inline-flex items-center gap-1.5 text-warning-400 hover:text-warning-300 text-sm font-medium">
                    Open the Kademlia Visualizer <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {section.id === "security" && (
                  <Link href="/labs/kademlia" className="mt-6 inline-flex items-center gap-1.5 text-warning-400 hover:text-warning-300 text-sm font-medium">
                    See PoW Sybil resistance in the DHT lab <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </section>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center border-t border-slate-800 pt-12">
          <h2 className="text-2xl font-bold text-slate-100">
            Ready to experiment?
          </h2>
          <p className="text-slate-400 mt-2">
            Pick a lab and start interacting with real simulations.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/labs/transport"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors"
            >
              <Cpu className="w-4 h-4" /> Transport Lab
            </Link>
            <Link
              href="/labs/kademlia"
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-xl transition-colors"
            >
              <Route className="w-4 h-4" /> DHT Visualizer
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}