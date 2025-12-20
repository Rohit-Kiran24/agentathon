"use client";

import React, { useState, useRef } from 'react';
import { Send, Mic, Bot, User, Rocket, CheckCircle, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import ChartRenderer from './ChartRenderer';

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



    // Toast State
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: '' });

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            sender: 'agent',
            text: 'System initialized. Connected to Python Backend. Ready for commands.',
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

        // 1. Suggestions Regex (Specific: ```json suggestions ... ```)
        const suggestionRegex = /```json suggestions\s*([\s\S]*?)\s*```/;
        const suggestionMatch = cleanText.match(suggestionRegex);
        if (suggestionMatch) {
            try {
                const parsed = JSON.parse(suggestionMatch[1]);
                if (Array.isArray(parsed)) {
                    suggestions = parsed;
                    cleanText = cleanText.replace(suggestionRegex, '').trim();
                }
            } catch (e) { console.error("Failed to parse suggestions", e); }
        }

        // 2. Actions Regex (Specific: ```json actions ... ```)
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

        // 3. Chart Regex (Generic: ```json ... ``` or ```json chart ... ```)
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

        return { cleanText, chartData, actions, suggestions };
    };

    const handleSend = async (overrideText?: string) => {
        const textToSend = overrideText || input;
        if (!textToSend.trim()) return;

        const userMsg: Message = { id: Date.now(), sender: 'user', text: textToSend, isThinking: false };
        setMessages(prev => [...prev, userMsg]);

        if (!overrideText) setInput('');
        setLoading(true);

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
            const { cleanText, chartData, actions, suggestions } = parseMessage(data.response);

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

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto relative">



            {/* TOAST */}
            {toast.show && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium">
                        <CheckCircle size={20} />
                        {toast.msg}
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide pb-32">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${msg.sender === 'agent' ? 'bg-zinc-900 text-white' : 'bg-white text-black'}`}>
                            {msg.sender === 'agent' ? <Bot size={20} /> : <User size={20} />}
                        </div>

                        <div className={`flex flex-col max-w-[80%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-6 py-4 rounded-3xl backdrop-blur-md border ${msg.sender === 'agent'
                                ? 'bg-zinc-900/50 border-white/10 text-zinc-300'
                                : 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                }`}>
                                {msg.isThinking ? (
                                    <span className="flex gap-1 items-center animate-pulse text-zinc-500">
                                        Processing Request...
                                    </span>
                                ) : (
                                    <div className="markdown-content text-sm md:text-base">
                                        {/* Chart */}
                                        {msg.chartData && (
                                            <ChartRenderer
                                                type={msg.chartData.type}
                                                title={msg.chartData.title}
                                                data={msg.chartData.data}
                                            />
                                        )}

                                        {/* Text */}
                                        {msg.sender === 'agent' ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2" {...props} />,
                                                    li: ({ node, ...props }) => <li className="pl-1 leading-relaxed" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                                                    strong: ({ node, ...props }) => <span className="font-bold text-white" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-white mt-6 mb-3 first:mt-0" {...props} />,
                                                    hr: ({ node, ...props }) => <hr className="border-white/10 my-6" {...props} />,
                                                    code: ({ node, ...props }) => <code className="bg-black/30 px-1 py-0.5 rounded text-xs font-mono text-zinc-300" {...props} />
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        ) : (
                                            <p className="leading-relaxed">{msg.text}</p>
                                        )}

                                        {/* ACTIONS */}
                                        {msg.actions && msg.actions.length > 0 && (
                                            <div className="mt-6 pt-4 border-t border-white/10">
                                                <button
                                                    onClick={() => handleActionClick(msg.actions!)}
                                                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-emerald-900/20 transition-all hover:scale-105 active:scale-95 w-full justify-center group"
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
                                                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm rounded-full transition-colors border border-white/5 hover:border-white/20 text-left"
                                                    >
                                                        {sug}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Zone */}
            <div className="p-6 absolute bottom-0 w-full bg-gradient-to-t from-black via-black to-transparent">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-zinc-500/20 rounded-full opacity-50 group-hover:opacity-100 transition duration-500 blur"></div>

                    <div className="relative flex items-center bg-black rounded-full border border-white/10 px-4 py-3 shadow-2xl">


                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Ask BizNexus anything..."
                            disabled={loading}
                            className="flex-1 bg-transparent border-none outline-none text-white px-4 placeholder:text-zinc-600 font-light"
                        />

                        <div className="flex gap-2">
                            <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <Mic size={20} />
                            </button>
                            <button
                                onClick={() => handleSend()}
                                disabled={loading}
                                className="p-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-center text-zinc-700 text-xs mt-4">AI can make mistakes. Verify critical financial data.</p>
            </div>
        </div>
    );
}