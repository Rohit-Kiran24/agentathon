
import React from 'react';
import { MessageCircle, ShoppingBag, CreditCard, Activity, CheckCircle } from 'lucide-react';

export function IntegrationHub({ connections, onToggle }) {

    const services = [
        { id: 'whatsapp', label: 'WhatsApp Business', icon: MessageCircle, color: '#25D366', description: 'Listen for new orders and customer queries.' },
        { id: 'shopify', label: 'Shopify Store', icon: ShoppingBag, color: '#96bf48', description: 'Sync inventory and sales data in real-time.' },
        { id: 'bank', label: 'Bank Feeds', icon: CreditCard, color: '#6366f1', description: 'Monitor daily transaction inflows/outflows.' },
    ];

    return (
        <div className="flex flex-col gap-6">
            <header>
                <h1>Integration Hub</h1>
                <p>Connect your business platforms for real-time telemetry.</p>
            </header>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {services.map(service => (
                    <div key={service.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '12px',
                                background: `${service.color}20`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: service.color
                            }}>
                                <service.icon size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{service.label}</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>{service.description}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => onToggle(service.id)}
                            className={connections[service.id] ? "btn-primary" : "btn-secondary"}
                            style={{
                                background: connections[service.id] ? service.color : 'transparent',
                                borderColor: connections[service.id] ? service.color : 'var(--glass-border)',
                                minWidth: '120px'
                            }}
                        >
                            {connections[service.id] ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Activity size={16} className="animate-pulse" /> Live
                                </span>
                            ) : 'Connect'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="glass-panel" style={{ padding: '2rem', marginTop: '2rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} color="#3b82f6" />
                    Live Event Log
                </h3>
                <div style={{ marginTop: '1rem', height: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ opacity: 0.5, fontSize: '0.9rem', textAlign: 'center' }}>
                        Waiting for events from connected sources...
                    </div>
                    {/* Events would be rendered here in a full implementation */}
                </div>
            </div>
        </div>
    );
}
