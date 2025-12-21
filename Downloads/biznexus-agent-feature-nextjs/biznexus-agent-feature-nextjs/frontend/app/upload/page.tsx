import Sidebar from "@/components/dashboard/Sidebar";
import FileUploader from "@/components/dashboard/FileUploader";

export default function UploadPage() {
    return (
        <main className="flex min-h-screen bg-black text-white selection:bg-white/30">
            {/* 1. The Sidebar */}
            <Sidebar />

            {/* 2. Main Content Area (Center) */}
            <section className="flex-1 pl-24 pr-8 py-8 flex flex-col h-screen overflow-hidden">
                {/* Header */}
                <header className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Data Center</h1>
                        <p className="text-zinc-500 mt-1">Manage Session Data</p>
                    </div>
                </header>

                {/* The Upload Interface */}
                <div className="flex-1 overflow-y-auto flex items-center justify-center pb-32">
                    <FileUploader />
                </div>
            </section>
        </main>
    );
}
