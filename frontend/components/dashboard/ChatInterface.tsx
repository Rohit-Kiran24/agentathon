"use client";

import React, { useState } from 'react';
import { Send, Mic, Paperclip, Bot, User } from 'lucide-react';

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. State to store the real conversation
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'agent',
            text: 'System initialized. Connected to Python Backend. Ready for commands.',
            isThinking: false
        }
    ]);

    // 2. The function to send data to Python
    const handleSend = async () => {
        if (!input.trim()) return;

        // Add User Message to UI immediately
        const userMsg = { id: Date.now(), sender: 'user', text: input, isThinking: false };
        setMessages(prev => [...prev, userMsg]);

        const query = input; // Store query to send
        setInput('');        // Clear input box
        setLoading(true);

        try {
            // Add a temporary "Thinking..." bubble
            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'agent', text: '', isThinking: true }]);

            // 3. Call the API
            const res = await fetch('http://localhost:8000/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query }),
            });

            const data = await res.json();

            // 4. Replace "Thinking" with real response
            setMessages(prev => {
                // Remove the thinking bubble
                const newHistory = prev.filter(msg => !msg.isThinking);
                // Add the real response
                return [...newHistory, {
                    id: Date.now() + 2,
                    sender: 'agent',
                    text: data.response, // This comes from Python
                    isThinking: false
                }];
            });

        } catch (error) {
            console.error("API Error:", error);
            // Remove thinking bubble if it fails
            setMessages(prev => prev.filter(msg => !msg.isThinking));
            alert("Failed to connect to Backend. Is Python running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full max-w-4xl mx-auto relative">

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide pb-32">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        {/* Avatar Circle */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10 ${msg.sender === 'agent' ? 'bg-zinc-900 text-white' : 'bg-white text-black'
                            }`}>
                            {msg.sender === 'agent' ? <Bot size={20} /> : <User size={20} />}
                        </div>

                        {/* Message Bubble */}
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
                                    <p className="leading-relaxed">{msg.text}</p>
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
                        <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                            <Paperclip size={20} />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()} // Press Enter to send
                            placeholder="Ask BizNexus anything..."
                            disabled={loading}
                            className="flex-1 bg-transparent border-none outline-none text-white px-4 placeholder:text-zinc-600 font-light"
                        />

                        <div className="flex gap-2">
                            <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <Mic size={20} />
                            </button>
                            <button
                                onClick={handleSend}
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