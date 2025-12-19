import React from 'react';
import { Home, LineChart, Settings, History, Bell } from 'lucide-react';

export default function Sidebar() {
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
                <NavItem icon={<Home size={24} />} active />
                <NavItem icon={<LineChart size={24} />} />
                <NavItem icon={<History size={24} />} />
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

function NavItem({ icon, active = false }: { icon: React.ReactNode; active?: boolean }) {
    return (
        <button
            className={`p-3 rounded-2xl transition-all duration-300 ${active
                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                : "text-zinc-500 hover:text-white hover:bg-white/10"
                }`}
        >
            {icon}
        </button>
    );
}