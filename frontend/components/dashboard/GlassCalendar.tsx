"use client";

import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    start: string;
    type: string;
}

export default function GlassCalendar() {
    const [events, setEvents] = useState<Event[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    const fetchEvents = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/events');
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (e) {
            console.error("Calendar fetch error", e);
        }
    };

    useEffect(() => {
        fetchEvents();
        // Poll every 5 seconds to catch new events from chat
        const interval = setInterval(fetchEvents, 5000);
        return () => clearInterval(interval);
    }, []);

    // Simple Calendar Logic
    const ways = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDay = (year: number, month: number) => new Date(year, month, 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDay(currentDate.getFullYear(), currentDate.getMonth());

    const days = [];
    // Empty slots
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-8"></div>);
    }
    // Date slots
    for (let d = 1; d <= daysInMonth; d++) {
        // Construct YYYY-MM-DD reliably
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const dateKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        // ROBUST MATCHING: Check against the ISO string's first 10 chars (YYYY-MM-DD)
        // This avoids timezone conversion issues entirely.
        const dayEvents = events.filter(e => {
            if (!e.start) return false;
            return e.start.substring(0, 10) === dateKey;
        });
        const hasEvent = dayEvents.length > 0;

        days.push(
            <div key={d} className={`h-9 w-9 flex flex-col items-center justify-center rounded-lg text-xs cursor-pointer transition-all relative group/day ${hasEvent
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:bg-white/5 hover:text-white'
                }`}
                title={hasEvent ? dayEvents.map(e => e.title).join(', ') : ''}
            >
                <span className={hasEvent ? "font-bold" : ""}>{d}</span>

                {/* Visual Dot Indicator (Absolute Big White Dot) */}
                {hasEvent && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-brand-accent">
                    <CalendarIcon size={16} />
                    <span className="font-mono text-sm tracking-wider uppercase">Smart Schedule <span className="text-[10px] opacity-50">({events.length})</span></span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-1 hover:text-white text-zinc-500"><ChevronLeft size={14} /></button>
                    <span className="text-xs font-bold text-white w-20 text-center">{monthNames[currentDate.getMonth()]}</span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-1 hover:text-white text-zinc-500"><ChevronRight size={14} /></button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {ways.map(w => <div key={w} className="text-[10px] text-zinc-600 font-bold uppercase">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 place-items-center">
                {days}
            </div>

            {/* Upcoming List (Scrollable 'Max Capacity') */}
            <div className="mt-4 pt-4 border-t border-white/5 flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-2 shrink-0">UPCOMING MEETINGS</div>
                <div className="overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent h-[120px]">
                    {events
                        .filter(e => {
                            if (!e.start) return false;
                            // create YYYY-MM-DD string for 'Today'
                            const now = new Date();
                            const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                            const eventKey = e.start.substring(0, 10);

                            // Include if event is on today or any future date
                            return eventKey >= todayKey;
                        })
                        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()) // Sort nearest first
                        .map(e => (
                            <div key={e.id} className="flex items-center gap-3 p-2 rounded bg-black/40 border border-white/5 hover:bg-white/5 transition-colors group/item">
                                <div className="w-8 h-8 rounded-lg bg-brand-purple/20 flex items-center justify-center text-brand-purple shrink-0 group-hover/item:bg-brand-purple group-hover/item:text-black transition-colors">
                                    <Clock size={14} />
                                </div>
                                <div className="overflow-hidden">
                                    <div className="text-xs text-white truncate font-medium">{e.title}</div>
                                    <div className="text-[10px] text-zinc-500 group-hover/item:text-zinc-300">
                                        {new Date(e.start).toLocaleDateString()} ΓÇó {new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    {events.filter(e => new Date(e.start) >= new Date()).length === 0 && (
                        <div className="text-xs text-zinc-600 italic text-center py-4">No upcoming events scheduled.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
