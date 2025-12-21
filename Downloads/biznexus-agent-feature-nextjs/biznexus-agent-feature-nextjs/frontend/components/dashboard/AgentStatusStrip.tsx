import React from 'react';
import { ShoppingCart, TrendingUp, Megaphone, Calendar, Activity, Cpu } from 'lucide-react';

interface AgentStatusStripProps {
    activeAgent: string | null;
}

const agents = [
    { id: 'Coordinator Agent', name: 'Coordinator', icon: Cpu, color: 'text-fuchsia-400', border: 'border-fuchsia-500/50', bg: 'bg-fuchsia-500/20' },
    { id: 'Sales Agent', name: 'Sales', icon: TrendingUp, color: 'text-emerald-400', border: 'border-emerald-500/50', bg: 'bg-emerald-500/20' },
    { id: 'Inventory Agent', name: 'Inventory', icon: ShoppingCart, color: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/20' },
    { id: 'Marketing Agent', name: 'Marketing', icon: Megaphone, color: 'text-pink-400', border: 'border-pink-500/50', bg: 'bg-pink-500/20' },
    { id: 'Calendar Agent', name: 'Calendar', icon: Calendar, color: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'bg-cyan-500/20' },
];

export default function AgentStatusStrip({ activeAgent }: AgentStatusStripProps) {
    return (
        <div className="flex items-center justify-center gap-4 py-4 w-full max-w-4xl mx-auto mb-2">
            {agents.map((agent) => {
                const isActive = activeAgent === agent.id;
                const Icon = agent.icon;

                return (
                    <div
                        key={agent.id}
                        className={`
                            relative flex flex-col items-center justify-center w-24 h-20 rounded-xl border transition-all duration-500
                            ${isActive
                                ? `${agent.bg} ${agent.border} shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-110 z-10`
                                : 'bg-black/40 border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 hover:scale-105'
                            }
                        `}
                    >
                        {/* Glow Logic */}
                        {isActive && (
                            <div className={`absolute inset-0 rounded-xl ${agent.bg} blur-xl opacity-40 animate-pulse`}></div>
                        )}

                        <div className={`relative z-10 ${isActive ? agent.color : 'text-zinc-500'}`}>
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                        </div>

                        <div className="relative z-10 text-[10px] font-bold mt-2 tracking-wider text-zinc-300 uppercase">
                            {agent.name}
                        </div>

                        {/* Latency Metric */}
                        <div className="relative z-10 flex items-center gap-1 mt-1">
                            <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-green-400 animate-ping' : 'bg-zinc-600'}`}></div>
                            <span className="text-[9px] font-mono text-zinc-500">12ms</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
