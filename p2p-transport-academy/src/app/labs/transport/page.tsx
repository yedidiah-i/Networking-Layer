import TransportSimulator from "@/components/TransportSimulator";
import { Gauge } from "lucide-react";

export const metadata = {
  title: "Transport Protocol Simulator — P2P Academy",
};

export default function TransportLabPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-300">
            Lab 01
          </span>
          <span className="text-xs text-slate-500">Transport Layer</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 flex items-center gap-3">
          <Gauge className="w-7 h-7 text-brand-400" />
          Transport Protocol Simulator
        </h1>
        <p className="text-slate-400 mt-2 max-w-3xl leading-relaxed">
          Choose a transport protocol (TCP, QUIC, or WebSocket) and a NAT type,
          then run the simulator. It fetches your real public IP address and
          shows whether a direct peer connection can succeed or must fall back
          to a relay.
        </p>
      </div>
      <TransportSimulator />
    </main>
  );
}