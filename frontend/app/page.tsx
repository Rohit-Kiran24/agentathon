import Sidebar from "@/components/dashboard/Sidebar";
import ChatInterface from "@/components/dashboard/ChatInterface";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-black text-white selection:bg-white/30">
      {/* 1. The Sidebar */}
      <Sidebar />

      {/* 2. Main Content Area (Center) */}
      <section className="flex-1 pl-24 pr-8 py-8 flex flex-col h-screen overflow-hidden">
        {/* Header - Only One Instance Now */}
        <header className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
            <p className="text-zinc-500 mt-1">System Status: Optimal</p>
          </div>

          <div className="flex gap-4">
            <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-zinc-300">
              Agent Status: <span className="text-white font-semibold">Idle</span>
            </div>
          </div>
        </header>

        {/* The Chat Interface - Takes remaining height */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </section>

      {/* 3. Right Panel (Analytics) */}
      <aside className="w-[400px] border-l border-white/10 bg-zinc-950/50 p-6 hidden xl:block">
        <h2 className="text-lg font-semibold mb-6">Live Analytics</h2>
        {/* Placeholder Graphs */}
        <div className="w-full h-40 bg-zinc-900 rounded-2xl mb-4 border border-white/5 flex items-center justify-center text-zinc-700">
          Graph A Placeholder
        </div>
        <div className="w-full h-40 bg-zinc-900 rounded-2xl border border-white/5 flex items-center justify-center text-zinc-700">
          Graph B Placeholder
        </div>
      </aside>
    </main>
  );
}