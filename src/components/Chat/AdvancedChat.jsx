
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Settings } from 'lucide-react';
import { GeminiService } from '../../services/GeminiService';
import { ContextBuilder } from '../../agents/RAG/ContextBuilder';

export function AdvancedChat({ allData }) {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am connected to your business data. Ask me anything about your Sales, Inventory, or Cash Flow.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
    const [showSettings, setShowSettings] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        if (apiKey) GeminiService.initialize(apiKey);
    }, [apiKey]);

    const handleSaveKey = (key) => {
        setApiKey(key);
        localStorage.setItem('gemini_api_key', key);
        GeminiService.initialize(key);
        setShowSettings(false);
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // 1. Build RAG Context
        const context = ContextBuilder.build(userMsg.text, allData);

        // 2. Generate Answer
        const response = await GeminiService.generateResponse(userMsg.text, context);

        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'assistant', text: response.text }]);
    };

    return (
        <div className="glass-panel" style={{ height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Chat Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '8px' }}>
                        <Bot size={20} color="white" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1rem' }}>AI Assistant</h3>
                        <p style={{ fontSize: '0.8rem', color: apiKey ? '#10b981' : '#f59e0b', margin: 0 }}>
                            {apiKey ? 'Powered by Gemini Pro' : 'Offline Mode'}
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary" style={{ padding: '0.5rem' }}>
                    <Settings size={18} />
                </button>
            </div>

            {/* Settings Modal (Inline) */}
            {showSettings && (
                <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--glass-border)' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Gemini API Key</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="password"
                            placeholder="Enter your Google AI Key..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            style={{
                                flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--glass-border)',
                                background: 'rgba(255,255,255,0.05)', color: 'white'
                            }}
                        />
                        <button onClick={() => handleSaveKey(apiKey)} className="btn-primary">Save</button>
                    </div>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#94a3b8' }}>
                        Key is stored locally in your browser. We do not save it.
                    </p>
                </div>
            )}

            {/* Messages Area */}
            <div ref={scrollRef} style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {messages.map((msg, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: msg.role === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} color="#a855f7" />}
                        </div>
                        <div style={{
                            background: msg.role === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                            padding: '1rem', borderRadius: '12px',
                            borderTopLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                            borderTopRightRadius: msg.role === 'user' ? '2px' : '12px',
                            maxWidth: '80%',
                            lineHeight: '1.5'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                        <div style={{ padding: '1rem', color: '#94a3b8', fontStyle: 'italic' }}>Thinking...</div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask about your business..."
                        style={{
                            flex: 1, padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)',
                            background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '1rem'
                        }}
                    />
                    <button
                        onClick={handleSend}
                        className="btn-primary"
                        style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
