import NodeBootstrapper from "@/components/NodeBootstrapper";
import { Activity } from "lucide-react";

export const metadata = {
  title: "Node Bootstrapping Lifecycle — P2P Academy",
};

export default function BootstrappingLabPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-accent-500/30 bg-accent-500/10 text-accent-300">
            Lab 02
          </span>
          <span className="text-xs text-slate-500">Node Lifecycle</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-3">
          <Activity className="w-7 h-7 text-accent-400" />
          Node Bootstrapping Lifecycle
        </h1>
        <p className="text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Watch a node go from a cold process spawn to a fully connected DHT
          participant. Each stage — identity creation, transport binding, local
          discovery, and global routing table join — streams real-time log
          output to the console.
        </p>
      </div>
      <NodeBootstrapper />
    </main>
  );
}