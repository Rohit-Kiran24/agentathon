
import React from 'react';
import { LayoutDashboard, Package, DollarSign, Megaphone, UploadCloud, MessageSquare, Activity } from 'lucide-react';

export function Sidebar({ activeTab, onTabChange }) {
    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory Agent', icon: Package },
        { id: 'finance', label: 'Finance Agent', icon: DollarSign },
        { id: 'marketing', label: 'Marketing Agent', icon: Megaphone },
        { id: 'integrations', label: 'Integrations', icon: Activity },
        { id: 'chat', label: 'AI Chat', icon: MessageSquare },
        { id: 'upload', label: 'Data Sources', icon: UploadCloud },
    ];

    return (
        <div className="glass-panel sidebar" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3b82f6, #10b981)', borderRadius: '8px' }}></div>
                <h2 style={{ fontSize: '1.25rem' }}>Co-Pilot</h2>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                color: isActive ? '#fff' : '#94a3b8',
                                textAlign: 'left',
                                width: '100%',
                                fontSize: '0.95rem'
                            }}
                        >
                            <Icon size={20} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Unified Business Co-Pilot<br />
                    v1.0.0
                </p>
            </div>
        </div>
    );
}
