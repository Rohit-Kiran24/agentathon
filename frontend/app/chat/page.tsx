"use client";

import { motion } from "framer-motion";
import Sidebar from "@/components/dashboard/Sidebar";
import ChatInterface from "@/components/dashboard/ChatInterface";
import GlassCalendar from "@/components/dashboard/GlassCalendar";

export default function Home() {
    return (
        <main className="flex min-h-screen bg-transparent text-white selection:bg-cyan-500/30 overflow-hidden relative">

            {/* 2. Floating Sidebar */}
            <div className="relative z-50">
                <Sidebar />
            </div>

            {/* 3. Main Cockpit Area */}
            <section className="flex-1 pl-24 pr-8 py-8 flex flex-col h-screen overflow-hidden relative z-10">

                {/* Animated Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex justify-between items-center mb-6 shrink-0"
                >
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
                            BIZNEXUS <span className="text-cyan-400 font-light">PRIME</span>
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-xs font-mono text-emerald-500 uppercase tracking-widest">System Operational</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="px-4 py-2 rounded-full border border-cyan-500/20 bg-cyan-950/10 text-xs font-mono text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                            Latency: <span className="text-white font-bold">12ms</span>
                        </div>
                        <div className="px-4 py-2 rounded-full border border-purple-500/20 bg-purple-950/10 text-xs font-mono text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                            Agent: <span className="text-white font-bold">COO Reasoning</span>
                        </div>
                    </div>
                </motion.header>

                {/* Chat Interface Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex-1 overflow-hidden rounded-3xl border border-white/5 bg-black/40 backdrop-blur-sm shadow-2xl relative"
                >
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-cyan-500/30 rounded-tl-3xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-cyan-500/30 rounded-tr-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-cyan-500/30 rounded-bl-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-cyan-500/30 rounded-br-3xl"></div>

                    <ChatInterface />
                </motion.div>
            </section>

            {/* 4. Right Panel (Holographic) */}
            <motion.aside
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="w-[380px] p-6 hidden xl:flex flex-col gap-6 relative z-10 border-l border-white/5 bg-zinc-950/30 backdrop-blur-md"
            >
                <h2 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-2">Live Telemetry</h2>

                {/* 3. Smart Calendar */}
                <GlassCalendar />

            </motion.aside>
        </main>
    );
}
