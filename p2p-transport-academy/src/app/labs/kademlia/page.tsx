import KademliaDhtVisualizer from "@/components/KademliaDhtVisualizer";
import { Route } from "lucide-react";

export const metadata = {
  title: "Kademlia DHT Visualizer — P2P Academy",
};

export default function KademliaLabPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-warning-500/30 bg-warning-500/10 text-warning-400">
            Lab 04
          </span>
          <span className="text-xs text-slate-500">Distributed Routing</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-3">
          <Route className="w-7 h-7 text-warning-400" />
          Kademlia XOR Distance Visualizer
        </h1>
        <p className="text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Enter any 256-bit target key to compute the XOR distance to your local
          node, explore the 256-bucket routing table, inspect the closest
          k-nodes, and watch the proof-of-work Sybil resistance gate in action.
        </p>
      </div>
      <KademliaDhtVisualizer />
    </main>
  );
}