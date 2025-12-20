"use client";

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { ArrowUpRight, AlertTriangle, DollarSign, Package, Activity, Trophy, HeartPulse, Truck, Zap, TrendingUp, AlertOctagon } from 'lucide-react';

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('365');

    useEffect(() => {
        fetchDashboardData(timeRange);
    }, [timeRange]);

    const fetchDashboardData = async (days: string) => {
        setLoading(true);
        try {
            // Add timestamp to prevent caching + days filter
            const res = await fetch(`http://localhost:8000/api/analytics/dashboard?days=${days}&t=${new Date().getTime()}`);
            const json = await res.json();
            setData(json);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center text-cyan-500 font-mono animate-pulse">
            INITIALIZING NEURAL LINK...
        </div>
    );

    if (!data || data.error || !data.kpis) {
        return (
            <div className="min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center">
                <AlertOctagon className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                <h2 className="text-xl font-bold font-mono">SYSTEM OFFLINE</h2>
                <p className="text-zinc-500">{data?.error || "Connection lost to mainframe."}</p>
            </div>
        );
    }

    // Health Score Color
    const getHealthColor = (score: number) => {
        if (score >= 80) return "text-emerald-400";
        if (score >= 50) return "text-yellow-400";
        return "text-red-500";
    };

    return (
        <div className="min-h-screen bg-black text-zinc-100 p-6 font-sans selection:bg-cyan-500/30" style={{ scrollbarColor: '#3f3f46 #18181b', scrollbarWidth: 'thin' }}>
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent uppercase tracking-tighter">
                        Nexus<span className="text-cyan-500">Analytics</span>
                    </h1>
                    <p className="text-zinc-500 text-xs tracking-widest mt-1">REAL-TIME INVENTORY INTELLIGENCE</p>
                </div>

                {/* FILTER CONTROLS */}
                <div className="flex items-center gap-4">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                    >
                        <option value="30">Last 30 Days</option>
                        <option value="90">Last 90 Days</option>
                        <option value="180">Last 6 Months</option>
                        <option value="365">This Year</option>
                        <option value="9999">All Time</option>
                    </select>

                    <div className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-mono text-zinc-400">SYSTEM ONLINE</span>
                    </div>
                </div>
            </div>

            {/* BENTO GRID LAYOUT */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* --- LEFT COL (ACTION SIDEBAR) --- */}
                <div className="md:col-span-3 space-y-6 flex flex-col h-full">
                    {/* HEALTH RADAR */}
                    <div className="bg-zinc-900/40 border border-white/10 p-6 rounded-3xl backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 z-10">System Health</h3>
                        <div className="w-40 h-40 relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[{ value: data.kpis.health_score }, { value: 100 - data.kpis.health_score }]}
                                        dataKey="value"
                                        innerRadius={60}
                                        outerRadius={75}
                                        startAngle={90}
                                        endAngle={-270}
                                        stroke="none"
                                        cornerRadius={10}
                                    >
                                        <Cell fill={data.kpis.health_score > 50 ? "#10b981" : "#ef4444"} />
                                        <Cell fill="#27272a" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-4xl font-black ${getHealthColor(data.kpis.health_score)}`}>{data.kpis.health_score}</span>
                                <span className="text-[10px] text-zinc-500 uppercase">Score</span>
                            </div>
                        </div>
                    </div>

                    {/* ALERTS FEED */}
                    <div className="bg-zinc-900/40 border border-red-500/10 p-1 rounded-3xl flex-1 flex flex-col min-h-[400px]">
                        <div className="p-5 border-b border-white/5 bg-red-500/5 rounded-t-3xl">
                            <h3 className="flex items-center gap-2 text-red-400 font-bold">
                                <AlertTriangle size={18} /> CRITICAL ALERTS
                            </h3>
                        </div>
                        <div className="p-2 space-y-2 overflow-y-auto flex-1 max-h-[500px] scrollbar-hide">
                            {data.stockout_forecast?.filter((x: any) => x.days_left < 30).length === 0 && (
                                <div className="text-center p-8 text-zinc-600 text-sm">No critical alerts.</div>
                            )}
                            {data.stockout_forecast?.filter((x: any) => x.days_left <= 7).map((item: any, i: number) => (
                                <div key={i} className="p-3 bg-red-900/20 border border-red-500/20 rounded-xl flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-red-200 truncate pr-2">{item.name}</p>
                                        <p className="text-[10px] text-red-400 uppercase tracking-wider mt-0.5">Critical Risk</p>
                                    </div>
                                    <span className="shrink-0 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded">{item.days_left} DAYS</span>
                                </div>
                            ))}
                            {/* Warning Items (8-30 Days) */}
                            {data.stockout_forecast?.filter((x: any) => x.days_left > 7 && x.days_left < 30).map((item: any, i: number) => (
                                <div key={i} className="p-3 bg-orange-900/10 border border-orange-500/10 rounded-xl flex items-center justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-orange-200 truncate pr-2">{item.name}</p>
                                        <p className="text-[10px] text-orange-400 uppercase tracking-wider mt-0.5">Low Stock</p>
                                    </div>
                                    <span className="shrink-0 px-2 py-1 bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded">{item.days_left} DAYS</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT (9 COLS) --- */}
                <div className="md:col-span-9 space-y-6">

                    {/* HERO ROW: PROFIT & REVENUE */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-48">
                        {/* NET PROFIT (HERO) */}
                        <div className="md:col-span-2 bg-gradient-to-br from-emerald-900/50 to-zinc-900 border border-emerald-500/20 p-8 rounded-3xl relative overflow-hidden group" title="Net Profit = Total Revenue - Cost of Goods Sold. This represents your actual take-home earnings.">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Trophy size={120} />
                            </div>
                            <h3 className="text-emerald-400 font-bold tracking-widest uppercase text-sm mb-2">Net Profit Realized</h3>
                            <div className="flex items-end gap-4">
                                <span className="text-6xl font-black text-white tracking-tighter">₹{(data.kpis.net_profit || 0).toLocaleString()}</span>
                                <div className="mb-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-300 font-bold text-sm flex items-center gap-1">
                                    <ArrowUpRight size={14} /> {data.kpis.net_margin}% Margin
                                </div>
                            </div>
                            <p className="text-zinc-400 text-sm mt-4 max-w-md">
                                Total pure profit generated after deducting cost of goods sold from ₹{data.kpis.revenue.toLocaleString()} revenue.
                            </p>
                        </div>

                        {/* REVENUE MINI */}
                        <div className="bg-zinc-900/40 border border-white/10 p-6 rounded-3xl flex flex-col justify-center relative overflow-hidden group" title="Total Revenue: The sum of all sales transactions before any deductions.">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent"></div>
                            <div className="flex items-center gap-2 mb-2 text-blue-400">
                                <Zap size={18} /> <span className="text-xs font-bold uppercase tracking-wider">Revenue</span>
                            </div>
                            <span className="text-4xl font-bold text-white tracking-tight">₹{data.kpis.revenue.toLocaleString()}</span>
                            <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[70%]"></div>
                            </div>
                        </div>
                    </div>

                    {/* SECOND ROW: KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <BentoStat
                            label="Inventory Value"
                            value={`₹${data.kpis.inventory_valuation.toLocaleString()}`}
                            icon={<Package size={16} />}
                            color="text-purple-400"
                            desc="Total cost value of all items currently in stock."
                        />
                        <BentoStat
                            label="Turnover Rate"
                            value={`${data.kpis.turnover_rate}x`}
                            icon={<Activity size={16} />}
                            color="text-cyan-400"
                            desc="How many times your inventory has been sold and replaced over the period."
                        />
                        <BentoStat
                            label="Avg Order Value"
                            value={`₹${data.kpis.aov.toLocaleString()}`}
                            icon={<DollarSign size={16} />}
                            color="text-pink-400"
                            desc="Average monetary value of each customer transaction."
                        />
                        <BentoStat
                            label="Total Orders"
                            value={data.kpis.orders.toLocaleString()}
                            icon={<Truck size={16} />}
                            color="text-orange-400"
                            desc="Total number of completed sales transactions."
                        />
                    </div>

                    {/* FINANCIAL TRENDS ROW (2 COLS) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* SALES VELOCITY */}
                        <div className="bg-zinc-900/40 border border-white/10 p-6 rounded-3xl flex flex-col h-[350px] overflow-hidden group" title="Sales Velocity: Monthly revenue trend.">
                            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                <TrendingUp size={16} /> Monthly Sales
                            </h3>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.charts.sales_trend}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 10, fill: '#71717a' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val, index) => {
                                                try {
                                                    const strVal = val.toString();
                                                    if (strVal.includes('W')) {
                                                        return `Week ${index + 1}`;
                                                    }
                                                    const dateStr = strVal + '-01';
                                                    if (!isNaN(Date.parse(dateStr))) {
                                                        const date = new Date(dateStr);
                                                        return date.toLocaleString('default', { month: 'short' });
                                                    }
                                                    return strVal;
                                                } catch (e) { return val; }
                                            }}
                                        />
                                        <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* PROFIT TREND */}
                        <div className="bg-zinc-900/40 border border-emerald-500/20 p-6 rounded-3xl flex flex-col h-[350px] overflow-hidden group" title="Profit Velocity: Net profit trend.">
                            <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                <DollarSign size={16} /> Profit Trend
                            </h3>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.charts.profit_trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 10, fill: '#71717a' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val, index) => {
                                                try {
                                                    const strVal = val.toString();
                                                    if (strVal.includes('W')) {
                                                        return `Week ${index + 1}`;
                                                    }
                                                    const dateStr = strVal + '-01';
                                                    if (!isNaN(Date.parse(dateStr))) {
                                                        const date = new Date(dateStr);
                                                        return date.toLocaleString('default', { month: 'short' });
                                                    }
                                                    return strVal;
                                                } catch (e) { return val; }
                                            }}
                                        />
                                        <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                                        <Tooltip cursor={{ fill: '#10b981', opacity: 0.1 }} contentStyle={{ backgroundColor: '#09090b', border: '1px solid #059669', borderRadius: '8px' }} itemStyle={{ color: '#e4e4e7' }} />
                                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* INVENTORY DETAILS ROW (2 COLS x 2 ROWS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                        {/* Category Distribution */}
                        <div className="bg-zinc-900/40 border border-white/10 p-6 rounded-3xl flex flex-col h-[350px] overflow-hidden group" title="Inventory Allocation: Value distribution across different product categories.">
                            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Package size={16} /> Category Allocation
                            </h3>
                            <div className="flex-1 w-full min-h-0 text-xs">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.charts.category_distribution}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="40%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={2}
                                        >
                                            {data.charts.category_distribution?.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#6366f1'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '8px' }}
                                            itemStyle={{ color: '#e4e4e7' }}
                                            formatter={(value: any) => [`₹${value.toLocaleString()} (${((value / data.kpis.inventory_valuation) * 100).toFixed(1)}%)`, 'Value']}
                                        />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ right: 0 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-zinc-900/40 border border-white/10 p-6 rounded-3xl flex flex-col h-[350px] overflow-hidden" title="Top Performers: Your highest revenue-generating products.">
                            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Trophy size={16} /> Top Performers
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
                                {data.charts.top_products.map((prod: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between group" title={`Rank #${i + 1}: ${prod.name} generated ₹${prod.value.toLocaleString()} in revenue.`}>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className="text-xs font-mono text-zinc-500">0{i + 1}</span>
                                            <span className="text-sm font-medium text-zinc-300 truncate w-32 group-hover:text-white transition-colors">{prod.name}</span>
                                        </div>
                                        <span className="text-sm font-bold text-emerald-400">₹{prod.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Restock Feed */}
                        <div className="bg-zinc-900/40 border border-blue-500/20 p-6 rounded-3xl flex flex-col h-[350px] overflow-hidden" title="Smart Restock Feed: Intelligent recommendations based on sales velocity and lead time.">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                    <Truck size={16} /> Smart Restock
                                </h3>
                                <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                                    {data.smart_restock?.length || 0}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {data.smart_restock?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 hover:bg-blue-500/10 transition-colors" title={`Recommended Order: ${item.order_qty} units. Reason: ${item.reason}`}>
                                        <div>
                                            <p className="text-sm font-bold text-blue-100 truncate w-32">{item.name}</p>
                                            <p className="text-[10px] text-blue-400/60">{item.reason}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-blue-400">{item.order_qty}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Dead Stock */}
                        <div className="bg-zinc-900/40 border border-zinc-700/50 p-6 rounded-3xl flex flex-col h-[350px] overflow-hidden" title="Dead Stock: Items with 0 sales that are tying up capital.">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                    <AlertOctagon size={16} /> Dead Stock
                                </h3>
                                <span className="text-xs font-mono text-zinc-500">₹{(data.kpis.dead_stock_value / 1000).toFixed(1)}k</span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {data.dead_stock?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors" title={`${item.stock} units unsold. Capital frozen: ₹${item.value.toLocaleString()}`}>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-300 truncate w-32">{item.name}</p>
                                            <p className="text-[10px] text-zinc-500">{item.stock} units</p>
                                        </div>
                                        <span className="text-sm font-mono text-zinc-400">₹{item.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function BentoStat({ label, value, icon, color, desc }: any) {
    return (
        <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between hover:bg-white/5 transition-colors group relative">
            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-zinc-800 text-xs text-zinc-300 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-white/10 text-center">
                {desc}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800 rotate-45 border-t border-l border-white/10"></div>
            </div>

            <div className={`mb-2 ${color} opacity-70 group-hover:opacity-100 transition-opacity`}>{icon}</div>
            <div>
                <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{label}</p>
            </div>
        </div>
    );
}