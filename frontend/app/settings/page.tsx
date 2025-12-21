"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Loader2, Upload, FileText, CheckCircle, Save, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
    const { user, profile, refreshProfile } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form States
    const [displayName, setDisplayName] = useState("");
    const [companyName, setCompanyName] = useState("");

    // File States
    const [inventoryFile, setInventoryFile] = useState<File | null>(null);
    const [salesFile, setSalesFile] = useState<File | null>(null);
    const [useDemoData, setUseDemoData] = useState(false);

    // Initial Load
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || "");
            setCompanyName(profile.companyName || "");
        } else if (user) {
            setDisplayName(user.displayName || "");
        }
    }, [profile, user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            // Helper to read file as text
            const readFileAsText = (file: File): Promise<string> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            };

            let inventoryUrl = profile?.inventoryUrl || "";
            let salesUrl = profile?.salesUrl || "";

            // 1. Save Files to Firestore (as text) if present
            if (inventoryFile) {
                const content = await readFileAsText(inventoryFile);
                await setDoc(doc(db, "users", user.uid, "datasets", "inventory"), {
                    csv_content: content,
                    updatedAt: new Date().toISOString()
                });
                inventoryUrl = "firestore_doc"; // Flag for UI
            }

            if (salesFile) {
                const content = await readFileAsText(salesFile);
                await setDoc(doc(db, "users", user.uid, "datasets", "sales"), {
                    csv_content: content,
                    updatedAt: new Date().toISOString()
                });
                salesUrl = "firestore_doc"; // Flag for UI
            }

            // 2. Demo Data Fallback (Clear Flags)
            if (useDemoData) {
                // Determine if we should clear the actual datasets? 
                // For now, just clearing the profile flags to ensure UI knows we are using demo/default.
                inventoryUrl = "";
                salesUrl = "";
                // Ideally we might want to delete the docs too, but minimal change first.
            }

            // 3. Update Firestore Profile
            const userRef = doc(db, "users", user.uid);
            const userData = {
                displayName,
                companyName,
                inventoryUrl,
                salesUrl,
                hasOnboarded: true,
                updatedAt: new Date().toISOString()
            };

            await setDoc(userRef, userData, { merge: true });

            // 4. Update Context
            await refreshProfile();

            // 5. Redirect
            router.push("/hub");

        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Failed to save profile. See console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6">
            <div className="max-w-3xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Setup Your Organization</h1>
                    <p className="text-zinc-400">
                        {profile?.hasOnboarded
                            ? "Update your profile and datasets."
                            : "Welcome! Let's get your workspace ready."}
                    </p>
                </header>

                <form onSubmit={handleSave} className="space-y-8">
                    {/* Section 1: Profile */}
                    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold">1</span>
                            Profile Details
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Your Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Jane Doe"
                                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Acme Corp"
                                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Data Source */}
                    <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold">2</span>
                            Data Source
                        </h2>

                        {!inventoryFile && !salesFile && !profile?.inventoryUrl && (
                            <div className="mb-6 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-indigo-400" />
                                    <span className="text-sm font-medium text-indigo-300">New here? Use our demo data to get started immediately.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setUseDemoData(!useDemoData)}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${useDemoData ? 'bg-indigo-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                    {useDemoData ? "Using Demo Data" : "Use Demo Data"}
                                </button>
                            </div>
                        )}

                        <div className={`grid md:grid-cols-2 gap-6 ${useDemoData ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            {/* Inventory Upload */}
                            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-white/20 transition-colors relative">
                                <FileText className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                                <h3 className="font-medium mb-1">Inventory Data</h3>
                                <p className="text-xs text-zinc-500 mb-4">CSV file with: item_id, stock_level, etc.</p>

                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setInventoryFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />

                                {inventoryFile ? (
                                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-bold">
                                        <CheckCircle className="w-4 h-4" /> {inventoryFile.name}
                                    </div>
                                ) : profile?.inventoryUrl ? (
                                    <div className="text-indigo-400 text-sm">✓ Protocol Linked</div>
                                ) : (
                                    <span className="text-xs bg-white/10 px-3 py-1 rounded-full">Select CSV</span>
                                )}
                            </div>

                            {/* Sales Upload */}
                            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-white/20 transition-colors relative">
                                <FileText className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                                <h3 className="font-medium mb-1">Sales Data</h3>
                                <p className="text-xs text-zinc-500 mb-4">CSV file with: date, item_id, quantity...</p>

                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />

                                {salesFile ? (
                                    <div className="flex items-center justify-center gap-2 text-green-400 text-sm font-bold">
                                        <CheckCircle className="w-4 h-4" /> {salesFile.name}
                                    </div>
                                ) : profile?.salesUrl ? (
                                    <div className="text-indigo-400 text-sm">✓ Protocol Linked</div>
                                ) : (
                                    <span className="text-xs bg-white/10 px-3 py-1 rounded-full">Select CSV</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-4">
                        {profile?.hasOnboarded && (
                            <Link
                                href="/hub"
                                className="px-6 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-medium"
                            >
                                Cancel
                            </Link>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all hover:scale-105 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save & Continue
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
