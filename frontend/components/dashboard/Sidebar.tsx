"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Database, Settings, History, Bell, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [activeFiles, setActiveFiles] = useState<string[]>([]);

    // Fetch context periodically or on mount
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/context');
                const data = await res.json();
                if (data.files) setActiveFiles(data.files);
            } catch (e) { console.error("Failed to fetch context", e); }
        };

        fetchContext();
        // Poll every 5 seconds to keep updated
        const interval = setInterval(fetchContext, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <aside className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 border-r border-white/10 bg-black/50 backdrop-blur-xl z-50">
            {/* Logo Icon */}
            <div className="mb-12">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    <span className="text-black font-bold text-xl">B</span>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-8 flex-1 w-full px-4">
                <NavItem icon={<Home size={24} />} href="/" active={pathname === "/"} />
                <NavItem icon={<Database size={24} />} href="/upload" active={pathname === "/upload"} />
                <NavItem icon={<History size={24} />} href="#" />

                {/* Active Files Indicator (Mini) */}
                {activeFiles.length > 0 && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <div className="w-full h-px bg-white/10"></div>
                        <div className="relative group cursor-help">
                            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                <FileText size={20} />
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {activeFiles.length}
                                </span>
                            </div>

                            {/* Tooltip listing files */}
                            <div className="absolute left-14 top-0 bg-zinc-900 border border-white/10 p-3 rounded-xl w-48 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <p className="text-xs font-semibold text-white mb-2">Active Data Source:</p>
                                <ul className="text-xs text-zinc-400 space-y-1">
                                    {activeFiles.map((f, i) => (
                                        <li key={i} className="truncate">• {f}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </nav>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-6 mb-4">
                <button className="p-3 text-zinc-400 hover:text-white transition-colors">
                    <Bell size={24} />
                </button>
                <button className="p-3 text-zinc-400 hover:text-white transition-colors">
                    <Settings size={24} />
                </button>
            </div>
        </aside>
    );
}

function NavItem({ icon, href, active = false }: { icon: React.ReactNode; href: string; active?: boolean }) {
    return (
        <Link href={href}>
            <div
                className={`p-3 rounded-2xl transition-all duration-300 flex items-center justify-center ${active
                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    : "text-zinc-500 hover:text-white hover:bg-white/10"
                    }`}
            >
                {icon}
            </div>
        </Link>
    );
}