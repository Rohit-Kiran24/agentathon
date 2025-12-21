"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot, User, Rocket, CheckCircle, Sparkles, Download, CalendarCheck, ArrowUp, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ChartRenderer from './ChartRenderer';
import ExportButton from './ExportButton';
import AgentStatusStrip from './AgentStatusStrip';
import { generatePdf } from '../../utils/generatePdf';

interface Action {
    label: string;
    type: string;
}

interface Message {
    id: number;
    sender: 'user' | 'agent';
    text: string;
    isThinking: boolean;
    chartData?: any;
    actions?: Action[];
    suggestions?: string[];
}

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeAgentName, setActiveAgentName] = useState<string | null>(null);

    // Toast State
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' });

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            sender: 'agent',
            text: "Hello! I'm your BizNexus Business Consultant. I'm here to help you analyze your data, provide strategic insights, and answer your questions.\n\nHow can I assist you today? You can ask me to forecast trends for next month, analyze specific products, or give a general overview.",
            isThinking: false,
            chartData: null
        }
    ]);

    // Helper: Parse message for charts, actions, AND suggestions
    const parseMessage = (text: string) => {
        let cleanText = text;
        let chartData = null;
        let actions = null;
        let suggestions = null;

        // 1. Schedule Regex (Specific: ```json schedule ... ```)
        // CHECK THIS FIRST to prevent generic chart regex from consuming it
        const scheduleRegex = /```json schedule\s*([\s\S]*?)\s*```/;
        const scheduleMatch = cleanText.match(scheduleRegex);
        if (scheduleMatch) {
            try {
                // We don't need to do anything with the data here as the backend handles the actual booking
                // But we act as if we "consumed" it to hide it from the UI
                cleanText = cleanText.replace(scheduleRegex, '').trim();
            } catch (e) { console.error("Failed to parse schedule", e); }
        }

        // 2. Suggestions Regex (Specific: ```json suggestions ... ```)
        const suggestionRegex = /```json suggestions\s*([\s\S]*?)\s*```/;
        const suggestionMatch = cleanText.match(suggestionRegex);
        if (suggestionMatch) {
            try {
                const parsed = JSON.parse(suggestionMatch[1]);
                if (Array.isArray(parsed)) {
                    suggestions = parsed;
                    cleanText = cleanText.replace(suggestionRegex, '').trim();
                } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                    suggestions = parsed.suggestions;
                    cleanText = cleanText.replace(suggestionRegex, '').trim();
                }
            } catch (e) { console.error("Failed to parse suggestions", e); }
        }

        // 3. Actions Regex (Specific: ```json actions ... ```)
        const actionRegex = /```json actions\s*([\s\S]*?)\s*```/;
        const actionMatch = cleanText.match(actionRegex);
        if (actionMatch) {
            try {
                const parsed = JSON.parse(actionMatch[1]);
                if (Array.isArray(parsed)) {
                    actions = parsed;
                    cleanText = cleanText.replace(actionRegex, '').trim();
                }
            } catch (e) { console.error("Failed to parse actions", e); }
        }

        // 4. Chart Regex (Generic: ```json ... ``` or ```json chart ... ```)
        // CHECK LAST as catch-all
        const chartRegex = /```json(?: chart)?\s*([\s\S]*?)\s*```/;
        const chartMatch = cleanText.match(chartRegex);
        if (chartMatch) {
            try {
                const parsed = JSON.parse(chartMatch[1]);
                if (parsed.type && parsed.data) {
                    chartData = parsed;
                    cleanText = cleanText.replace(chartRegex, '').trim();
                }
            } catch (e) { console.error("Failed to parse chart", e); }
        }

        return { cleanText, chartData, actions, suggestions, hasSchedule: !!scheduleMatch };

        return { cleanText, chartData, actions, suggestions, hasSchedule: !!scheduleMatch };
    };

    const handleSend = async (overrideText?: string) => {
        const textToSend = overrideText || input;
        if (!textToSend.trim()) return;

        const userMsg: Message = { id: Date.now(), sender: 'user', text: textToSend, isThinking: false };
        setMessages(prev => [...prev, userMsg]);

        if (!overrideText) setInput('');
        setLoading(true);
        setActiveAgentName('Coordinator Agent'); // Default "Thinking" state

        try {
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'agent', text: '', isThinking: true }]);

            const historyPayload = messages
                .filter(m => !m.isThinking && m.text)
                .map(m => ({ sender: m.sender, text: m.text }));

            const res = await fetch('http://localhost:8000/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: textToSend,
                    history: historyPayload
                }),
            });

            const data = await res.json();
            const { cleanText, chartData, actions, suggestions, hasSchedule } = parseMessage(data.response);

            // LIGHT UP THE AGENT
            if (data.agent) {
                setActiveAgentName(data.agent);
            }

            if (hasSchedule) {
                setToast({ show: true, msg: "Meeting Scheduled & Added to Calendar" });
                setTimeout(() => setToast({ show: false, msg: '' }), 4000);
            }

            setMessages(prev => {
                const newHistory = prev.filter(msg => !msg.isThinking);
                return [...newHistory, {
                    id: Date.now() + 2,
                    sender: 'agent',
                    text: cleanText,
                    chartData: chartData,
                    actions: actions,
                    suggestions: suggestions,
                    isThinking: false
                }];
            });

        } catch (error) {
            console.error(error);
            setMessages(prev => prev.filter(msg => !msg.isThinking));
            alert("Failed to connect");
        } finally {
            setLoading(false);
        }
    };

    const handleActionClick = (actions: Action[]) => {
        const actionNames = actions.map(a => a.label).join(", ");
        setToast({ show: true, msg: `Executing: ${actionNames}...` });
        setTimeout(() => setToast({ show: false, msg: '' }), 3000);
    };

    const [placeholder, setPlaceholder] = useState("");
    const placeholders = [
        "Ask about monthly sales trends...",
        "Predict inventory needed for next week...",
        "Schedule a meeting with the marketing team...",
        "Analyze customer feedback sentiment...",
        "What is the dead stock status?"
    ];

    useEffect(() => {
        let currentIdx = 0;
        let charIdx = 0;
        let isDeleting = false;
        let timeout: NodeJS.Timeout;

        const type = () => {
            const currentText = placeholders[currentIdx];

            if (isDeleting) {
                setPlaceholder(currentText.substring(0, charIdx - 1));
                charIdx--;
            } else {
                setPlaceholder(currentText.substring(0, charIdx + 1));
                charIdx++;
            }

            // Typing Speed
            let typeSpeed = 50;
            if (isDeleting) typeSpeed = 30;

            // Pause at end
            if (!isDeleting && charIdx === currentText.length) {
                typeSpeed = 2000;
                isDeleting = true;
            } else if (isDeleting && charIdx === 0) {
                isDeleting = false;
                currentIdx = (currentIdx + 1) % placeholders.length;
                typeSpeed = 500;
            }

            timeout = setTimeout(type, typeSpeed);
        };

        timeout = setTimeout(type, 1000);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative px-4">

            {/* TOAST */}
            {toast.show && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium">
                        <CheckCircle size={20} />
                        {toast.msg}
                    </div>
                </div>
            )}

            {/* AGENT STATUS VISUALIZATION */}
            <div className="pt-2">
                <AgentStatusStrip activeAgent={activeAgentName} />
            </div>

            {/* Header Tool */}
            <div className="absolute top-0 right-4 z-10 p-2">
                <ExportButton targetId="report-content" />
            </div>

            {/* MAIN MESSAGES AREA */}
            <div id="report-content" className="flex-1 overflow-y-auto space-y-8 scrollbar-hide pb-40 pt-10">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`group flex items-start gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
                    >
                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 backdrop-blur-md shadow-lg border border-white/10 ${msg.sender === 'agent'
                            ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white'
                            : 'bg-zinc-800 text-zinc-400'
                            }`}>
                            {msg.sender === 'agent' ? <Bot size={22} className="drop-shadow-md" /> : <User size={22} />}
                        </div>

                        {/* Content Card */}
                        <div className={`flex flex-col max-w-[85%] relative transition-all duration-300`}>

                            {/* The Bubble */}
                            <div className={`relative px-8 py-6 rounded-2xl backdrop-blur-xl border shadow-xl transition-all duration-300 ${msg.sender === 'agent'
                                ? 'bg-zinc-900/60 border-white/5 text-zinc-100 hover:border-brand-accent/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:bg-zinc-900/80' // Agent style
                                : 'bg-brand-accent/10 border-brand-accent/20 text-white rounded-tr-sm hover:bg-brand-accent/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]' // User style
                                }`}>

                                {msg.isThinking ? (
                                    <div className="flex items-center gap-3 text-brand-accent/80 font-mono text-sm">
                                        <div className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
                                        Analyzing Data Streams...
                                    </div>
                                ) : (
                                    <div className="markdown-content text-[15px] leading-7 font-light tracking-wide">
                                        {/* Chart First (if any) */}
                                        {msg.chartData && msg.chartData.type !== 'suggestion' && (
                                            <div className="mb-6 rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-black/40 p-1 transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:scale-[1.02]">
                                                <ChartRenderer
                                                    type={msg.chartData.type}
                                                    title={msg.chartData.title}
                                                    data={msg.chartData.data}
                                                />
                                            </div>
                                        )}

                                        {/* Calendar Suggestion Interactive Card */}
                                        {msg.chartData && msg.chartData.type === 'suggestion' && (
                                            <div className="mb-6 p-4 rounded-xl bg-brand-accent/5 border border-brand-accent/20 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent">
                                                        <CalendarCheck size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white">{msg.chartData.data.title}</div>
                                                        <div className="text-xs text-brand-accent/80 font-mono">{msg.chartData.data.start.replace('T', ' ')}</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        handleSend(`Schedule ${msg.chartData.data.title} for ${msg.chartData.data.start}`);
                                                    }}
                                                    className="px-3 py-1.5 bg-brand-accent text-black text-xs font-bold rounded-lg hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] transition-all"
                                                >
                                                    Add to Calendar
                                                </button>
                                            </div>
                                        )}

                                        {/* Text Content */}
                                        {msg.sender === 'agent' ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-zinc-300" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-zinc-300" {...props} />,
                                                    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                                    strong: ({ node, ...props }) => <strong className="font-bold text-brand-accent" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-xl font-medium text-white mt-8 mb-4 border-l-4 border-brand-purple pl-3" {...props} />,
                                                    hr: ({ node, ...props }) => <hr className="border-white/10 my-8" {...props} />,
                                                    code: ({ node, ...props }) => <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono text-brand-secondary border border-white/5" {...props} />,
                                                    table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="min-w-full text-left text-sm" {...props} /></div>,
                                                    th: ({ node, ...props }) => <th className="bg-white/5 p-3 font-medium text-zinc-200 border-b border-white/10" {...props} />,
                                                    td: ({ node, ...props }) => <td className="p-3 text-zinc-400 border-b border-white/5" {...props} />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        ) : (
                                            <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                                        )}

                                        {/* ACTIONS */}
                                        {msg.actions && msg.actions.length > 0 && (
                                            <div className="mt-6 pt-4 border-t border-white/10">
                                                <button
                                                    onClick={() => handleActionClick(msg.actions!)}
                                                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-white px-5 py-2.5 rounded-xl font-medium shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all hover:scale-105 active:scale-95 w-full justify-center group border border-emerald-500/20"
                                                >
                                                    <Rocket size={18} className="group-hover:animate-bounce" />
                                                    Do It! (Execute {msg.actions.length} Actions)
                                                </button>
                                                <p className="text-center text-xs text-zinc-500 mt-2">
                                                    Automatically executes: {msg.actions.map(a => a.label).join(", ")}
                                                </p>
                                            </div>
                                        )}

                                        {/* SUGGESTIONS */}
                                        {msg.suggestions && msg.suggestions.length > 0 && (
                                            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                                                <div className="w-full flex items-center gap-2 text-xs font-medium text-zinc-500 mb-1">
                                                    <Sparkles size={14} className="text-purple-400" />
                                                    SUGGESTED NEXT STEPS
                                                </div>
                                                {msg.suggestions.map((sug, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleSend(sug)}
                                                        className="px-4 py-2 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm rounded-full transition-all border border-white/5 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] text-left hover:-translate-y-0.5"
                                                    >
                                                        {sug}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Agent Actions */}
                            {msg.sender === 'agent' && !msg.isThinking && (
                                <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button
                                        onClick={() => generatePdf(`msg-content-${msg.id}`)}
                                        className="text-xs font-medium text-zinc-500 hover:text-brand-accent flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 transition-all"
                                    >
                                        <Download size={12} />
                                        Export Report
                                    </button>
                                </div>
                            )}

                            {/* Hidden ID hook for PDF */}
                            <div id={`msg-content-${msg.id}`} className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0" aria-hidden="true"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* FLOATING INPUT CAPSULE */}
            <div className="absolute bottom-10 left-0 right-0 px-4 flex justify-center items-end gap-4 z-20">

                {/* MAIN INPUT CAPSULE */}
                <div className="w-full max-w-4xl relative group flex-1">
                    {/* Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-purple-600/30 to-indigo-600/30 rounded-[2rem] opacity-20 blur-xl group-hover:opacity-50 transition duration-700"></div>

                    <div className="relative flex items-center gap-3 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-2 pl-6 rounded-[2rem] shadow-2xl ring-1 ring-white/5 focus-within:ring-cyan-500/50 transition-all duration-300 hover:border-white/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] hover:scale-[1.01]">

                        {/* Text Input */}
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={placeholder}
                            disabled={loading}
                            className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder-zinc-500 h-10 group-hover:placeholder-zinc-400 transition-all duration-300"
                        />

                        <div className="flex items-center gap-2 pr-2">
                            <button className="p-3 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-white/10 hover:scale-110 active:scale-95">
                                <Mic size={20} />
                            </button>
                            <button
                                onClick={() => handleSend()}
                                disabled={loading || !input.trim()}
                                className="p-3 bg-cyan-500 text-black rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:shadow-none transform active:scale-95 hover:scale-110"
                            >
                                <ArrowRight size={24} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-center text-zinc-700 text-xs absolute -bottom-6 w-full">AI can make mistakes. Verify critical financial data.</p>
            </div>

            {/* Disclaimer */}
            <div className="absolute bottom-3 left-0 right-0 text-center">
                {/* Already included above roughly */}
            </div>
        </div>
    );
}