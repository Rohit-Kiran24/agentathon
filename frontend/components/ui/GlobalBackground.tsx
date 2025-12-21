"use client";

import React from "react";

export default function GlobalBackground() {
    return (
        <div className="fixed inset-0 z-[-1] bg-[#050505] pointer-events-none overflow-hidden">
            {/* 1. Cinematic Noise Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>

            {/* 2. Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* 3. Subtle Ambient Depth (Balanced) */}
            <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] animate-pulse-slow"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px] animate-pulse-slow"></div>
        </div>
    );
}
