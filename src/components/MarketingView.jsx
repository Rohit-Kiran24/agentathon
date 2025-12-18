
import React from 'react';
import { Copy, Instagram, MessageCircle } from 'lucide-react';

export function MarketingView({ insights }) {

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1>Marketing Agent</h1>
                <p>Automated content generation based on inventory status.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {insights.map((item, idx) => (
                    <div key={idx} className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span className="badge badge-info">{item.category}</span>
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{item.title}</h3>
                        <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', color: '#94a3b8' }}>{item.message}</p>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b' }}>
                                <span>Generated Content</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {item.content?.platform.includes('Instagram') ? <Instagram size={14} /> : <MessageCircle size={14} />}
                                    {item.content?.platform}
                                </span>
                            </div>
                            <p style={{ fontFamily: 'sans-serif', fontStyle: 'italic', marginBottom: '1rem', color: '#fff' }}>
                                "{item.content?.text}"
                            </p>
                            <button
                                onClick={() => copyToClipboard(item.content?.text)}
                                className="btn-primary"
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', padding: '0.5rem' }}
                            >
                                <Copy size={16} /> Copy Text
                            </button>
                        </div>
                    </div>
                ))}
                {insights.length === 0 && (
                    <div className="glass-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                        <p>No marketing opportunities detected yet. Sync sales data to generate insights.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
