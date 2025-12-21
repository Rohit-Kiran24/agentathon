"use client";

import Link from "next/link";
import { Bot, BarChart3, Zap, ArrowRight, Settings, Bell, Search, LogOut, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HubPage() {
    const { user, profile, signOut } = useAuth();

    // Choose display name: Profile Name > Auth Name > "User"
    const displayName = profile?.displayName || user?.displayName || "User";
    const initial = displayName[0]?.toUpperCase() || "U";

    return (
        <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30">
            {/* Top Navigation */}
            <header className="border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-40">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg hidden sm:block">BizNexus</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-zinc-400 border border-white/5 uppercase tracking-wide">
                            Hub
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <div className="text-xs font-bold text-white">{displayName}</div>
                            <div className="text-[10px] text-zinc-500">{profile?.companyName || "Organization"}</div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center font-bold text-xs">
                            {initial}
                        </div>

                        <button
                            onClick={() => signOut()}
                            className="p-2 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                <div className="mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
                        <p className="text-zinc-400">Welcome back, {displayName}. Here is your command center.</p>
                    </div>
                    <Link
                        href="/settings"
                        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                    >
                        <Settings className="w-4 h-4" /> Settings
                    </Link>
                </div>

                {/* Apps Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                    <HubCard
                        href="/chat"
                        title="AI Command Center"
                        description="Chat with your business agent to execute tasks and get answers."
                        icon={<Bot className="w-6 h-6 text-white" />}
                        color="from-indigo-500 to-purple-600"
                        label="Active"
                    />

                    <HubCard
                        href="/analytics"
                        title="Analytics Dashboard"
                        description="Visualize your sales, inventory, and performance metrics in real-time."
                        icon={<BarChart3 className="w-6 h-6 text-white" />}
                        color="from-blue-500 to-cyan-500"
                        label="Live"
                    />

                    <HubCard
                        href="/what-if"
                        title="What-If Analysis"
                        description="Run predictive scenarios to forecast outcomes and mitigate risks."
                        icon={<Zap className="w-6 h-6 text-white" />}
                        color="from-pink-500 to-rose-500"
                        label="New"
                    />

                </div>
            </main>
        </div>
    );
}

function HubCard({
    href,
    title,
    description,
    icon,
    color,
    label
}: {
    href: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    label: string;
}) {
    return (
        <Link href={href} className="group relative rounded-2xl border border-white/10 bg-zinc-900/50 hover:bg-zinc-800/80 p-6 transition-all hover:scale-[1.02] overflow-hidden">
            <div className={`absolute top-0 right-0 p-4 opacity-50`}>
                <ArrowRight className="w-5 h-5 text-white/20 -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
            </div>

            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg shadow-black/50`}>
                {icon}
            </div>

            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 text-white/70 px-2 py-0.5 rounded border border-white/5">
                    {label}
                </span>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                {description}
            </p>

            <div className="text-xs font-medium text-white/50 group-hover:text-white transition-colors flex items-center gap-1">
                Launch Application <ArrowRight className="w-3 h-3" />
            </div>

        </Link>
    );
}
