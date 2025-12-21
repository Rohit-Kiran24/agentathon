"use client";

import React, { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function FileUploader() {
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setLoading(true);
        setError(null);
        setResponse(null);

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append("files", file);
        });

        try {
            const res = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setResponse(data.response);
            } else {
                setError(data.response || "Upload failed");
            }

        } catch (error) {
            console.error("Upload failed", error);
            setError("Failed to connect to server.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6">
            <div
                className="border-2 border-dashed border-zinc-700 rounded-3xl p-12 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <UploadCloud size={32} className="text-emerald-500" />
                </div>

                <h3 className="text-xl font-semibold text-white mb-2">Upload Business Data</h3>
                <p className="text-zinc-500 text-center max-w-sm mb-6">
                    Drag and drop your CSV, Excel, or JSON files here to replace the current session context.
                </p>

                <button className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-zinc-200 transition-colors">
                    {loading ? "Uploading..." : "Select Files"}
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                    accept=".csv,.xlsx,.xls,.json"
                />
            </div>

            {/* RESPONSE AREA */}
            {response && (
                <div className="mt-8 bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 mb-4 text-emerald-400">
                        <CheckCircle size={20} />
                        <span className="font-semibold">Upload Complete</span>
                    </div>
                    <div className="prose prose-invert prose-sm">
                        <ReactMarkdown>{response}</ReactMarkdown>
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-8 bg-red-950/30 border border-red-500/30 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle size={20} />
                        <span className="font-semibold">{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
