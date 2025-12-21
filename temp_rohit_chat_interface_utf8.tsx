"use client";

import React, { useState } from 'react';
import { Send, Mic, Bot, User, Download, CalendarCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ChartRenderer from './ChartRenderer';
import ExportButton from './ExportButton';
import AgentStatusStrip from './AgentStatusStrip';
import { generatePdf } from '../../utils/generatePdf';

interface Message {
    id: number;
    sender: 'user' | 'agent';
    text: string;
    isThinking: boolean;
    chartData?: any;
}

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeAgentName, setActiveAgentName] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            sender: 'agent',
            text: 'System Online. BizNexus Executive Architecture loaded. Ready for business intelligence tasks.',
            isThinking: false,
            chartData: null
        }
    ]);
    // --- LOGIC: Send Msg ---
    const parseMessage = (text: string) => {
        const simpleRegex = /```json\s*(?:chart)?\n([\s\S]*?)\n```/i;
        const match = text.match(simpleRegex);

        if (match) {
            try {
                const jsonStr = match[1].trim();
                if (jsonStr.includes('"data"') && jsonStr.includes('"type"')) {
                    const chartData = JSON.parse(jsonStr);
                    const cleanText = text.replace(match[0], '').trim();
                    return { cleanText, chartData };
                }
            } catch (e) {
                console.error(e);
            }
        }
        return { cleanText: text, chartData: null };
    };

    const handleSend = async (textOrEvent?: string | React.SyntheticEvent) => {
        const textToSend = typeof textOrEvent === 'string' ? textOrEvent : input;

        if (!textToSend.trim()) return;

        const userMsg: Message = { id: Date.now(), sender: 'user', text: textToSend, isThinking: false };
        setMessages(prev => [...prev, userMsg]);

        const query = textToSend;
        setInput('');
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
                body: JSON.stringify({ query: query, history: historyPayload }),
            });

            const data = await res.json();
            const { cleanText, chartData } = parseMessage(data.response);

            // LIGHT UP THE AGENT
            if (data.agent) {
                setActiveAgentName(data.agent);
                // Optional: Reset to null after 5 seconds? Or keep lit until next?
                // Let's keep it lit.
            }

            setMessages(prev => {
                const newHistory = prev.filter(msg => !msg.isThinking);
                return [...newHistory, {
                    id: Date.now() + 2,
                    sender: 'agent',
                    text: cleanText,
                    chartData: chartData,
                    isThinking: false
                }];
            });

        } catch (error) {
            setMessages(prev => prev.filter(msg => !msg.isThinking));
            alert("Connection Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-5xl mx-auto relative px-4">

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
                            <div className={`relative px-8 py-6 rounded-2xl backdrop-blur-xl border shadow-xl ${msg.sender === 'agent'
                                ? 'bg-zinc-900/60 border-white/5 text-zinc-100 hover:border-brand-accent/20' // Agent style
                                : 'bg-brand-accent/10 border-brand-accent/20 text-white rounded-tr-sm' // User style
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
                                            <div className="mb-6 rounded-xl overflow-hidden border border-white/5 shadow-2xl bg-black/40 p-1">
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
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent via-brand-purple to-brand-secondary rounded-[2rem] opacity-20 blur-xl group-hover:opacity-40 transition duration-700 animate-pulse-slow"></div>

                    <div className="relative flex items-center gap-3 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 p-2 pl-6 rounded-[2rem] shadow-2xl ring-1 ring-white/5 focus-within:ring-brand-accent/30 transition-all">

                        {/* Text Input */}
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask BizNexus AI..."
                            disabled={loading}
                            className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder-zinc-500 h-10"
                        />

                        <div className="flex items-center gap-1 pr-1">
                            <button className="p-3 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-white/5">
                                <Mic size={20} />
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="p-3 bg-gradient-to-r from-brand-secondary to-brand-accent text-black rounded-full hover:shadow-[0_0_20px_rgba(0,242,254,0.4)] transition-all disabled:opacity-50 disabled:shadow-none transform active:scale-95"
                            >
                                <Send size={20} fill="currentColor" strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Disclaimer */}
            <div className="absolute bottom-3 left-0 right-0 text-center">
                <p className="text-[10px] text-zinc-600 font-medium tracking-wider uppercase opacity-60">BizNexus AI v2.0 ΓÇó Data Confidential</p>
            </div>
        </div>
    );
}
