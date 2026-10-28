import MdnsDiscovery from "@/components/MdnsDiscovery";
import { Radio } from "lucide-react";

export const metadata = {
  title: "mDNS Local Discovery — P2P Academy",
};

export default function MdnsLabPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-success-500/30 bg-success-500/10 text-success-400">
            Lab 03
          </span>
          <span className="text-xs text-slate-500">Local Discovery</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-3">
          <Radio className="w-7 h-7 text-success-400" />
          mDNS Multicast Discovery
        </h1>
        <p className="text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Broadcast a multicast DNS query onto your local network and watch peer
          responses arrive in real time. Each discovered peer shows its PeerId,
          LAN address, service records, and round-trip latency.
        </p>
      </div>
      <MdnsDiscovery />
    </main>
  );
}