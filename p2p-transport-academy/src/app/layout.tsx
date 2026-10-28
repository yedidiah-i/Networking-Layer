import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "P2P Transport Academy — Learn Peer-to-Peer Networking",
  description:
    "An interactive learning platform for peer-to-peer networking. Explore transport protocols, NAT traversal, node discovery, and Kademlia DHT routing through hands-on simulations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b1120] text-slate-200">
        <AuthProvider>
          <Navbar />
          <div className="flex-1">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}