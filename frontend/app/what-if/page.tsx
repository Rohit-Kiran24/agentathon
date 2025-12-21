"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import { ArrowLeft, Sparkles, TrendingUp, AlertTriangle, PlayCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useAuth } from "../../context/AuthContext"; // Adjust path if needed

// --- Components ---

interface SliderControlProps {
    label: string;
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
}

const SliderControl = ({ label, value, onChange, min = -50, max = 50, step = 1, unit = "%" }: SliderControlProps) => (
    <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
            <span className="text-zinc-400 text-sm font-medium">{label}</span>
            <span className={`text-sm font-bold ${value > 0 ? "text-green-400" : value < 0 ? "text-rose-400" : "text-white"}`}>
                {value > 0 ? "+" : ""}{value}{unit}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
        />
        <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>{min}{unit}</span>
            <span>0{unit}</span>
            <span>{max}{unit}</span>
        </div>
    </div>
);

interface KPICardProps {
    title: string;
    value: number;
    baseline: number;
    prefix?: string;
}

const KPICard = ({ title, value, baseline, prefix = "$" }: KPICardProps) => {
    const change = value - baseline;
    const pct = baseline !== 0 ? ((change / baseline) * 100).toFixed(1) : 0;
    const isPositive = change >= 0;

    return (
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 backdrop-blur-sm">
            <h3 className="text-zinc-400 text-xs uppercase tracking-wider mb-1">{title}</h3>
            <div className="text-2xl font-bold text-white mb-1">
                {prefix}{value.toLocaleString()}
            </div>
            <div className={`text-xs font-medium flex items-center gap-1 ${isPositive ? "text-green-400" : "text-rose-400"}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
                {isPositive ? "+" : ""}{pct}% vs Baseline
            </div>
        </div>
    );
};

// Data Interfaces
interface TrendData {
    period: string;
    baselineRevenue: number;
    baselineProfit: number;
    projectedRevenue?: number;
    projectedProfit?: number;
}

import Sidebar from "@/components/dashboard/Sidebar";

export default function WhatIfPage() {
    const { user } = useAuth();
    const [mounted, setMounted] = useState(false);

    // Scenario State
    const [marketingChange, setMarketingChange] = useState(0);
    const [opexChange, setOpexChange] = useState(0);
    const [priceChange, setPriceChange] = useState(0);

    // Data State
    const [baselineData, setBaselineData] = useState<TrendData[]>([]);

    // AI Prediction State
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    // Baseline Totals
    const [baselineStats, setBaselineStats] = useState({ revenue: 50000, profit: 12000 });

    useEffect(() => {
        setMounted(true);
        if (user) {
            fetchBaseline();
        }
    }, [user]);

    const fetchBaseline = async () => {
        try {
            const token = await user?.getIdToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await fetch("http://localhost:8000/api/analytics/dashboard?days=90", { headers: headers as HeadersInit });
            const data = await res.json();

            if (data.charts?.sales_trend) {
                // Process Trend Data
                const processed = data.charts.sales_trend.map((item: any) => ({
                    period: item.name,
                    baselineRevenue: item.value || 0,
                    baselineProfit: (item.value || 0) * 0.25, // Mock 25% margin if profit missing
                }));
                setBaselineData(processed);

                // Set Stats
                if (data.kpis) {
                    setBaselineStats({
                        revenue: data.kpis.revenue,
                        profit: data.kpis.net_profit || (data.kpis.revenue * 0.25)
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load baseline", err);
            // Fallback mock data
            const mock = Array.from({ length: 6 }, (_, i) => ({
                period: `Month ${i + 1}`, baselineRevenue: 10000 + (i * 500), baselineProfit: 2500 + (i * 100)
            }));
            setBaselineData(mock);
        }
    };

    // --- Dynamic Calculation Logic ---
    const currentProjection = useMemo(() => {
        // Elasticity Assumptions
        // Marketing: +10% Spend -> +8% Sales (Diminishing return)
        // Price: +10% Price -> -5% Volume (Elasticity -0.5)
        // OpEx: Direct 1-to-1 impact on profit subtraction

        const marketingEffect = (marketingChange / 100) * 0.8;
        const priceVolumeEffect = (priceChange / 100) * -0.5;

        const totalVolumeChange = marketingEffect + priceVolumeEffect;

        // Price Multiplier
        const priceMultiplier = 1 + (priceChange / 100);

        return baselineData.map(item => {
            const newVolume = item.baselineRevenue * (1 + totalVolumeChange); // Proxy volume via revenue
            const newRevenue = newVolume * priceMultiplier;

            // Costs
            // Assuming 60% is COGS (variable), 15% is Marketing, 25% is Profit in baseline
            const baseCOGS = item.baselineRevenue * 0.60;
            const variableCOGS = baseCOGS * (1 + totalVolumeChange); // COGS scales with volume

            const baseMarketing = item.baselineRevenue * 0.15;
            const newMarketing = baseMarketing * (1 + (marketingChange / 100));

            const baseOpEx = item.baselineRevenue * 0.10; // Fixed-ish
            const newOpEx = baseOpEx * (1 + (opexChange / 100));

            const newCost = variableCOGS + newMarketing + newOpEx;
            const newProfit = newRevenue - newCost;

            return {
                ...item,
                projectedRevenue: newRevenue,
                projectedProfit: newProfit
            };
        });
    }, [baselineData, marketingChange, priceChange, opexChange]);

    const projectedStats = useMemo(() => {
        const totalRev = currentProjection.reduce((acc, curr) => acc + curr.projectedRevenue, 0);
        const totalProf = currentProjection.reduce((acc, curr) => acc + curr.projectedProfit, 0);
        return { revenue: totalRev, profit: totalProf };
    }, [currentProjection]);


    const handleAnalyze = async () => {
        setLoadingAi(true);
        setAiAnalysis(null);

        try {
            const token = await user?.getIdToken();
            const headers = token ? {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            } : { "Content-Type": "application/json" };

            const res = await fetch("http://localhost:8000/api/predict", {
                method: "POST",
                headers: headers as HeadersInit,
                body: JSON.stringify({
                    marketing_change: marketingChange,
                    opex_change: opexChange,
                    price_change: priceChange
                })
            });

            const data = await res.json();
            setAiAnalysis(data.response);
        } catch (err) {
            setAiAnalysis("Analysis failed. Brief Service Outage.");
        } finally {
            setLoadingAi(false);
        }
    };

    if (!mounted) return null;

    return (
        <main className="flex min-h-screen bg-black text-white selection:bg-white/30">
            <Sidebar />
            <section className="flex-1 pl-24 pr-8 py-8 h-screen overflow-y-auto w-full relative">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -z-10" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -z-10" />

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Header & Controls (Left Col) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                                Scenario Simulator
                            </h1>
                            <p className="text-zinc-500">
                                Adjust variables to forecast profitability.
                            </p>
                        </div>

                        <div className="bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
                            <SliderControl label="Marketing Spend" value={marketingChange} onChange={setMarketingChange} />
                            <SliderControl label="Operational Costs" value={opexChange} onChange={setOpexChange} />
                            <SliderControl label="Unit Pricing" value={priceChange} onChange={setPriceChange} min={-20} max={20} />

                            <button
                                onClick={handleAnalyze}
                                disabled={loadingAi}
                                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loadingAi ? (
                                    <span className="animate-pulse">Consulting AI...</span>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" /> Analyze Scenario
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Visuals (Right Col) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* KPI Summary */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <KPICard title="Proj. Revenue" value={projectedStats.revenue} baseline={baselineStats.revenue} />
                            <KPICard title="Proj. Profit" value={projectedStats.profit} baseline={baselineStats.profit} />
                            <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 backdrop-blur-sm flex flex-col justify-center items-center text-center">
                                <span className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Simulated Margin</span>
                                <span className="text-3xl font-bold text-white">
                                    {projectedStats.revenue > 0 ? ((projectedStats.profit / projectedStats.revenue) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>

                        {/* Main Chart */}
                        <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl flex-1 min-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                                    Profit Projection Curve
                                </h3>
                                <div className="flex gap-4 text-xs">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-600"></div>Baseline</div>
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>Projected</div>
                                </div>
                            </div>

                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={currentProjection}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis
                                            dataKey="period"
                                            stroke="#52525b"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#52525b"
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(val) => `$${val / 1000}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                            formatter={(val: any, name: any) => [`$${Math.round(Number(val)).toLocaleString()}`, name === 'baselineProfit' ? 'Baseline Profit' : 'Projected Profit']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="baselineProfit"
                                            stroke="#52525b"
                                            strokeWidth={2}
                                            dot={false}
                                            strokeDasharray="5 5"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="projectedProfit"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }}
                                            activeDot={{ r: 6, fill: "#fff" }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-center text-xs text-zinc-600 mt-4">
                                *Projections serve as estimates based on elasticity models. Actual results may vary.
                            </p>
                        </div>
                    </div>

                </div>

                {/* AI Analysis Result - Full Width Bottom */}
                {aiAnalysis && (
                    <div className="max-w-7xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-12">
                        <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-8 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-6 text-indigo-300">
                                <div className="p-2 bg-indigo-500/20 rounded-lg">
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
                                </div>
                                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-indigo-100">
                                    AI Strategic Intelligence
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                                {/* Vertical separate line for desktop */}
                                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

                                {/* Impact Section */}
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <Markdown>
                                        {aiAnalysis.split("### 🛠 Recommended Actions")[0]}
                                    </Markdown>
                                </div>

                                {/* Strategy Section */}
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <h3 className="text-xl font-bold mb-4 text-purple-200 mt-0">🛠 Recommended Actions</h3>
                                    <Markdown>
                                        {aiAnalysis.split("### 🛠 Recommended Actions")[1] || "Generating..."}
                                    </Markdown>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}
