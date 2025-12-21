"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, Bell, BarChart2, MessageSquare, GitBranch } from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-8 border-r border-white/10 bg-black/50 backdrop-blur-xl z-50">
            {/* Logo Icon */}
            <div className="mb-12">
                <Link href="/hub">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)] cursor-pointer hover:scale-105 transition-transform">
                        <span className="text-black font-bold text-xl">B</span>
                    </div>
                </Link>
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-8 flex-1 w-full px-4 relative">
                {/* Vertical Connector Line */}
                <div className="absolute left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2 z-0 hidden md:block"></div>

                <NavItem icon={<Home size={24} />} href="/hub" active={pathname === "/hub"} />
                <NavItem icon={<MessageSquare size={24} />} href="/chat" active={pathname === "/chat"} />
                <NavItem icon={<BarChart2 size={24} />} href="/analytics" active={pathname === "/analytics"} />
                <NavItem icon={<GitBranch size={24} />} href="/what-if" active={pathname === "/what-if"} />
            </nav>

            {/* Bottom Actions */}
            <div className="flex flex-col gap-6 mb-4 relative z-10">
                <button className="p-3 text-zinc-400 hover:text-white transition-colors">
                    <Bell size={24} />
                </button>
                <Link href="/settings" className={`p-3 transition-colors ${pathname === "/settings" ? "text-white" : "text-zinc-400 hover:text-white"}`}>
                    <Settings size={24} />
                </Link>
            </div>
        </aside>
    );
}

function NavItem({ icon, href, active = false }: { icon: React.ReactNode; href: string; active?: boolean }) {
    return (
        <Link href={href} className="relative z-10 bg-black/50 backdrop-blur-sm rounded-2xl">
            <div
                className={`p-3 rounded-2xl transition-all duration-300 flex items-center justify-center border ${active
                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] border-white scale-110"
                    : "text-zinc-500 border-transparent hover:text-white hover:bg-white/10 hover:border-white/10"
                    }`}
            >
                {icon}
            </div>
        </Link>
    );
}