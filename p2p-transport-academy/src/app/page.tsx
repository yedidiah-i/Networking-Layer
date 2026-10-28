import Link from "next/link";
import {
  Gauge,
  Activity,
  Radio,
  Route,
  BookOpen,
  ArrowRight,
  Network,
  Zap,
  Shield,
  Server,
  Globe,
  Layers,
  Lock,
  Terminal,
} from "lucide-react";

const LABS = [
  {
    href: "/labs/transport",
    title: "Transport Protocol Simulator",
    description:
      "Switch between TCP, QUIC, and WebSocket. Discover your real public IP and watch NAT hole-punching succeed or fall back to relay tunneling.",
    icon: Gauge,
    badge: "Interactive",
    color: "from-brand-500 to-brand-600",
  },
  {
    href: "/labs/bootstrapping",
    title: "Node Bootstrapping Lifecycle",
    description:
      "Trace a peer from cold spawn through identity creation, link-local discovery, and into the global Kademlia routing table — one state transition at a time.",
    icon: Activity,
    badge: "Animated",
    color: "from-accent-500 to-accent-600",
  },
  {
    href: "/labs/mdns",
    title: "mDNS Local Discovery",
    description:
      "Watch a multicast query sweep across your local network and capture peer records with their PeerIds, addresses, and service advertisements.",
    icon: Radio,
    badge: "Live",
    color: "from-success-500 to-success-600",
  },
  {
    href: "/labs/kademlia",
    title: "Kademlia DHT Visualizer",
    description:
      "Enter a target key, compute XOR distance bit-by-bit, explore 256 routing buckets, inspect k-closest nodes, and watch PoW Sybil resistance in action.",
    icon: Route,
    badge: "Advanced",
    color: "from-warning-500 to-warning-600",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Real Network Discovery",
    description:
      "The transport lab fetches your actual public IP address from Cloudflare's edge network — not a mock. See what a real peer would see.",
  },
  {
    icon: Shield,
    title: "Security-First Design",
    description:
      "Explore how STUN packet validation, handshake enforcement, and proof-of-work Sybil resistance protect real P2P networks from abuse.",
  },
  {
    icon: Layers,
    title: "Learn by Doing",
    description:
      "Every concept comes with a live, interactive simulation. Toggle protocols, run boot sequences, broadcast queries, and compute distances yourself.",
  },
];

const CONCEPTS = [
  {
    icon: Network,
    title: "What is P2P?",
    text: "Instead of connecting to a central server, peers connect directly to each other. Every node is both a client and a server, sharing data and routing without a middleman.",
  },
  {
    icon: Globe,
    title: "NAT Traversal",
    text: "Most home routers block incoming connections. NAT traversal techniques like hole punching let peers open a path through the firewall so they can connect directly.",
  },
  {
    icon: Server,
    title: "The DHT",
    text: "A Distributed Hash Table spreads data across many nodes. Each node stores a slice. Kademlia uses XOR math to find the right node for any key in just a few hops.",
  },
  {
    icon: Lock,
    title: "Why Security Matters",
    text: "Open networks attract attackers. Identity proofs, encrypted handshakes, and rate-limited admissions keep networks healthy even when anyone can join.",
  },
];

export default function Home() {
  return (
    <main className="bg-[#0b1120]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0b1120]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300 text-xs font-semibold mb-6 animate-fade-in-up">
            <Terminal className="w-3.5 h-3.5" />
            Built for blockchain engineers and network learners
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-50 max-w-4xl mx-auto leading-[1.1] animate-fade-in-up">
            Master{" "}
            <span className="gradient-text">Peer-to-Peer</span>{" "}
            Networking
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-in-up">
            An interactive academy for transport protocols, NAT traversal, node
            discovery, and distributed hash table routing. Learn by running live
            simulations — not by reading slides.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up">
            <Link
              href="/labs/transport"
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors glow-brand"
            >
              Start the Transport Lab
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-6 py-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-xl transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-800/60 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "4", label: "Interactive Labs" },
              { value: "3", label: "Transport Protocols" },
              { value: "256", label: "DHT Buckets" },
              { value: "100%", label: "Hands-On" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-extrabold text-slate-100">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Concepts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-100">
            What is this all about?
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            Peer-to-peer networking is how decentralized systems communicate
            without central servers. Here are the core ideas you&apos;ll explore.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CONCEPTS.map((concept) => {
            const Icon = concept.icon;
            return (
              <div
                key={concept.title}
                className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 card-hover hover:border-slate-700"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">
                      {concept.title}
                    </h3>
                    <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                      {concept.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Labs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-100">
            Four Interactive Labs
          </h2>
          <p className="text-slate-400 mt-3 max-w-2xl mx-auto">
            Each lab teaches a different layer of the P2P stack. Jump into any
            one — they run right in your browser.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LABS.map((lab) => {
            const Icon = lab.icon;
            return (
              <Link
                key={lab.href}
                href={lab.href}
                className="group bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden card-hover hover:border-brand-500/40"
              >
                <div className={`h-1.5 bg-gradient-to-r ${lab.color}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center group-hover:border-brand-500/30 transition-colors">
                      <Icon className="w-6 h-6 text-brand-400" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800/50 text-slate-400">
                      {lab.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 group-hover:text-brand-300 transition-colors">
                    {lab.title}
                  </h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    {lab.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1.5 text-brand-400 text-sm font-medium">
                    Open lab
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-900/30 border-y border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-100">
              Why this academy is different
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="text-center"
                >
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500/10 to-accent-500/10 border border-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-accent-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-xs mx-auto">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-slate-100">
          Ready to dive in?
        </h2>
        <p className="text-slate-400 mt-3 max-w-xl mx-auto">
          Start with the transport simulator — it takes 30 seconds to see your
          real public IP and watch a NAT hole punch in action.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/labs/transport"
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl transition-colors glow-brand"
          >
            Launch Transport Lab
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-2 px-6 py-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-xl transition-colors"
          >
            Create an Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Network className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-400">
              P2P Transport Academy
            </span>
          </div>
          <p className="text-sm text-slate-600">
            An interactive learning platform for decentralized networking.
          </p>
        </div>
      </footer>
    </main>
  );
}