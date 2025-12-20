"use client";

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ChartProps {
    type: 'bar' | 'line' | 'pie';
    title: string;
    data: any[];
    dataKey?: string; // Key for the value (default: 'value')
    nameKey?: string; // Key for the label (default: 'name')
}

export default function ChartRenderer({ type, title, data, dataKey = 'value', nameKey = 'name' }: ChartProps) {
    if (!data || data.length === 0) return null;

    const renderChart = () => {
        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis dataKey={nameKey} stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: '#ffffff05' }}
                            />
                            <Bar dataKey={dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                            <XAxis dataKey={nameKey} stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey={dataKey} stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey={dataKey}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        </PieChart>
                    </ResponsiveContainer>
                );

            default:
                return <div className="text-red-400 text-sm">Unsupported chart type: {type}</div>;
        }
    };

    return (
        <div className="w-full h-80 my-6 bg-zinc-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
            <h4 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider">{title}</h4>
            <div className="w-full h-[calc(100%-2rem)]">
                {renderChart()}
            </div>
        </div>
    );
}
